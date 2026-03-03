"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import type { ForceGraphMethods } from "react-force-graph-3d";
import { withBasePath } from "@/lib/base-path";
import {
  createNodeObject,
  disposeObject3D,
} from "@/components/productivity/productivity-graph-3d-rendering";
import {
  getGraphThemeFromDocument,
  getGraphThemePalette,
  type GraphTheme,
} from "@/components/productivity/productivity-graph-3d-theme";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

export type ProductivityGraphCategory = {
  id: string;
  label: string;
  description: string;
};

export type ProductivityGraphPost = {
  slug: string;
  title: string;
  summary: string;
  size: number;
  categories: string[];
  image?: string;
};

type ProductivityGraphProps = {
  categories: ProductivityGraphCategory[];
  posts: ProductivityGraphPost[];
  allPosts: ProductivityGraphPost[];
  draftSlugs: string[];
};

type GraphNodeType = "category" | "post";

type GraphNode = {
  id: string;
  nodeType: GraphNodeType;
  label: string;
  color: string;
  size: number;
  image?: string;
  slug?: string;
  summary?: string;
  categoryIds?: string[];
  isDraft?: boolean;
  x: number;
  y: number;
  z: number;
  fz: number;
};

type GraphLink = {
  source: string;
  target: string;
  color: string;
  isDraft: boolean;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type ChargeForce = {
  strength?: (strength: number) => void;
};

type LinkForce = {
  distance?: (distance: number) => void;
  strength?: (strength: number) => void;
};

const CATEGORY_RING_RADIUS = 140;
const CATEGORY_Z = 90;
const POST_Z = -90;
const CATEGORY_SIZE = 10;
const POST_BASE_SIZE = 6;
const POST_SIZE_STEP = 1.5;
const DEFAULT_GRAPH_HEIGHT = 560;
const GRAPH_CONTAINER_CLASS = "h-[560px]";
const ZOOM_TO_FIT_DURATION = 550;
const ZOOM_TO_FIT_PADDING = 70;
const GOLDEN_ANGLE_DEGREES = 137.508;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSize(size: number) {
  return clamp(Number.isFinite(size) ? Math.round(size) : 2, 1, 5);
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToHex(h: number, s: number, l: number) {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = light - c / 2;
  const toHex = (channel: number) => {
    const hex = Math.round((channel + m) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildCategoryColorMap(
  categories: ProductivityGraphCategory[],
  categoryLightness: number,
) {
  const map = new Map<string, string>();
  categories.forEach((category, index) => {
    const hue = Math.round((index * GOLDEN_ANGLE_DEGREES) % 360);
    map.set(category.id, hslToHex(hue, 62, categoryLightness));
  });
  return map;
}

function categoryRingPoint(index: number, total: number) {
  const count = Math.max(total, 1);
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: Math.cos(angle) * CATEGORY_RING_RADIUS,
    y: Math.sin(angle) * CATEGORY_RING_RADIUS,
  };
}

function buildGraphData(
  categories: ProductivityGraphCategory[],
  posts: ProductivityGraphPost[],
  draftSet: Set<string>,
  theme: GraphTheme,
): GraphData {
  const palette = getGraphThemePalette(theme);
  const categoryColors = buildCategoryColorMap(categories, palette.categoryLightness);
  const categoryPoints = new Map<string, { x: number; y: number }>();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  categories.forEach((category, index) => {
    const point = categoryRingPoint(index, categories.length);
    categoryPoints.set(category.id, point);

    nodes.push({
      id: `cat:${category.id}`,
      nodeType: "category",
      label: category.label,
      color: categoryColors.get(category.id) ?? palette.categoryFallbackColor,
      size: CATEGORY_SIZE,
      x: point.x,
      y: point.y,
      z: CATEGORY_Z,
      fz: CATEGORY_Z,
    });
  });

  posts.forEach((post) => {
    const linkedPoints = post.categories
      .map((categoryId) => categoryPoints.get(categoryId))
      .filter((point): point is { x: number; y: number } => Boolean(point));

    const centerX =
      linkedPoints.length > 0
        ? linkedPoints.reduce((sum, point) => sum + point.x, 0) / linkedPoints.length
        : 0;
    const centerY =
      linkedPoints.length > 0
        ? linkedPoints.reduce((sum, point) => sum + point.y, 0) / linkedPoints.length
        : 0;

    const hash = hashString(post.slug);
    const angle = ((hash % 360) * Math.PI) / 180;
    const jitter = 12 + (hash % 35);
    const isDraft = draftSet.has(post.slug);
    const postNodeId = `post:${post.slug}`;

    nodes.push({
      id: postNodeId,
      nodeType: "post",
      label: post.title,
      color: isDraft ? palette.postDraftColor : palette.postColor,
      size: POST_BASE_SIZE + normalizeSize(post.size) * POST_SIZE_STEP,
      slug: post.slug,
      summary: post.summary,
      categoryIds: post.categories,
      isDraft,
      image: post.image,
      x: centerX + Math.cos(angle) * jitter,
      y: centerY + Math.sin(angle) * jitter,
      z: POST_Z,
      fz: POST_Z,
    });

    post.categories
      .filter((categoryId) => categoryPoints.has(categoryId))
      .forEach((categoryId) => {
        links.push({
          source: postNodeId,
          target: `cat:${categoryId}`,
          color: isDraft
            ? palette.linkDraftColor
            : (categoryColors.get(categoryId) ?? palette.linkFallbackColor),
          isDraft,
        });
      });
  });

  return { nodes, links };
}

export function ProductivityGraph3D({
  categories,
  posts,
  allPosts,
  draftSlugs,
}: ProductivityGraphProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showDrafts = searchParams.get("drafts") === "true";
  const activePosts = showDrafts ? allPosts : posts;
  const draftSet = useMemo(() => new Set(draftSlugs), [draftSlugs]);
  const [theme, setTheme] = useState<GraphTheme>(() => getGraphThemeFromDocument());
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);
  const textureCacheRef = useRef(new Map<string, THREE.Texture>());
  const nodeObjectCacheRef = useRef(new Map<string, THREE.Object3D>());

  const graphData = useMemo(
    () => buildGraphData(categories, activePosts, draftSet, theme),
    [categories, activePosts, draftSet, theme],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const didAutoFitRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: DEFAULT_GRAPH_HEIGHT });

  useEffect(
    () => () => {
      nodeObjectCacheRef.current.forEach((nodeObject) => disposeObject3D(nodeObject));
      nodeObjectCacheRef.current.clear();
      textureCacheRef.current.forEach((texture) => texture.dispose());
      textureCacheRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          setTheme((currentTheme) => {
            const nextTheme = getGraphThemeFromDocument();
            return currentTheme === nextTheme ? currentTheme : nextTheme;
          });
          break;
        }
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    nodeObjectCacheRef.current.forEach((nodeObject) => disposeObject3D(nodeObject));
    nodeObjectCacheRef.current.clear();
    textureCacheRef.current.forEach((texture) => texture.dispose());
    textureCacheRef.current.clear();
  }, [graphData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setDimensions({
        width: Math.max(container.clientWidth, 0),
        height: Math.max(container.clientHeight, DEFAULT_GRAPH_HEIGHT),
      });
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const chargeForce = graph.d3Force("charge") as ChargeForce | undefined;
    chargeForce?.strength?.(-180);

    const linkForce = graph.d3Force("link") as LinkForce | undefined;
    linkForce?.distance?.(80);
    linkForce?.strength?.(0.28);

    didAutoFitRef.current = false;
  }, [graphData]);

  const getThumbnailTexture = useCallback((imagePath: string) => {
    const cached = textureCacheRef.current.get(imagePath);
    if (cached) return cached;

    if (!textureLoaderRef.current) {
      textureLoaderRef.current = new THREE.TextureLoader();
    }

    const texture = textureLoaderRef.current.load(
      imagePath,
      undefined,
      undefined,
      () => {
        textureCacheRef.current.delete(imagePath);
      },
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCacheRef.current.set(imagePath, texture);
    return texture;
  }, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      const graphNode = node as GraphNode;
      if (graphNode.nodeType !== "post" || !graphNode.slug) return;
      router.push(withBasePath(`/blog/${graphNode.slug}`));
    },
    [router],
  );

  return (
    <section className="space-y-3">
      <div
        ref={containerRef}
        className={`${GRAPH_CONTAINER_CLASS} w-full overflow-hidden rounded-lg border border-rule bg-gradient-to-b from-background to-stone-100/40 dark:to-stone-900/30`}
      >
        {dimensions.width > 0 ? (
          <ForceGraph3D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            numDimensions={3}
            linkColor={(link: object) => (link as GraphLink).color}
            linkOpacity={0.5}
            linkWidth={1}
            nodeThreeObject={(node: object) => {
              const graphNode = node as GraphNode;
              const cachedNodeObject = nodeObjectCacheRef.current.get(graphNode.id);
              if (cachedNodeObject) return cachedNodeObject;

              const nodeObject = createNodeObject(graphNode, getThumbnailTexture);
              nodeObjectCacheRef.current.set(graphNode.id, nodeObject);
              return nodeObject;
            }}
            nodeLabel={(node: object) => {
              const graphNode = node as GraphNode;
              if (graphNode.nodeType === "category") return graphNode.label;
              const draftSuffix = graphNode.isDraft ? " (draft)" : "";
              return `${graphNode.label}${draftSuffix}`;
            }}
            onNodeClick={handleNodeClick}
            onEngineStop={() => {
              if (didAutoFitRef.current) return;
              graphRef.current?.zoomToFit(ZOOM_TO_FIT_DURATION, ZOOM_TO_FIT_PADDING);
              didAutoFitRef.current = true;
            }}
          />
        ) : null}
      </div>
      <p className="text-sm text-muted">
        Drag to orbit, scroll to zoom, right-drag to pan. Categories stay on the upper Z-plane and
        posts settle on the lower Z-plane.
      </p>
      {showDrafts ? (
        <p className="text-sm text-muted">Draft preview mode enabled: draft posts render in muted gray.</p>
      ) : null}
    </section>
  );
}

export type { ProductivityGraphProps };
