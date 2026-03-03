"use client";

import dynamic from "next/dynamic";
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
  fx: number;
  fy: number;
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
const GRAPH_CONTAINER_CLASS = "h-[468px] sm:h-[728px]";
const GOLDEN_ANGLE_DEGREES = 137.508;
const HOVER_CLEAR_GRACE_MS = 90;
const INTERPLANE_GLASS_OPACITY = 0.8;
const INTERPLANE_GLASS_SIZE = 12000;
const INTERPLANE_GLASS_COLOR_LIGHT = "#f5f5f4";
const INTERPLANE_GLASS_COLOR_DARK = "#292524";
const MIN_CAMERA_DISTANCE = 120;
const MAX_CAMERA_DISTANCE = 2400;
const CAMERA_MIN_ELEVATION_DEGREES = 8;
const CAMERA_MAX_ELEVATION_DEGREES = 58;
const INITIAL_CAMERA_DISTANCE = 270;
const INITIAL_CAMERA_ELEVATION_DEGREES = 35;
const INITIAL_CAMERA_AZIMUTH_DEGREES = -28;
const CAMERA_RESET_DURATION = 650;
const FORCE_WARMUP_TICKS = 85;
const FORCE_COOLDOWN_TICKS = 90;
const FORCE_COOLDOWN_TIME_MS = 1600;
const CAMERA_TARGET = { x: 0, y: 0, z: 0 } as const;

type GraphRefWithCamera = ForceGraphMethods & {
  camera?: () => THREE.Camera | undefined;
  controls?: () => OrbitLikeControls | undefined;
  scene?: () => THREE.Scene | undefined;
};

