"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Graph from "graphology";
import { withBasePath } from "@/lib/base-path";

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

type FocusedNode =
  | { type: "category"; id: string }
  | { type: "post"; id: string }
  | null;

type GraphNodeType = "category" | "post";

type GraphNode = {
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  type?: string;
  nodeType: GraphNodeType;
  slug?: string;
  categoryId?: string;
  categoryIds?: string[];
  summary?: string;
  image?: string;
  isDraft?: boolean;
  hidden?: boolean;
  zIndex?: number;
  hovered?: boolean;
};

type GraphEdge = {
  size: number;
  color: string;
  postSlug: string;
  categoryId: string;
  isDraft: boolean;
  type?: string;
  curvature?: number;
  hidden?: boolean;
  zIndex?: number;
};

type GraphEngineModules = {
  SigmaCtor: typeof import("sigma").default;
  EdgeCurveProgram: typeof import("@sigma/edge-curve").default;
  NodeImageProgram: typeof import("@sigma/node-image").NodeImageProgram;
  ForceAtlas2LayoutCtor: typeof import("graphology-layout-forceatlas2/worker").default;
  forceAtlas2: typeof import("graphology-layout-forceatlas2").default;
  noverlap: typeof import("graphology-layout-noverlap").default;
};

type SigmaCameraLike = {
  animatedReset: (options: { duration: number }) => void;
  animatedZoom: (options: { duration: number }) => void;
  animatedUnzoom: (options: { duration: number }) => void;
};

type SigmaLike = {
  refresh: () => void;
  setGraph: (graph: Graph<GraphNode, GraphEdge>) => void;
  getCamera: () => SigmaCameraLike;
  getContainer: () => HTMLElement;
  getNodeDisplayData: (key: string) => { x: number; y: number; size: number; hidden: boolean } | undefined;
  graphToViewport: (coordinates: { x: number; y: number }) => { x: number; y: number };
  setSetting: (key: string, value: unknown) => void;
  on: (event: string, handler: (payload?: { node?: string }) => void) => void;
  off: (event: string, handler: (payload?: { node?: string }) => void) => void;
  kill: () => void;
};

type ThemePalette = {
  background: string;
  foreground: string;
  muted: string;
  rule: string;
};

const CATEGORY_RING_RADIUS = 9.5;
const LAYOUT_DURATION_MS = 7000;
const MAX_LAYOUT_SPAN = 16;
const CATEGORY_SIZE = 14;
const POST_BASE_SIZE = 4.2;
const POST_SIZE_STEP = 0.7;
const POST_LABEL_ZOOM_THRESHOLD = 1.35;
const THEME_FALLBACK: ThemePalette = {
  background: "#fafaf9",
  foreground: "#1c1917",
  muted: "#78716c",
  rule: "#e7e5e4",
};
const POST_COLOR = "#3b82f6";
const POST_DRAFT_COLOR = "#94a3b8";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSize(size: number) {
  return clamp(Number.isFinite(size) ? Math.round(size) : 2, 1, 5);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 100, g: 100, b: 100 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join("")
  );
}

function dimColor(hex: string, amount: number, backgroundHex: string) {
  const rgb = hexToRgb(hex);
  const bg = hexToRgb(backgroundHex);
  return rgbToHex(
    bg.r + (rgb.r - bg.r) * amount,
    bg.g + (rgb.g - bg.g) * amount,
    bg.b + (rgb.b - bg.b) * amount,
  );
}

function brightenColor(hex: string, factor: number) {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    rgb.r + ((255 - rgb.r) * (factor - 1)) / factor,
    rgb.g + ((255 - rgb.g) * (factor - 1)) / factor,
    rgb.b + ((255 - rgb.b) * (factor - 1)) / factor,
  );
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
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function isDarkTheme(theme: ThemePalette) {
  return relativeLuminance(theme.background) < 0.45;
}

