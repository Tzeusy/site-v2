"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  type ReactElement,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import type { ForceGraphMethods, ForceGraphProps } from "react-force-graph-3d";
import { withBasePath } from "@/lib/base-path";
import {
  buildSemanticVisibility,
  resolveLinkVisualState,
  resolveNodeVisualState,
  type InteractionGraphLink,
  type InteractionGraphNode,
} from "@/components/productivity/productivity-graph-3d-interactions";
import {
  applyNodeLabelSpriteColor,
  applyNodeObjectVisualState,
  createNodeLabelSprite,
  createNodeObject,
  disposeObject3D,
  type NodeLabelUserData,
  type RenderableNodeVisualState,
} from "@/components/productivity/productivity-graph-3d-rendering";
import {
  getGraphThemeFromDocument,
  getGraphThemePalette,
  isGraphThemeMutation,
  type GraphThemePalette,
  type GraphTheme,
} from "@/components/productivity/productivity-graph-3d-theme";
import {
  orbitPolarAngleFromElevation,
  resolveLinkCurveRotation,
  resolveLinkCurvature,
  resolveTiltedCameraPosition,
} from "@/components/productivity/productivity-graph-3d-layout";

type ForceGraph3DComponent = (
  props: ForceGraphProps & { ref?: RefObject<ForceGraphMethods | undefined> },
) => ReactElement;

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
}) as ForceGraph3DComponent;

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

