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
const CATEGORY_SIZE = 9;
const POST_BASE_SIZE = 4.8;
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

type GraphBuildResult = {
  graph: Graph<GraphNode, GraphEdge>;
};

function buildGraph(
  categories: ProductivityGraphCategory[],
  posts: ProductivityGraphPost[],
  draftSet: Set<string>,
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
      color: THEME_FALLBACK.foreground,
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
      size: POST_BASE_SIZE + normalizeSize(post.size) * 1.25,
      color: isDraft ? POST_DRAFT_COLOR : POST_COLOR,
      label: post.title,
      type: "image",
      nodeType: "post",
      slug: post.slug,
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
        graph.addEdgeWithKey(edgeId, nodeId, categoryNodeId, {
          size: 1,
          color: isDraft ? THEME_FALLBACK.muted : THEME_FALLBACK.rule,
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

  const { graph: sigmaGraph } = useMemo(
    () => buildGraph(categories, activePosts, draftSet),
    [categories, activePosts, draftSet],
  );
  const latestGraphRef = useRef(sigmaGraph);

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
      if (!sigmaRef.current) return;
      sigmaRef.current.setSetting("labelColor", { color: themeRef.current.foreground });
      sigmaRef.current.refresh();
    };

    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    return () => observer.disconnect();
  }, []);

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
    ctx.lineWidth = 1.4;
    ctx.setLineDash([2.4, 2.8]);

    const palette = themeRef.current;
    const visibleNodes = visibilityRef.current.nodes;

    graph.forEachNode((nodeId, attrs) => {
      if (attrs.nodeType !== "post") return;

      const display = sigma.getNodeDisplayData(nodeId);
      if (!display || display.hidden) return;

      const point = sigma.graphToViewport({ x: display.x, y: display.y });
      const isVisible = !visibleNodes || visibleNodes.has(nodeId);
      const outlineBaseColor = attrs.isDraft ? palette.muted : palette.rule;

      ctx.globalAlpha = isVisible ? 0.96 : 0.4;
      ctx.strokeStyle = isVisible
        ? outlineBaseColor
        : dimColor(outlineBaseColor, 0.55, palette.background);
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(6, display.size + 1.8), 0, Math.PI * 2);
      ctx.stroke();
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
        scalingRatio: 9,
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
          settings: { ratio: 1.1, margin: 6, expansion: 1.05 },
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
            const activeNodeId = activeNodeIdRef.current;
            const pinnedNodeId = pinnedNodeIdRef.current;
            const visibleNodes = visibilityRef.current.nodes;
            const isVisible = !visibleNodes || visibleNodes.has(node);
            const isActive = activeNodeId === node;
            const isPinned = pinnedNodeId === node;

            if (data.nodeType === "category") {
              result.color = palette.foreground;
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
                  ? brightenColor(palette.foreground, 1.25)
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
  }, [drawPostOutlines, loadGraphEngine, runLayout, stopLayout]);

  useEffect(() => {
    latestGraphRef.current = sigmaGraph;
    if (!sigmaRef.current) return;
    graphRef.current = sigmaGraph;
    sigmaRef.current.setGraph(sigmaGraph);
    sigmaRef.current.getCamera().animatedReset({ duration: 280 });
    window.setTimeout(() => {
      void runLayout(sigmaGraph);
      drawPostOutlines();
    }, 0);
  }, [drawPostOutlines, runLayout, sigmaGraph]);

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