function buildCategoryColorMap(
  categories: ProductivityGraphCategory[],
  theme: ThemePalette,
) {
  const dark = isDarkTheme(theme);
  const saturation = dark ? 44 : 40;
  const lightness = dark ? 66 : 74;
  const map = new Map<string, string>();

  categories.forEach((category, index) => {
    const hue = (index * 137.508 + 24) % 360;
    map.set(category.id, hslToHex(hue, saturation, lightness));
  });
  return map;
}

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function resolveThemePalette(): ThemePalette {
  return {
    background: readCssVar("--background", THEME_FALLBACK.background),
    foreground: readCssVar("--foreground", THEME_FALLBACK.foreground),
    muted: readCssVar("--muted", THEME_FALLBACK.muted),
    rule: readCssVar("--rule", THEME_FALLBACK.rule),
  };
}

function hashString(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function categoryRingPoint(index: number, total: number) {
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2;
  return { x: round2(Math.cos(angle) * CATEGORY_RING_RADIUS), y: round2(Math.sin(angle) * CATEGORY_RING_RADIUS) };
}

function nodeIdForCategory(id: string) {
  return `cat:${id}`;
}

function nodeIdForPost(slug: string) {
  return `post:${slug}`;
}

function focusFromNodeId(nodeId: string): FocusedNode {
  if (nodeId.startsWith("cat:")) return { type: "category", id: nodeId.slice(4) };
  if (nodeId.startsWith("post:")) return { type: "post", id: nodeId.slice(5) };
  return null;
}

function nodeIdFromFocus(node: FocusedNode) {
  if (!node) return null;
  return node.type === "category" ? nodeIdForCategory(node.id) : nodeIdForPost(node.id);
}

function compactGraphSpread(
  graph: Graph<GraphNode, GraphEdge>,
  options: { maxSpan: number },
) {
  if (graph.order < 2) return;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  graph.forEachNode((_nodeId, attrs) => {
    minX = Math.min(minX, attrs.x);
    maxX = Math.max(maxX, attrs.x);
    minY = Math.min(minY, attrs.y);
    maxY = Math.max(maxY, attrs.y);
  });

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const span = Math.max(spanX, spanY);

  if (!Number.isFinite(span) || span <= 0 || span <= options.maxSpan) return;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = options.maxSpan / span;

  graph.forEachNode((nodeId, attrs) => {
    graph.mergeNodeAttributes(nodeId, {
      x: cx + (attrs.x - cx) * scale,
      y: cy + (attrs.y - cy) * scale,
    });
  });
}

type GraphBuildResult = {
  graph: Graph<GraphNode, GraphEdge>;
};

function buildGraph(
  categories: ProductivityGraphCategory[],
  posts: ProductivityGraphPost[],
  draftSet: Set<string>,
  categoryColors: Map<string, string>,
  theme: ThemePalette,
): GraphBuildResult {
  const graph = new Graph<GraphNode, GraphEdge>();
  const categoryPositions = new Map<string, { x: number; y: number }>();

  categories.forEach((cat, i) => {
    const pt = categoryRingPoint(i, categories.length);
    categoryPositions.set(cat.id, pt);
    const nodeId = nodeIdForCategory(cat.id);
    graph.addNode(nodeId, {
      x: pt.x,
      y: pt.y,
      size: CATEGORY_SIZE,
      color: categoryColors.get(cat.id) ?? theme.foreground,
      label: cat.label,
      type: "circle",
      nodeType: "category",
      categoryId: cat.id,
    });
  });

  posts.forEach((post) => {
    const linkedCategoryPositions = post.categories
      .map((categoryId) => categoryPositions.get(categoryId))
      .filter(Boolean) as { x: number; y: number }[];

    const cx =
      linkedCategoryPositions.length > 0
        ? linkedCategoryPositions.reduce((sum, p) => sum + p.x, 0) / linkedCategoryPositions.length
        : 0;
    const cy =
      linkedCategoryPositions.length > 0
        ? linkedCategoryPositions.reduce((sum, p) => sum + p.y, 0) / linkedCategoryPositions.length
        : 0;

    const h = hashString(post.slug);
    const angle = ((h % 360) * Math.PI) / 180;
    const jitter = 0.8 + (h % 40) / 12;
    const isDraft = draftSet.has(post.slug);
    const nodeId = nodeIdForPost(post.slug);

    graph.addNode(nodeId, {
      x: cx + Math.cos(angle) * jitter,
      y: cy + Math.sin(angle) * jitter,
      size: POST_BASE_SIZE + normalizeSize(post.size) * POST_SIZE_STEP,
      color: isDraft ? POST_DRAFT_COLOR : POST_COLOR,
      label: `[${post.title}]`,
      type: "image",
      nodeType: "post",
      slug: post.slug,
      categoryIds: post.categories,
      summary: post.summary,
      image: post.image,
      isDraft,
    });

    post.categories
      .filter((categoryId) => categoryPositions.has(categoryId))
      .forEach((categoryId) => {
        const categoryNodeId = nodeIdForCategory(categoryId);
        const edgeId = `${nodeId}->${categoryNodeId}`;
        if (graph.hasEdge(edgeId)) return;
        const categoryColor = categoryColors.get(categoryId) ?? theme.rule;
        graph.addEdgeWithKey(edgeId, nodeId, categoryNodeId, {
          size: 1,
          color: isDraft ? dimColor(categoryColor, 0.58, theme.background) : categoryColor,
          postSlug: post.slug,
          categoryId,
          isDraft,
          type: "curved",
          curvature: 0.12 + ((h % 7) * 0.01),
        });
      });
  });

  return { graph };
}

export function ProductivityGraph({
  categories,
  posts,
  allPosts,
  draftSlugs,
}: ProductivityGraphProps) {
  const searchParams = useSearchParams();
  const showDrafts = searchParams.get("drafts") === "true";
  const activePosts = showDrafts ? allPosts : posts;
  const draftSet = useMemo(() => new Set(draftSlugs), [draftSlugs]);

  const [focusedNode, setFocusedNode] = useState<FocusedNode>(null);
  const [pinnedNode, setPinnedNode] = useState<FocusedNode>(null);
  const activeNode = pinnedNode ?? focusedNode;
  const [hoveredPostSlug, setHoveredPostSlug] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const outlineCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigmaRef = useRef<SigmaLike | null>(null);
  const graphRef = useRef<Graph<GraphNode, GraphEdge> | null>(null);
  const layoutRef = useRef<{ start: () => void; stop: () => void; kill: () => void } | null>(
    null,
  );
  const engineRef = useRef<GraphEngineModules | null>(null);
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNodeIdRef = useRef<string | null>(null);
  const pinnedNodeIdRef = useRef<string | null>(null);
  const themeRef = useRef<ThemePalette>(THEME_FALLBACK);
  const categoryColorsRef = useRef<Map<string, string>>(new Map());
  const afterRenderHandlerRef = useRef<(() => void) | null>(null);
  const resizeOutlineHandlerRef = useRef<(() => void) | null>(null);
  const visibilityRef = useRef<{ nodes: Set<string> | null; edges: Set<string> | null }>({
    nodes: null,
    edges: null,
  });

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
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
      const fullscreen = document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(fullscreen);
      sigmaRef.current?.refresh();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const postsBySlug = useMemo(
    () => new Map(activePosts.map((post) => [post.slug, post])),
    [activePosts],
  );

  const categoryLabelMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.label])),
    [categories],
  );

  const focusedPost = useMemo(() => {
    if (!hoveredPostSlug) return null;
    return postsBySlug.get(hoveredPostSlug) ?? null;
  }, [hoveredPostSlug, postsBySlug]);

  const initialCategoryColors = useMemo(
    () => buildCategoryColorMap(categories, themeRef.current),
    [categories],
  );

  const { graph: sigmaGraph } = useMemo(
    () => buildGraph(categories, activePosts, draftSet, initialCategoryColors, themeRef.current),
    [activePosts, categories, draftSet, initialCategoryColors],
  );
  const latestGraphRef = useRef(sigmaGraph);

  useEffect(() => {
    categoryColorsRef.current = initialCategoryColors;
  }, [initialCategoryColors]);

  const applyThemeToCurrentGraph = useCallback(() => {
    const graph = graphRef.current;
    const sigma = sigmaRef.current;
    const theme = themeRef.current;
    const categoryColors = buildCategoryColorMap(categories, theme);
    categoryColorsRef.current = categoryColors;

    if (!graph) return;

    graph.forEachNode((nodeId, attrs) => {
      if (attrs.nodeType === "category" && attrs.categoryId) {
        graph.mergeNodeAttributes(nodeId, {
          color: categoryColors.get(attrs.categoryId) ?? theme.foreground,
        });
        return;
      }
      if (attrs.nodeType === "post") {
        graph.mergeNodeAttributes(nodeId, {
          color: attrs.isDraft ? POST_DRAFT_COLOR : POST_COLOR,
        });
      }
    });

    graph.forEachEdge((edgeId, attrs) => {
      const base = categoryColors.get(attrs.categoryId) ?? theme.rule;
      graph.mergeEdgeAttributes(edgeId, {
        color: attrs.isDraft ? dimColor(base, 0.58, theme.background) : base,
      });
    });

    if (sigma) {
      sigma.setSetting("labelColor", { color: theme.foreground });
      sigma.refresh();
    }
  }, [categories]);

  const loadGraphEngine = useCallback(async (): Promise<GraphEngineModules> => {
    if (engineRef.current) return engineRef.current;

    const [sigmaMod, edgeCurveMod, nodeImageMod, fa2WorkerMod, fa2Mod, noverlapMod] = await Promise.all([
      import("sigma"),
      import("@sigma/edge-curve"),
      import("@sigma/node-image"),
      import("graphology-layout-forceatlas2/worker"),
      import("graphology-layout-forceatlas2"),
      import("graphology-layout-noverlap"),
    ]);

    const engine: GraphEngineModules = {
      SigmaCtor: sigmaMod.default,
      EdgeCurveProgram: edgeCurveMod.default,
      NodeImageProgram: nodeImageMod.NodeImageProgram,
      ForceAtlas2LayoutCtor: fa2WorkerMod.default,
      forceAtlas2: fa2Mod.default,
      noverlap: noverlapMod.default,
    };
    engineRef.current = engine;
    return engine;
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      themeRef.current = resolveThemePalette();
      applyThemeToCurrentGraph();
    };

    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    return () => observer.disconnect();
  }, [applyThemeToCurrentGraph]);

  const drawPostOutlines = useCallback(() => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    const canvas = outlineCanvasRef.current;
    if (!sigma || !graph || !canvas) return;

    const container = sigma.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([2.4, 2.8]);

    const palette = themeRef.current;
    const categoryColors = categoryColorsRef.current;
    const visibleNodes = visibilityRef.current.nodes;

    graph.forEachNode((nodeId, attrs) => {
      if (attrs.nodeType !== "post") return;

      const display = sigma.getNodeDisplayData(nodeId);
      if (!display || display.hidden) return;

      const point = sigma.graphToViewport({ x: display.x, y: display.y });
      const isVisible = !visibleNodes || visibleNodes.has(nodeId);
      const categoryIds = attrs.categoryIds?.filter((id) => categoryColors.has(id)) ?? [];
      const ringColors =
        categoryIds.length > 0
          ? categoryIds.map((id) => categoryColors.get(id) ?? palette.rule)
          : [attrs.isDraft ? palette.muted : palette.rule];
      const total = ringColors.length;
      const radius = Math.max(6, display.size + 1.8);
      const segmentAngle = (Math.PI * 2) / total;
      const offset = -Math.PI / 2;

      ctx.globalAlpha = isVisible ? 0.98 : 0.4;

      ringColors.forEach((segmentColor, index) => {
        const start = offset + segmentAngle * index + (total > 1 ? segmentAngle * 0.05 : 0);
        const end = offset + segmentAngle * (index + 1) - (total > 1 ? segmentAngle * 0.05 : 0);
        ctx.strokeStyle = isVisible
          ? segmentColor
          : dimColor(segmentColor, 0.55, palette.background);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, start, end);
        ctx.stroke();
      });
    });

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }, []);

  const stopLayout = useCallback(() => {
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
      layoutTimeoutRef.current = null;
    }
    if (layoutRef.current) {
      layoutRef.current.stop();
      layoutRef.current.kill();
      layoutRef.current = null;
    }
    setIsLayoutRunning(false);
  }, []);

  const refreshVisibility = useCallback(() => {
    const graph = graphRef.current;
    const activeNodeId = activeNodeIdRef.current;

    if (!graph || !activeNodeId || !graph.hasNode(activeNodeId)) {
      visibilityRef.current = { nodes: null, edges: null };
      return;
    }

    const visibleNodes = new Set<string>();
    const visibleEdges = new Set<string>();
    visibleNodes.add(activeNodeId);

    const nodeAttributes = graph.getNodeAttributes(activeNodeId);

    if (nodeAttributes.nodeType === "post") {
      graph.forEachEdge(activeNodeId, (edgeId, _attrs, source, target) => {
        visibleEdges.add(edgeId);
        visibleNodes.add(source);
        visibleNodes.add(target);
      });
    } else {
      const linkedPosts: string[] = [];

      graph.forEachNeighbor(activeNodeId, (neighborNodeId) => {
        const neighbor = graph.getNodeAttributes(neighborNodeId);
        if (neighbor.nodeType === "post") {
          linkedPosts.push(neighborNodeId);
          visibleNodes.add(neighborNodeId);
        }
      });

      linkedPosts.forEach((postNodeId) => {
        graph.forEachEdge(postNodeId, (edgeId, _attrs, source, target) => {
          visibleEdges.add(edgeId);
          visibleNodes.add(source);
          visibleNodes.add(target);
        });
      });
    }

    visibilityRef.current = { nodes: visibleNodes, edges: visibleEdges };
  }, []);

  const runLayout = useCallback(
    async (graph: Graph<GraphNode, GraphEdge>) => {
      if (graph.order === 0) return;
      stopLayout();
      const engine = await loadGraphEngine();

      const inferred = engine.forceAtlas2.inferSettings(graph);
      const settings = {
        ...inferred,
        gravity: 0.06,
        scalingRatio: 5.5,
        slowDown: graph.order > 300 ? 1.9 : 1.4,
        barnesHutOptimize: graph.order > 150,
        strongGravityMode: false,
        adjustSizes: true,
        outboundAttractionDistribution: true,
      };

      const layout = new engine.ForceAtlas2LayoutCtor(graph, { settings });
      layoutRef.current = layout;
      layout.start();
      setIsLayoutRunning(true);

      layoutTimeoutRef.current = setTimeout(() => {
        if (!layoutRef.current) return;
        layoutRef.current.stop();
        layoutRef.current.kill();
        layoutRef.current = null;
        engine.noverlap.assign(graph, {
          maxIterations: 24,
          settings: { ratio: 1.02, margin: 2, expansion: 1.02 },
        });
        compactGraphSpread(graph, { maxSpan: MAX_LAYOUT_SPAN });
        engine.noverlap.assign(graph, {
          maxIterations: 10,
          settings: { ratio: 1.01, margin: 1.2, expansion: 1.01 },
        });
        sigmaRef.current?.refresh();
        setIsLayoutRunning(false);
      }, LAYOUT_DURATION_MS);
    },
    [loadGraphEngine, stopLayout],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const engine = await loadGraphEngine();
      if (cancelled || !containerRef.current) return;

      const sigma = new engine.SigmaCtor(
        new Graph<GraphNode, GraphEdge>(),
        containerRef.current,
        {
          renderLabels: true,
          labelFont: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          labelSize: 11,
          labelWeight: "500",
          labelColor: { color: themeRef.current.foreground },
          labelDensity: 0.15,
          labelGridCellSize: 70,
          defaultNodeColor: POST_COLOR,
          defaultEdgeColor: THEME_FALLBACK.rule,
          nodeProgramClasses: { image: engine.NodeImageProgram as unknown as never },
          defaultEdgeType: "curved",
          edgeProgramClasses: { curved: engine.EdgeCurveProgram as unknown as never },
          zIndex: true,
          hideEdgesOnMove: true,
          minCameraRatio: 0.04,
          maxCameraRatio: 4,
          labelRenderedSizeThreshold: POST_LABEL_ZOOM_THRESHOLD,
          nodeReducer: (node, data) => {
            const result = { ...data };
            const palette = themeRef.current;
            const categoryColors = categoryColorsRef.current;
            const activeNodeId = activeNodeIdRef.current;
            const pinnedNodeId = pinnedNodeIdRef.current;
            const visibleNodes = visibilityRef.current.nodes;
            const isVisible = !visibleNodes || visibleNodes.has(node);
            const isActive = activeNodeId === node;
            const isPinned = pinnedNodeId === node;

            if (data.nodeType === "category" && data.categoryId) {
              result.color = categoryColors.get(data.categoryId) ?? palette.foreground;
            }

            if (!isVisible) {
              result.color = dimColor(data.color, 0.18, palette.background);
              result.size = Math.max(1.6, (data.size || 4) * 0.7);
              result.label = "";
              result.zIndex = 0;
              return result;
            }

            if (isActive || isPinned) {
              result.color =
                data.nodeType === "category"
                  ? brightenColor(result.color, 1.2)
                  : brightenColor(data.color, 1.4);
              result.size = (data.size || 4) * 1.3;
              result.zIndex = 2;
            }
            return result;
          },
          edgeReducer: (edge, data) => {
            const result = { ...data };
            const palette = themeRef.current;
            const visibleEdges = visibilityRef.current.edges;
            const activeNodeId = activeNodeIdRef.current;
            const isVisible = !visibleEdges || visibleEdges.has(edge);
            const graph = graphRef.current;
            const extremities = graph ? graph.extremities(edge) : null;
            const isConnectedToActive =
              !!activeNodeId &&
              !!extremities &&
              (extremities[0] === activeNodeId || extremities[1] === activeNodeId);

            if (!isVisible) {
              result.color = dimColor(data.color, 0.12, palette.background);
              result.size = 0.25;
              result.zIndex = 0;
              return result;
            }

            if (isConnectedToActive) {
              result.color = brightenColor(data.color, 1.35);
              result.size = Math.max(1.8, (data.size || 1) * 1.8);
              result.zIndex = 2;
              return result;
            }

            result.size = Math.max(0.7, data.size || 1);
            return result;
          },
        },
      ) as unknown as SigmaLike;

      sigmaRef.current = sigma;
      const initialGraph = latestGraphRef.current;
      graphRef.current = initialGraph;
      sigma.setGraph(initialGraph);
      applyThemeToCurrentGraph();
      sigma.getCamera().animatedReset({ duration: 280 });
      window.setTimeout(() => {
        void runLayout(initialGraph);
      }, 0);
      drawPostOutlines();

      const handleAfterRender = () => drawPostOutlines();
      afterRenderHandlerRef.current = handleAfterRender;
      sigma.on("afterRender", handleAfterRender);

      sigma.on("enterNode", (event) => {
        const node = event?.node;
        if (!node) return;
        const graph = graphRef.current;
        if (!graph || !graph.hasNode(node)) return;
        const attrs = graph.getNodeAttributes(node);
        const focus = focusFromNodeId(node);
        setFocusedNode(focus);
        if (attrs.nodeType === "post" && attrs.slug) {
          setHoveredPostSlug(attrs.slug);
        } else {
          setHoveredPostSlug(null);
        }
        if (containerRef.current) containerRef.current.style.cursor = "pointer";
      });

      sigma.on("leaveNode", () => {
        setFocusedNode(null);
        setHoveredPostSlug(null);
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      });

      sigma.on("clickNode", (event) => {
        const node = event?.node;
        if (!node) return;
        const graph = graphRef.current;
        if (!graph || !graph.hasNode(node)) return;

        const attrs = graph.getNodeAttributes(node);
        const focus = focusFromNodeId(node);

        if (!focus) return;
        if (attrs.nodeType === "post" && attrs.slug) {
          window.location.href = withBasePath(`/blog/${attrs.slug}`);
          return;
        }

        setPinnedNode((prev) => {
          if (prev && prev.type === focus.type && prev.id === focus.id) {
            return null;
          }
          return focus;
        });
      });

      sigma.on("clickStage", () => {
        setPinnedNode(null);
        setFocusedNode(null);
        setHoveredPostSlug(null);
      });

      const handleResize = () => drawPostOutlines();
      resizeOutlineHandlerRef.current = handleResize;
      window.addEventListener("resize", handleResize);

      if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
      }
    })();

    return () => {
      cancelled = true;
      stopLayout();
      if (sigmaRef.current && afterRenderHandlerRef.current) {
        sigmaRef.current.off("afterRender", afterRenderHandlerRef.current);
      }
      if (resizeOutlineHandlerRef.current) {
        window.removeEventListener("resize", resizeOutlineHandlerRef.current);
      }
      afterRenderHandlerRef.current = null;
      resizeOutlineHandlerRef.current = null;
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, [applyThemeToCurrentGraph, drawPostOutlines, loadGraphEngine, runLayout, stopLayout]);

  useEffect(() => {
    latestGraphRef.current = sigmaGraph;
    if (!sigmaRef.current) return;
    graphRef.current = sigmaGraph;
    sigmaRef.current.setGraph(sigmaGraph);
    applyThemeToCurrentGraph();
    sigmaRef.current.getCamera().animatedReset({ duration: 280 });
    window.setTimeout(() => {
      void runLayout(sigmaGraph);
      drawPostOutlines();
    }, 0);
  }, [applyThemeToCurrentGraph, drawPostOutlines, runLayout, sigmaGraph]);

  useEffect(() => {
    activeNodeIdRef.current = nodeIdFromFocus(activeNode);
    pinnedNodeIdRef.current = nodeIdFromFocus(pinnedNode);
    refreshVisibility();
    sigmaRef.current?.refresh();
    drawPostOutlines();
  }, [activeNode, drawPostOutlines, pinnedNode, refreshVisibility]);

  const zoomIn = useCallback(() => {
    sigmaRef.current?.getCamera().animatedZoom({ duration: 200 });
  }, []);

  const zoomOut = useCallback(() => {
    sigmaRef.current?.getCamera().animatedUnzoom({ duration: 200 });
  }, []);

  const resetView = useCallback(() => {
    sigmaRef.current?.getCamera().animatedReset({ duration: 260 });
    setPinnedNode(null);
  }, []);

  const rerunLayout = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    void runLayout(graph);
  }, [runLayout]);

  const toggleFullscreen = useCallback(async () => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement === wrapperRef.current) {
      await document.exitFullscreen();
      return;
    }
    await wrapperRef.current.requestFullscreen();
  }, []);

  const hoverCard = focusedPost ? (
    <div className="pointer-events-none absolute left-3 top-3 z-10 w-64 rounded border border-rule bg-background p-3 shadow-sm">
      {focusedPost.image ? (
        <img
          src={focusedPost.image}
          alt=""
          className="mb-2 h-32 w-full rounded object-cover"
        />
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
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">
          {focusedPost.summary}
        </p>
      ) : null}
      {focusedPost.categories.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {focusedPost.categories.map((catId) => (
            <span
              key={catId}
              className="rounded bg-rule px-1.5 py-0.5 text-[10px] text-muted"
            >
              {categoryLabelMap.get(catId) ?? catId}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      className="relative left-1/2 right-1/2 -ml-[50vw] w-[100vw] space-y-4 sm:-ml-[40vw] sm:w-[80vw]"
    >
      {showDrafts ? (
        <p className="border border-rule px-4 py-2 text-sm text-muted">
          Draft preview mode — draft nodes are rendered in muted color.
        </p>
      ) : null}

      <div
        ref={wrapperRef}
        className={[
          "relative overflow-hidden rounded border border-rule bg-background",
          isFullscreen ? "h-screen w-screen rounded-none border-none" : "h-[360px] sm:h-[560px]",
        ].join(" ")}
      >
        {hoverCard}
        <div
          ref={containerRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="Productivity graph connecting categories and active posts"
        />
        <canvas
          ref={outlineCanvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        />
        {isLayoutRunning ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-rule bg-background/95 px-3 py-1 text-xs text-muted">
            Optimizing layout...
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Drag to pan and scroll to zoom. Click a category to pin focus; click a post to open it.
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
            onClick={isLayoutRunning ? stopLayout : rerunLayout}
            className="text-sm text-muted hover:text-foreground"
          >
            {isLayoutRunning ? "Stop layout" : "Run layout"}
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
    </div>
  );
}