type OrbitLikeControls = {
  autoRotate?: boolean;
  enablePan?: boolean;
  enableDamping?: boolean;
  dampingFactor?: number;
  screenSpacePanning?: boolean;
  rotateSpeed?: number;
  panSpeed?: number;
  zoomSpeed?: number;
  target?: {
    x: number;
    y: number;
    z: number;
    set: (x: number, y: number, z: number) => void;
  };
  mouseButtons?: {
    LEFT?: number;
    MIDDLE?: number;
    RIGHT?: number;
  };
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  update?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readDevicePixelRatio() {
  if (typeof window === "undefined") return 1;
  return clamp(Number(window.devicePixelRatio) || 1, 1, 4);
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

function resolveInterplaneGlassColors(theme: GraphTheme) {
  if (theme === "dark") {
    return INTERPLANE_GLASS_COLOR_DARK;
  }

  return INTERPLANE_GLASS_COLOR_LIGHT;
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
      fx: point.x,
      fy: point.y,
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

    const postX = centerX + Math.cos(angle) * jitter;
    const postY = centerY + Math.sin(angle) * jitter;

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
      x: postX,
      y: postY,
      z: POST_Z,
      fx: postX,
      fy: postY,
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
  const [devicePixelRatio, setDevicePixelRatio] = useState(() => readDevicePixelRatio());
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
  const graphRenderKey = `${graphStructureKey}::dpr=${devicePixelRatio.toFixed(2)}`;
  const postsBySlug = useMemo(() => new Map(activePosts.map((post) => [post.slug, post])), [activePosts]);
  const categoryLabelMap = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeNodeId = null;

  const nodeVisualStates = useMemo(() => {
    const map = new Map<string, RenderableNodeVisualState>();
    graphData.nodes.forEach((node) => {
      map.set(node.id, resolveNodeVisualState(node, activeNodeId, null));
    });
    return map;
  }, [graphData.nodes]);
  const graphCenter = useMemo(() => {
    if (graphData.nodes.length === 0) return CAMERA_TARGET;
    const sums = graphData.nodes.reduce(
      (acc, node) => ({
        x: acc.x + node.x,
        y: acc.y + node.y,
        z: acc.z + node.z,
      }),
      { x: 0, y: 0, z: 0 },
    );
    const count = graphData.nodes.length;
    return {
      x: sums.x / count,
      y: sums.y / count,
      z: sums.z / count,
    };
  }, [graphData.nodes]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);
  const textureCacheRef = useRef(new Map<string, THREE.Texture>());
  const nodeObjectCacheRef = useRef(new Map<string, THREE.Object3D>());
  const linkMaterialCacheRef = useRef(new Map<string, THREE.LineBasicMaterial>());
  const labelSpriteCacheRef = useRef(new Map<string, THREE.Sprite>());
  const interplaneGlassRef = useRef<THREE.Group | null>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const hoverImageWrapRef = useRef<HTMLDivElement>(null);
  const hoverImageRef = useRef<HTMLImageElement>(null);
  const hoverTitleRef = useRef<HTMLSpanElement>(null);
  const hoverDraftBadgeRef = useRef<HTMLSpanElement>(null);
  const hoverSummaryRef = useRef<HTMLParagraphElement>(null);
  const hoverTagsRef = useRef<HTMLDivElement>(null);
  const hoverClearTimerRef = useRef<number | null>(null);
  const initialCameraAppliedKeyRef = useRef<string | null>(null);
  const hasUserInteractedRef = useRef(false);

  const [dimensions, setDimensions] = useState({ width: 0, height: DEFAULT_GRAPH_HEIGHT });
  const rendererConfig = useMemo(() => ({ antialias: true, alpha: true }), []);

  const setContainerCursor = useCallback((cursor: "grab" | "pointer") => {
    if (!containerRef.current) return;
    containerRef.current.style.cursor = cursor;
  }, []);

  const clearHoverTimer = useCallback(() => {
    if (hoverClearTimerRef.current === null) return;
    window.clearTimeout(hoverClearTimerRef.current);
    hoverClearTimerRef.current = null;
  }, []);

  const hideHoverCard = useCallback(
    (cursor: "grab" | "pointer" = "grab") => {
      clearHoverTimer();
      setContainerCursor(cursor);
      hoverCardRef.current?.classList.add("hidden");
    },
    [clearHoverTimer, setContainerCursor],
  );

  const clearInteractiveState = useCallback(() => {
    hideHoverCard("grab");
  }, [hideHoverCard]);

  const clearRenderCaches = useCallback(() => {
    nodeObjectCacheRef.current.clear();
    labelSpriteCacheRef.current.clear();
    linkMaterialCacheRef.current.clear();
    textureCacheRef.current.clear();
  }, []);

  const removeInterplaneGlass = useCallback(() => {
    const glass = interplaneGlassRef.current;
    if (!glass) return;

    glass.traverse((child) => {
      const disposable = child as
        | THREE.Mesh
        | THREE.LineSegments
        | THREE.Object3D;
      const geometry = (disposable as THREE.Mesh | THREE.LineSegments).geometry;
      if (geometry && geometry instanceof THREE.BufferGeometry) {
        geometry.dispose();
      }

      const material = (disposable as THREE.Mesh | THREE.LineSegments).material;
      if (!material) return;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    });

    glass.parent?.remove(glass);
    interplaneGlassRef.current = null;
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
      clearHoverTimer();
      removeInterplaneGlass();
      clearRenderCaches();
    },
    [clearHoverTimer, clearRenderCaches, removeInterplaneGlass],
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
    const syncDevicePixelRatio = () => {
      setDevicePixelRatio((current) => {
        const next = readDevicePixelRatio();
        return Math.abs(current - next) > 0.01 ? next : current;
      });
    };

    syncDevicePixelRatio();
    window.addEventListener("resize", syncDevicePixelRatio);
    window.visualViewport?.addEventListener("resize", syncDevicePixelRatio);

    return () => {
      window.removeEventListener("resize", syncDevicePixelRatio);
      window.visualViewport?.removeEventListener("resize", syncDevicePixelRatio);
    };
  }, []);

  useEffect(() => {
    return () => {
      removeInterplaneGlass();
      clearRenderCaches();
    };
  }, [graphRenderKey, clearRenderCaches, removeInterplaneGlass]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let interval = 0;
    let attempts = 0;
    const maxAttempts = 30;

    const attachInterplaneGlass = () => {
      if (cancelled) return;

      const graph = graphRef.current as GraphRefWithCamera | undefined;
      const scene = graph?.scene?.();
      if (!scene) {
        attempts += 1;
        if (attempts < maxAttempts) {
          frame = window.requestAnimationFrame(attachInterplaneGlass);
        }
        return;
      }

      if (!interplaneGlassRef.current) {
        const pane = resolveInterplaneGlassColors(theme);
        const paneMaterial = new THREE.MeshBasicMaterial({
          color: pane,
          transparent: true,
          opacity: INTERPLANE_GLASS_OPACITY,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: true,
        });
        const paneMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(
            INTERPLANE_GLASS_SIZE,
            INTERPLANE_GLASS_SIZE,
            8,
            8,
          ),
          paneMaterial,
        );
        paneMesh.position.set(0, 0, 0);
        paneMesh.renderOrder = 6;
        paneMesh.raycast = () => { };

        const glassGroup = new THREE.Group();
        glassGroup.position.set(0, 0, 0);
        glassGroup.renderOrder = 6;
        glassGroup.add(paneMesh);
        glassGroup.raycast = () => { };

        interplaneGlassRef.current = glassGroup;
        scene.add(glassGroup);
        return;
      }

      if (interplaneGlassRef.current.parent !== scene) {
        interplaneGlassRef.current.parent?.remove(interplaneGlassRef.current);
        scene.add(interplaneGlassRef.current);
      }
    };

    frame = window.requestAnimationFrame(attachInterplaneGlass);
    interval = window.setInterval(attachInterplaneGlass, 800);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [graphRenderKey, theme]);

  useEffect(() => {
    const glass = interplaneGlassRef.current;
    if (!glass) return;
    const pane = resolveInterplaneGlassColors(theme);

    glass.traverse((child) => {
      const meshMaterial = (child as THREE.Mesh).material;
      if (meshMaterial instanceof THREE.MeshBasicMaterial) {
        meshMaterial.color.set(pane);
        meshMaterial.opacity = INTERPLANE_GLASS_OPACITY;
        meshMaterial.needsUpdate = true;
      }
    });
  }, [theme]);

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
      const linkVisual = resolveLinkVisualState(link, activeNodeId, null);
      material.color.set(linkVisual.color);
      material.opacity = linkVisual.opacity;
      material.transparent = linkVisual.opacity < 1;
      material.needsUpdate = true;
    });

    graphRef.current?.refresh();
  }, [graphData.links]);

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

  const handleNodeHover = useCallback(
    (node: object | null) => {
      clearHoverTimer();

      if (!node) {
        hoverClearTimerRef.current = window.setTimeout(() => {
          hideHoverCard("grab");
        }, HOVER_CLEAR_GRACE_MS);
        return;
      }

      const graphNode = node as GraphNode;
      setContainerCursor("pointer");

      if (graphNode.nodeType !== "post" || !graphNode.slug) {
        hoverCardRef.current?.classList.add("hidden");
        return;
      }

      const post = postsBySlug.get(graphNode.slug);
      if (!post) {
        hoverCardRef.current?.classList.add("hidden");
        return;
      }

      const card = hoverCardRef.current;
      const title = hoverTitleRef.current;
      if (card && title) {
        title.textContent = post.title;
        card.classList.remove("hidden");
      }

      const draftBadge = hoverDraftBadgeRef.current;
      if (draftBadge) {
        draftBadge.classList.toggle("hidden", !draftSet.has(post.slug));
      }

      const imageWrap = hoverImageWrapRef.current;
      const image = hoverImageRef.current;
      if (imageWrap && image) {
        if (post.image) {
          image.src = post.image;
          imageWrap.classList.remove("hidden");
        } else {
          image.removeAttribute("src");
          imageWrap.classList.add("hidden");
        }
      }

      const summary = hoverSummaryRef.current;
      if (summary) {
        if (post.summary) {
          summary.textContent = post.summary;
          summary.classList.remove("hidden");
        } else {
          summary.textContent = "";
          summary.classList.add("hidden");
        }
      }

      const tags = hoverTagsRef.current;
      if (tags) {
        tags.replaceChildren();
        post.categories.forEach((categoryId) => {
          const chip = document.createElement("span");
          chip.className = "rounded bg-rule px-1.5 py-0.5 text-[10px] text-muted";
          chip.textContent = categoryLabelMap.get(categoryId) ?? categoryId;
          tags.append(chip);
        });
        tags.classList.toggle("hidden", post.categories.length === 0);
      }
    },
    [categoryLabelMap, clearHoverTimer, draftSet, hideHoverCard, postsBySlug, setContainerCursor],
  );

  const handleNodeClick = useCallback(
    (node: object) => {
      const graphNode = node as GraphNode;
      if (graphNode.nodeType === "post" && graphNode.slug) {
        router.push(withBasePath(`/blog/${graphNode.slug}`));
        return;
      }
    },
    [router],
  );

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
    const controls = graph.controls?.() as OrbitLikeControls | undefined;

    const camera = graph.camera?.();
    if (camera) {
      camera.up.set(0, 0, 1);
      camera.lookAt(graphCenter.x, graphCenter.y, graphCenter.z);
    }
    controls?.target?.set(graphCenter.x, graphCenter.y, graphCenter.z);

    const cameraOffset = resolveTiltedCameraPosition(
      INITIAL_CAMERA_DISTANCE,
      INITIAL_CAMERA_ELEVATION_DEGREES,
      INITIAL_CAMERA_AZIMUTH_DEGREES,
    );
    const nextPosition = {
      x: graphCenter.x + cameraOffset.x,
      y: graphCenter.y + cameraOffset.y,
      z: graphCenter.z + cameraOffset.z,
    };

    graph.cameraPosition(nextPosition, graphCenter, duration);
    controls?.update?.();
  }, [graphCenter]);

  const configureOrbitControls = useCallback(() => {
    const graph = graphRef.current as GraphRefWithCamera | undefined;
    const controls = graph?.controls?.() as OrbitLikeControls | undefined;
    if (!controls) return false;

    controls.autoRotate = false;
    controls.enablePan = true;
    controls.enableDamping = false;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.rotateSpeed = 0.86;
    controls.panSpeed = 1;
    controls.zoomSpeed = 0.92;
    if (initialCameraAppliedKeyRef.current !== graphRenderKey) {
      controls.target?.set(graphCenter.x, graphCenter.y, graphCenter.z);
    }
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.minDistance = MIN_CAMERA_DISTANCE;
    controls.maxDistance = MAX_CAMERA_DISTANCE;
    controls.minPolarAngle = orbitPolarAngleFromElevation(CAMERA_MAX_ELEVATION_DEGREES);
    controls.maxPolarAngle = orbitPolarAngleFromElevation(CAMERA_MIN_ELEVATION_DEGREES);
    controls.update?.();
    return true;
  }, [graphCenter.x, graphCenter.y, graphCenter.z, graphRenderKey]);

  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;

    let cancelled = false;
    let frame = 0;
    let configuredOnce = false;

    const configureUntilReady = () => {
      if (cancelled) return;
      const configured = configureOrbitControls();
      if (configured) configuredOnce = true;
      if (!configuredOnce) {
        frame = window.requestAnimationFrame(configureUntilReady);
      }
    };

    frame = window.requestAnimationFrame(configureUntilReady);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [
    configureOrbitControls,
    dimensions.height,
    dimensions.width,
    graphStructureKey,
    isFullscreen,
  ]);

  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;
    if (initialCameraAppliedKeyRef.current === graphRenderKey) return;

    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    const maxAttempts = 60;

    const applyWhenReady = () => {
      if (cancelled) return;

      const graph = graphRef.current as GraphRefWithCamera | undefined;
      const camera = graph?.camera?.();
      if (!graph || !camera) {
        attempts += 1;
        if (attempts < maxAttempts) {
          frame = window.requestAnimationFrame(applyWhenReady);
        }
        return;
      }

      if (hasUserInteractedRef.current) {
        initialCameraAppliedKeyRef.current = graphRenderKey;
        return;
      }

      applyInitialCameraPosition(0);
      initialCameraAppliedKeyRef.current = graphRenderKey;
    };

    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(applyWhenReady);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [applyInitialCameraPosition, dimensions.height, dimensions.width, graphRenderKey]);

  const zoomByFactor = useCallback((factor: number) => {
    const graph = graphRef.current as GraphRefWithCamera | undefined;
    if (!graph) return;

    const camera = graph.camera?.();
    if (!camera) return;

    const controls = graph.controls?.() as OrbitLikeControls | undefined;
    const target = controls?.target ?? CAMERA_TARGET;
    const position = camera.position;
    const offsetX = position.x - target.x;
    const offsetY = position.y - target.y;
    const offsetZ = position.z - target.z;
    const distance = Math.hypot(offsetX, offsetY, offsetZ);
    if (!Number.isFinite(distance) || distance <= 0) return;

    const targetDistance = clamp(distance * factor, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
    const ratio = targetDistance / distance;

    graph.cameraPosition(
      {
        x: target.x + offsetX * ratio,
        y: target.y + offsetY * ratio,
        z: target.z + offsetZ * ratio,
      },
      {
        x: target.x,
        y: target.y,
        z: target.z,
      },
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
    graphRef.current?.d3ReheatSimulation();
  }, []);

  const getLinkMaterial = useCallback(
    (link: object) => {
      const graphLink = link as GraphLink;
      const linkVisual = resolveLinkVisualState(graphLink, activeNodeId, null);
      const cachedMaterial = linkMaterialCacheRef.current.get(graphLink.id);
      const material =
        cachedMaterial ??
        new THREE.LineBasicMaterial({
          transparent: true,
          depthWrite: true,
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
    [],
  );

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
        <div
          ref={hoverCardRef}
          className="pointer-events-none absolute left-3 top-3 z-10 hidden w-64 rounded border border-rule bg-background p-3 shadow-sm"
        >
          <div ref={hoverImageWrapRef} className="relative mb-2 hidden h-32 w-full overflow-hidden rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={hoverImageRef} alt="" className="h-full w-full object-cover" />
          </div>
          <p className="text-sm font-medium leading-snug text-foreground">
            <span ref={hoverTitleRef} />
            <span
              ref={hoverDraftBadgeRef}
              className="ml-1.5 hidden rounded bg-rule px-1.5 py-0.5 text-[10px] uppercase text-muted"
            >
              draft
            </span>
          </p>
          <p ref={hoverSummaryRef} className="mt-1 hidden line-clamp-3 text-xs leading-relaxed text-muted" />
          <div ref={hoverTagsRef} className="mt-2 hidden flex-wrap gap-1" />
        </div>
        <div
          ref={containerRef}
          className="h-full w-full active:cursor-grabbing"
          style={{ cursor: "grab" }}
          onPointerDown={() => {
            hasUserInteractedRef.current = true;
          }}
          onContextMenu={(event) => event.preventDefault()}
          role="img"
          aria-label="Productivity graph connecting categories and active posts"
        >
          {dimensions.width > 0 ? (
            <ForceGraph3D
              key={graphRenderKey}
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              showNavInfo={false}
              backgroundColor={graphPalette.backgroundColor}
              rendererConfig={rendererConfig}
              numDimensions={3}
              controlType="orbit"
              enableNodeDrag={false}
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
                  null,
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
                void node;
                return "";
              }}
              onNodeHover={handleNodeHover}
              onNodeClick={handleNodeClick}
              onBackgroundClick={clearInteractiveState}
            />
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Drag to pan, right-drag to orbit, scroll to zoom. Hover a post for details; click a post
          to open it.
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