type GraphNode = InteractionGraphNode & {
  label: string;
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

type GraphLink = InteractionGraphLink;

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
const GRAPH_BREAKOUT_CLASS =
  "relative left-1/2 right-1/2 -ml-[50vw] w-[100vw] sm:-ml-[40vw] sm:w-[80vw]";
const GRAPH_CONTAINER_CLASS = "h-[360px] sm:h-[560px]";
const GOLDEN_ANGLE_DEGREES = 137.508;
const POST_LABEL_ZOOM_THRESHOLD = 1.35;
const LABEL_OVERLAP_PADDING = 6;
const LABELS_PER_MEGAPIXEL = 36;
const MIN_VISIBLE_LABELS = 12;
const MIN_CAMERA_DISTANCE = 120;
const MAX_CAMERA_DISTANCE = 2400;
const CAMERA_MIN_ELEVATION_DEGREES = 8;
const CAMERA_MAX_ELEVATION_DEGREES = 58;
const INITIAL_CAMERA_DISTANCE = 520;
const INITIAL_CAMERA_ELEVATION_DEGREES = 35;
const INITIAL_CAMERA_AZIMUTH_DEGREES = -28;
const CAMERA_RESET_DURATION = 650;
const INITIAL_LAYOUT_CAMERA_DURATION = 620;
const FORCE_WARMUP_TICKS = 85;
const FORCE_COOLDOWN_TICKS = 90;
const FORCE_COOLDOWN_TIME_MS = 1600;
const CAMERA_TARGET = { x: 0, y: 0, z: 0 } as const;

type GraphRefWithCamera = ForceGraphMethods & {
  camera?: () => THREE.Camera | undefined;
  controls?: () => OrbitLikeControls | undefined;
};

type OrbitLikeControls = {
  autoRotate?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  update?: () => void;
};

type LabelScreenRect = {
  id: string;
  sprite: THREE.Sprite;
  priority: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function overlaps(a: LabelScreenRect, b: LabelScreenRect) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

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
  palette: GraphThemePalette,
): GraphData {
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
          id: `edge:${postNodeId}->cat:${categoryId}`,
          source: postNodeId,
          target: `cat:${categoryId}`,
          color: categoryColors.get(categoryId) ?? palette.linkFallbackColor,
          isDraft,
          draftDimColor: palette.linkDraftColor,
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
  const [themeVersion, setThemeVersion] = useState(0);
  const [fontGeneration, setFontGeneration] = useState(0);
  const graphPalette = useMemo(() => {
    void themeVersion;
    return getGraphThemePalette(theme);
  }, [theme, themeVersion]);

  const graphData = useMemo(
    () => buildGraphData(categories, activePosts, draftSet, graphPalette),
    [categories, activePosts, draftSet, graphPalette],
  );
  const graphStructureKey = useMemo(() => {
    const categoryKey = categories
      .map((category) => `${category.id}:${category.label}`)
      .join("|");
    const postKey = activePosts
      .map(
        (post) =>
          `${post.slug}:${post.title}:${post.size}:${post.image ?? ""}:${post.categories.join(",")}`,
      )
      .join("|");
    const draftsKey = [...draftSet].sort().join("|");
    return `${categoryKey}::${postKey}::${draftsKey}`;
  }, [categories, activePosts, draftSet]);

  const postsBySlug = useMemo(() => new Map(activePosts.map((post) => [post.slug, post])), [activePosts]);
  const categoryLabelMap = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);
  const [hoveredPostSlug, setHoveredPostSlug] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNodeHovered, setIsNodeHovered] = useState(false);
  const [isLayoutRunning, setIsLayoutRunning] = useState(true);
  const activeNodeId = pinnedNodeId ?? focusedNodeId;

  const semanticVisibility = useMemo(
    () => buildSemanticVisibility(activeNodeId, graphData.nodes, graphData.links),
    [activeNodeId, graphData.links, graphData.nodes],
  );

  const nodeVisualStates = useMemo(() => {
    const map = new Map<string, RenderableNodeVisualState>();
    graphData.nodes.forEach((node) => {
      map.set(node.id, resolveNodeVisualState(node, activeNodeId, semanticVisibility.visibleNodeIds));
    });
    return map;
  }, [graphData.nodes, activeNodeId, semanticVisibility.visibleNodeIds]);

  const focusedPost = useMemo(() => {
    if (!hoveredPostSlug) return null;
    return postsBySlug.get(hoveredPostSlug) ?? null;
  }, [hoveredPostSlug, postsBySlug]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const didAutoFitRef = useRef(false);
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);
  const textureCacheRef = useRef(new Map<string, THREE.Texture>());
  const nodeObjectCacheRef = useRef(new Map<string, THREE.Object3D>());
  const linkMaterialCacheRef = useRef(new Map<string, THREE.LineBasicMaterial>());
  const labelSpriteCacheRef = useRef(new Map<string, THREE.Sprite>());
  const labelAnimationFrameRef = useRef<number | null>(null);
  const autoFitTimerRef = useRef<number | null>(null);
  const baseCameraDistanceRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: DEFAULT_GRAPH_HEIGHT });
  const rendererConfig = useMemo(() => ({ antialias: true, alpha: true }), []);

  const clearInteractiveState = useCallback(() => {
    setPinnedNodeId(null);
    setFocusedNodeId(null);
    setHoveredPostSlug(null);
    setIsNodeHovered(false);
  }, []);

  const clearRenderCaches = useCallback(() => {
    nodeObjectCacheRef.current.forEach((nodeObject) => disposeObject3D(nodeObject));
    nodeObjectCacheRef.current.clear();
    labelSpriteCacheRef.current.clear();
    linkMaterialCacheRef.current.forEach((material) => material.dispose());
    linkMaterialCacheRef.current.clear();
    textureCacheRef.current.forEach((texture) => texture.dispose());
    textureCacheRef.current.clear();
  }, []);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (document.fullscreenElement !== wrapperRef.current) return;
    document.exitFullscreen().catch(() => { });
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isFullscreen, handleEscape]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
      graphRef.current?.refresh();
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(
    () => () => {
      if (labelAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(labelAnimationFrameRef.current);
        labelAnimationFrameRef.current = null;
      }
      if (autoFitTimerRef.current !== null) {
        window.clearTimeout(autoFitTimerRef.current);
        autoFitTimerRef.current = null;
      }
      clearRenderCaches();
    },
    [clearRenderCaches],
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!isGraphThemeMutation(mutation)) continue;
        setTheme((currentTheme) => {
          const nextTheme = getGraphThemeFromDocument();
          return currentTheme === nextTheme ? currentTheme : nextTheme;
        });
        setThemeVersion((currentVersion) => currentVersion + 1);
        break;
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    clearRenderCaches();
    baseCameraDistanceRef.current = null;
    didAutoFitRef.current = false;
    if (autoFitTimerRef.current !== null) {
      window.clearTimeout(autoFitTimerRef.current);
      autoFitTimerRef.current = null;
    }
  }, [fontGeneration, graphStructureKey, clearRenderCaches]);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;

    void document.fonts.load('700 16px "Inter"').then(() => {
      if (!cancelled) setFontGeneration((value) => value + 1);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    graphData.nodes.forEach((node) => {
      const nodeObject = nodeObjectCacheRef.current.get(node.id);
      if (!nodeObject) return;
      const visual = nodeVisualStates.get(node.id);
      if (!visual) return;
      applyNodeObjectVisualState(nodeObject, visual);
    });

    graphRef.current?.refresh();
  }, [graphData.nodes, nodeVisualStates]);

  useEffect(() => {
    graphData.links.forEach((link) => {
      const material = linkMaterialCacheRef.current.get(link.id);
      if (!material) return;
      const linkVisual = resolveLinkVisualState(link, activeNodeId, semanticVisibility.visibleLinkIds);
      material.color.set(linkVisual.color);
      material.opacity = linkVisual.opacity;
      material.transparent = linkVisual.opacity < 1;
      material.needsUpdate = true;
    });

    graphRef.current?.refresh();
  }, [graphData.links, activeNodeId, semanticVisibility.visibleLinkIds]);

  useEffect(() => {
    labelSpriteCacheRef.current.forEach((sprite) => {
      const labelData = sprite.userData as NodeLabelUserData | undefined;
      if (!labelData) return;

      const color =
        labelData.nodeType === "category"
          ? graphPalette.labelCategoryColor
          : graphPalette.labelPostColor;
      applyNodeLabelSpriteColor(sprite, color);
    });

    graphRef.current?.refresh();
  }, [graphPalette.labelCategoryColor, graphPalette.labelPostColor]);

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
  }, [isFullscreen]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const chargeForce = graph.d3Force("charge") as ChargeForce | undefined;
    chargeForce?.strength?.(-175);

    const linkForce = graph.d3Force("link") as LinkForce | undefined;
    linkForce?.distance?.(78);
    linkForce?.strength?.(0.3);

    didAutoFitRef.current = false;
  }, [graphStructureKey]);

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

  const handleNodeHover = useCallback((node: object | null) => {
    if (!node) {
      setFocusedNodeId(null);
      setHoveredPostSlug(null);
      setIsNodeHovered(false);
      return;
    }

    const graphNode = node as GraphNode;
    setFocusedNodeId(graphNode.id);
    if (graphNode.nodeType === "post" && graphNode.slug) {
      setHoveredPostSlug(graphNode.slug);
    } else {
      setHoveredPostSlug(null);
    }
    setIsNodeHovered(true);
  }, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      const graphNode = node as GraphNode;
      if (graphNode.nodeType === "post" && graphNode.slug) {
        router.push(withBasePath(`/blog/${graphNode.slug}`));
        return;
      }

      if (graphNode.nodeType === "category") {
        setPinnedNodeId((previousPinnedNodeId) =>
          previousPinnedNodeId === graphNode.id ? null : graphNode.id,
        );
      }
    },
    [router],
  );

  const updateLabelVisibility = useCallback(() => {
    const graph = graphRef.current as GraphRefWithCamera | undefined;
    const camera = graph?.camera?.();

    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (dimensions.width <= 0 || dimensions.height <= 0) return;

    const cameraDistance = camera.position.length();
    if (!Number.isFinite(cameraDistance) || cameraDistance <= 0) return;

    if (baseCameraDistanceRef.current === null) {
      baseCameraDistanceRef.current = cameraDistance;
    }

    const baseCameraDistance = baseCameraDistanceRef.current ?? cameraDistance;
    const zoomRatio = baseCameraDistance / cameraDistance;
    const shouldShowLabels = zoomRatio >= POST_LABEL_ZOOM_THRESHOLD;
    labelSpriteCacheRef.current.forEach((sprite) => {
      sprite.visible = false;
    });
    if (!shouldShowLabels) return;

    const viewDirection = new THREE.Vector3();
    camera.getWorldDirection(viewDirection);

    const worldPosition = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const candidates: LabelScreenRect[] = [];

    labelSpriteCacheRef.current.forEach((sprite, nodeId) => {
      const labelData = sprite.userData as NodeLabelUserData | undefined;
      if (!labelData) return;

      sprite.getWorldPosition(worldPosition);
      projected.copy(worldPosition).project(camera);

      if (projected.z < -1 || projected.z > 1) return;

      const depth = worldPosition.sub(camera.position).dot(viewDirection);
      if (!Number.isFinite(depth) || depth <= 0) return;

      const viewportHeight =
        2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * depth;
      if (viewportHeight <= 0) return;

      const pixelsPerWorldUnit = dimensions.height / viewportHeight;
      if (!Number.isFinite(pixelsPerWorldUnit) || pixelsPerWorldUnit <= 0) return;

      const screenWidth = sprite.scale.x * pixelsPerWorldUnit + LABEL_OVERLAP_PADDING * 2;
      const screenHeight = sprite.scale.y * pixelsPerWorldUnit + LABEL_OVERLAP_PADDING * 2;
      const centerX = (projected.x * 0.5 + 0.5) * dimensions.width;
      const centerY = (-projected.y * 0.5 + 0.5) * dimensions.height;

      const rect: LabelScreenRect = {
        id: nodeId,
        sprite,
        priority: labelData.nodeType === "category" ? 0 : 1,
        left: centerX - screenWidth / 2,
        right: centerX + screenWidth / 2,
        top: centerY - screenHeight / 2,
        bottom: centerY + screenHeight / 2,
      };

      if (
        rect.right < 0 ||
        rect.left > dimensions.width ||
        rect.bottom < 0 ||
        rect.top > dimensions.height
      ) {
        return;
      }

      candidates.push(rect);
    });

    const maxVisibleLabels = Math.max(
      MIN_VISIBLE_LABELS,
      Math.floor((dimensions.width * dimensions.height * LABELS_PER_MEGAPIXEL) / 1_000_000),
    );
    candidates.sort((left, right) => left.priority - right.priority);
    const accepted: LabelScreenRect[] = [];

    candidates.forEach((candidate) => {
      if (accepted.length >= maxVisibleLabels) return;
      const isOverlapping = accepted.some((rect) => overlaps(candidate, rect));
      if (isOverlapping) return;
      candidate.sprite.visible = true;
      accepted.push(candidate);
    });
  }, [dimensions.height, dimensions.width]);

  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;

    const tick = () => {
      updateLabelVisibility();
      labelAnimationFrameRef.current = window.requestAnimationFrame(tick);
    };

    labelAnimationFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (labelAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(labelAnimationFrameRef.current);
        labelAnimationFrameRef.current = null;
      }
    };
  }, [graphStructureKey, dimensions.height, dimensions.width, updateLabelVisibility]);

  const toggleFullscreen = useCallback(async () => {
    if (!wrapperRef.current) return;

    if (document.fullscreenElement === wrapperRef.current) {
      await document.exitFullscreen().catch(() => { });
      return;
    }

    await wrapperRef.current.requestFullscreen().catch(() => { });
  }, []);

  const applyInitialCameraPosition = useCallback((duration: number) => {
    const graph = graphRef.current as GraphRefWithCamera | undefined;
    if (!graph) return;

    const camera = graph.camera?.();
    if (camera) {
      camera.up.set(0, 0, 1);
      camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
    }

    const nextPosition = resolveTiltedCameraPosition(
      INITIAL_CAMERA_DISTANCE,
      INITIAL_CAMERA_ELEVATION_DEGREES,
      INITIAL_CAMERA_AZIMUTH_DEGREES,
    );

    graph.cameraPosition(nextPosition, CAMERA_TARGET, duration);
    baseCameraDistanceRef.current = INITIAL_CAMERA_DISTANCE;
  }, []);

  const configureOrbitControls = useCallback(() => {
    const graph = graphRef.current as GraphRefWithCamera | undefined;
    const controls = graph?.controls?.() as OrbitLikeControls | undefined;
    if (!controls) return;

    controls.autoRotate = false;
    controls.enablePan = false;
    controls.minDistance = MIN_CAMERA_DISTANCE;
    controls.maxDistance = MAX_CAMERA_DISTANCE;
    controls.minPolarAngle = orbitPolarAngleFromElevation(CAMERA_MAX_ELEVATION_DEGREES);
    controls.maxPolarAngle = orbitPolarAngleFromElevation(CAMERA_MIN_ELEVATION_DEGREES);
    controls.update?.();
  }, []);

  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;

    const frame = window.requestAnimationFrame(() => {
      configureOrbitControls();
      if (!didAutoFitRef.current) {
        applyInitialCameraPosition(0);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    applyInitialCameraPosition,
    configureOrbitControls,
    dimensions.height,
    dimensions.width,
    graphStructureKey,
    isFullscreen,
  ]);

  const zoomByFactor = useCallback((factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;

    const camera = graph.camera();
    const position = camera.position;
    const distance = Math.hypot(position.x, position.y, position.z);
    if (!Number.isFinite(distance) || distance <= 0) return;

    const targetDistance = clamp(distance * factor, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
    const ratio = targetDistance / distance;

    graph.cameraPosition(
      {
        x: position.x * ratio,
        y: position.y * ratio,
        z: position.z * ratio,
      },
      undefined,
      220,
    );
  }, []);

  const zoomIn = useCallback(() => {
    zoomByFactor(0.82);
  }, [zoomByFactor]);

  const zoomOut = useCallback(() => {
    zoomByFactor(1.22);
  }, [zoomByFactor]);

  const resetView = useCallback(() => {
    clearInteractiveState();
    applyInitialCameraPosition(CAMERA_RESET_DURATION);
  }, [clearInteractiveState, applyInitialCameraPosition]);

  const rebalanceLayout = useCallback(() => {
    setIsLayoutRunning(true);
    graphRef.current?.d3ReheatSimulation();
  }, []);

  const getLinkMaterial = useCallback(
    (link: object) => {
      const graphLink = link as GraphLink;
      const linkVisual = resolveLinkVisualState(graphLink, activeNodeId, semanticVisibility.visibleLinkIds);
      const cachedMaterial = linkMaterialCacheRef.current.get(graphLink.id);
      const material =
        cachedMaterial ??
        new THREE.LineBasicMaterial({
          transparent: true,
          depthWrite: false,
          depthTest: true,
        });

      material.color.set(linkVisual.color);
      material.opacity = linkVisual.opacity;
      material.transparent = linkVisual.opacity < 1;
      material.needsUpdate = true;

      if (!cachedMaterial) {
        linkMaterialCacheRef.current.set(graphLink.id, material);
      }

      return material;
    },
    [activeNodeId, semanticVisibility.visibleLinkIds],
  );

  const hoverCard = focusedPost ? (
    <div className="pointer-events-none absolute left-3 top-3 z-10 w-64 rounded border border-rule bg-background p-3 shadow-sm">
      {focusedPost.image ? (
        <div className="relative mb-2 h-32 w-full overflow-hidden rounded">
          <Image
            src={focusedPost.image}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="256px"
          />
        </div>
      ) : null}
      <p className="text-sm font-medium leading-snug text-foreground">
        {focusedPost.title}
        {draftSet.has(focusedPost.slug) ? (
          <span className="ml-1.5 inline-block rounded bg-rule px-1.5 py-0.5 text-[10px] uppercase text-muted">
            draft
          </span>
        ) : null}
      </p>
      {focusedPost.summary ? (
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">{focusedPost.summary}</p>
      ) : null}
      {focusedPost.categories.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {focusedPost.categories.map((categoryId) => (
            <span key={categoryId} className="rounded bg-rule px-1.5 py-0.5 text-[10px] text-muted">
              {categoryLabelMap.get(categoryId) ?? categoryId}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <section className={`${GRAPH_BREAKOUT_CLASS} space-y-4`}>
      {showDrafts ? (
        <p className="border border-rule px-4 py-2 text-sm text-muted">
          Draft preview mode enabled: draft posts render in muted gray.
        </p>
      ) : null}

      <div
        ref={wrapperRef}
        className={[
          "relative overflow-hidden rounded-lg border border-rule bg-gradient-to-b from-background to-stone-100/40 dark:to-stone-900/30",
          isFullscreen ? "h-screen w-screen rounded-none border-none" : GRAPH_CONTAINER_CLASS,
        ].join(" ")}
      >
        {hoverCard}
        <div
          ref={containerRef}
          className="h-full w-full active:cursor-grabbing"
          style={{ cursor: isNodeHovered ? "pointer" : "grab" }}
          role="img"
          aria-label="Productivity graph connecting categories and active posts"
        >
          {dimensions.width > 0 ? (
            <ForceGraph3D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              backgroundColor={graphPalette.backgroundColor}
              rendererConfig={rendererConfig}
              numDimensions={3}
              controlType="orbit"
              warmupTicks={FORCE_WARMUP_TICKS}
              cooldownTicks={FORCE_COOLDOWN_TICKS}
              cooldownTime={FORCE_COOLDOWN_TIME_MS}
              linkOpacity={1}
              linkCurvature={(link: object) => resolveLinkCurvature((link as GraphLink).id)}
              linkCurveRotation={(link: object) => resolveLinkCurveRotation((link as GraphLink).id)}
              linkWidth={(link: object) =>
                resolveLinkVisualState(
                  link as GraphLink,
                  activeNodeId,
                  semanticVisibility.visibleLinkIds,
                ).width
              }
              linkMaterial={getLinkMaterial}
              nodeThreeObject={(node: object) => {
                const graphNode = node as GraphNode;
                const cachedNodeObject = nodeObjectCacheRef.current.get(graphNode.id);
                if (cachedNodeObject) {
                  return cachedNodeObject;
                }

                const nodeObject = createNodeObject(graphNode, getThumbnailTexture);
                const visual = nodeVisualStates.get(graphNode.id);
                if (visual) applyNodeObjectVisualState(nodeObject, visual);
                const labelSprite = createNodeLabelSprite(graphNode, {
                  categoryColor: graphPalette.labelCategoryColor,
                  postColor: graphPalette.labelPostColor,
                });
                if (labelSprite) {
                  nodeObject.add(labelSprite);
                  labelSpriteCacheRef.current.set(graphNode.id, labelSprite);
                }
                nodeObjectCacheRef.current.set(graphNode.id, nodeObject);
                return nodeObject;
              }}
              nodeLabel={(node: object) => {
                const graphNode = node as GraphNode;
                if (graphNode.nodeType === "category") return graphNode.label;
                const draftSuffix = graphNode.isDraft ? " (draft)" : "";
                return `${graphNode.label}${draftSuffix}`;
              }}
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}
              onBackgroundClick={clearInteractiveState}
              onEngineStop={() => {
                setIsLayoutRunning(false);
                if (didAutoFitRef.current) return;
                configureOrbitControls();
                applyInitialCameraPosition(INITIAL_LAYOUT_CAMERA_DURATION);
                didAutoFitRef.current = true;
                if (autoFitTimerRef.current !== null) {
                  window.clearTimeout(autoFitTimerRef.current);
                }
                autoFitTimerRef.current = window.setTimeout(() => {
                  const graph = graphRef.current as GraphRefWithCamera | undefined;
                  const camera = graph?.camera?.();
                  if (camera) {
                    baseCameraDistanceRef.current = camera.position.length();
                  }
                  updateLabelVisibility();
                  autoFitTimerRef.current = null;
                }, INITIAL_LAYOUT_CAMERA_DURATION + 30);
              }}
            />
          ) : null}
        </div>
        {isLayoutRunning ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-rule bg-background/95 px-3 py-1 text-xs text-muted">
            Optimizing layout...
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Drag to orbit, scroll to zoom. Click a category to pin focus; click a post to open it.
        </p>
        <div className="flex shrink-0 gap-4">
          <button
            type="button"
            onClick={zoomOut}
            className="text-sm text-muted hover:text-foreground"
          >
            Zoom out
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="text-sm text-muted hover:text-foreground"
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={resetView}
            className="text-sm text-muted hover:text-foreground"
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={rebalanceLayout}
            className="text-sm text-muted hover:text-foreground"
          >
            Rebalance layout
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="text-sm text-muted hover:text-foreground"
          >
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>
    </section>
  );
}

export type { ProductivityGraphProps };
