"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  forceLabel?: boolean;
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
  NodeImageProgram: import("sigma/rendering").NodeProgramType;
  NodeBorderProgram: import("sigma/rendering").NodeProgramType;
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
  graphToViewport: (point: { x: number; y: number }) => { x: number; y: number };
  scaleSize: (size?: number) => number;
  setSetting: (key: string, value: unknown) => void;
  on: (event: string, handler: (payload?: { node?: string }) => void) => void;
  kill: () => void;
};

type ThemePalette = {
  background: string;
  foreground: string;
  muted: string;
  rule: string;
};

type SigmaLabelColorSetting =
  | { attribute: string; color?: string }
  | { color: string; attribute?: undefined };

type SigmaLabelSettings = {
  labelFont: string;
  labelSize: number;
  labelWeight: string;
  labelColor: SigmaLabelColorSetting;
};

type SigmaNodeLabelData = {
  label?: string | null;
  x: number;
  y: number;
  size: number;
  [key: string]: unknown;
};

const CATEGORY_SIZE = 11.5;
const POST_BASE_SIZE = 4.2;
const POST_SIZE_STEP = 0.7;
const POST_LABEL_ZOOM_THRESHOLD = 1.35;
const GRAPH_LABEL_SIZE = 12;
const GRAPH_LABEL_WEIGHT = "400";
const GRAPH_LABEL_FONT_FALLBACK =
  "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
const CATEGORY_LANE_X = -8;
const POST_LANE_X = 5.8;
const CATEGORY_VERTICAL_GAP = 2.45;
const POST_LANE_VERTICAL_PADDING = 0.4;
const POST_LABEL_HIT_PADDING = 3;
const THEME_FALLBACK: ThemePalette = {
  background: "#fafaf9",
  foreground: "#1c1917",
  muted: "#78716c",
  rule: "#e7e5e4",
};
const POST_COLOR = "#3b82f6";
const POST_DRAFT_COLOR = "#94a3b8";

/** SVG data-URL: opaque white border, transparent center (evenodd hollow rect). */
const BORDER_MASK = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
  '<path d="M0,0H64V64H0Z M5,5V59H59V5Z" fill="white" fill-rule="evenodd"/>' +
  "</svg>",
)}`;

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
  else[r, g, b] = [c, 0, x];

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

function resolveSigmaLabelColor(data: SigmaNodeLabelData, labelColor: SigmaLabelColorSetting) {
  if ("attribute" in labelColor && labelColor.attribute) {
    const value = data[labelColor.attribute];
    if (typeof value === "string" && value.length > 0) return value;
    return labelColor.color ?? "#000";
  }
  return labelColor.color ?? "#000";
}

function drawCrispNodeLabel(
  context: CanvasRenderingContext2D,
  data: SigmaNodeLabelData,
  settings: SigmaLabelSettings,
) {
  if (!data.label) return;
  const label = typeof data.label === "string" ? data.label : String(data.label);
  if (!label) return;

  const size = settings.labelSize;
  const isCategory = data.nodeType === "category";
  const baseLabelColor = resolveSigmaLabelColor(data, settings.labelColor);
  const foregroundIsLight = relativeLuminance(baseLabelColor) > 0.6;
  const postLabelColor = foregroundIsLight ? "#ffffff" : "#111827";
  const style = isCategory ? `${settings.labelWeight}` : `italic ${settings.labelWeight}`;
  const labelPadding = POST_LABEL_HIT_PADDING;
  context.font = `${style} ${size}px ${settings.labelFont}`;
  context.fillStyle = isCategory ? baseLabelColor : postLabelColor;
  context.globalAlpha = 1;
  context.textAlign = isCategory ? "right" : "left";
  context.textBaseline = "alphabetic";

  // Snap text anchor points to whole pixels so labels render crisply on canvas.
  const x = isCategory
    ? Math.round(data.x - data.size - labelPadding)
    : Math.round(data.x + data.size + labelPadding);
  const y = Math.round(data.y + size / 3);
  if (!isCategory && foregroundIsLight) {
    context.lineWidth = 2.5;
    context.strokeStyle = "rgba(0, 0, 0, 0.45)";
    context.strokeText(label, x, y);
  }
  context.fillText(label, x, y);
  context.globalAlpha = 1;
  context.textAlign = "left";
}

function drawCrispNodeHover(
  context: CanvasRenderingContext2D,
  data: SigmaNodeLabelData,
  settings: SigmaLabelSettings,
) {
  // Reuse our label renderer so hover doesn't fallback to Sigma's white hover box.
  drawCrispNodeLabel(context, data, settings);
}

function buildCategoryColorMap(
  categories: ProductivityGraphCategory[],
  theme: ThemePalette,
) {
  const dark = isDarkTheme(theme);
  const saturation = dark ? 35 : 30;
  const lightness = dark ? 64 : 70;
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

function resolveGraphLabelFont() {
  return `${readCssVar("--font-inter", "Inter")}, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif`;
}

function hashString(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function laneY(index: number, total: number, gap: number) {
  return round2((index - (Math.max(total, 1) - 1) / 2) * gap);
}

function centerOutSlotOrder(total: number) {
  if (total <= 0) return [];
  const mid = Math.floor((total - 1) / 2);
  const order: number[] = [mid];

  for (let delta = 1; order.length < total; delta += 1) {
    const upper = mid + delta;
    const lower = mid - delta;
    if (upper < total) order.push(upper);
    if (lower >= 0) order.push(lower);
  }

  return order;
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

function buildCategoryPostCountMap(
  categories: ProductivityGraphCategory[],
  posts: ProductivityGraphPost[],
) {
  const counts = new Map<string, number>();
  categories.forEach((category) => counts.set(category.id, 0));

  posts.forEach((post) => {
    const seen = new Set(
      post.categories.filter((categoryId) => counts.has(categoryId)),
    );
    seen.forEach((categoryId) => {
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    });
  });

  return counts;
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
  const categoryCounts = buildCategoryPostCountMap(categories, posts);
  const categoryX = CATEGORY_LANE_X;
  const categoryPriority = [...categories].sort(
    (left, right) =>
      (categoryCounts.get(right.id) ?? 0) - (categoryCounts.get(left.id) ?? 0) ||
      left.label.localeCompare(right.label),
  );
  const categorySlots = centerOutSlotOrder(categories.length);
  const categoryOrder = new Map(
    categoryPriority.map((category, index) => [category.id, index]),
  );

  categoryPriority.forEach((cat, rank) => {
    const slotIndex = categorySlots[rank] ?? rank;
    const pt = {
      x: categoryX,
      y: laneY(slotIndex, categories.length, CATEGORY_VERTICAL_GAP),
    };
    categoryPositions.set(cat.id, pt);
    const nodeId = nodeIdForCategory(cat.id);
    graph.addNode(nodeId, {
      x: pt.x,
      y: pt.y,
      size: CATEGORY_SIZE,
      color: categoryColors.get(cat.id) ?? theme.foreground,
      label: cat.label,
      forceLabel: true,
      type: "circle",
      nodeType: "category",
      categoryId: cat.id,
    });
  });

  const addPostNode = (post: ProductivityGraphPost, x: number, y: number) => {
    const h = hashString(post.slug);
    const isDraft = draftSet.has(post.slug);
    const nodeId = nodeIdForPost(post.slug);
    const hasImage = !!post.image;

    graph.addNode(nodeId, {
      x,
      y,
      size: POST_BASE_SIZE + normalizeSize(post.size) * POST_SIZE_STEP,
      color: isDraft ? POST_DRAFT_COLOR : POST_COLOR,
      label: post.title,
      forceLabel: true,
      type: hasImage ? "image" : "border",
      nodeType: "post",
      slug: post.slug,
      categoryIds: post.categories,
      summary: post.summary,
      image: hasImage ? post.image : BORDER_MASK,
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
          curvature: 0.06 + ((h % 7) * 0.01),
        });
      });
  };

  const postsForLane = [...posts]
    .map((post) => {
      const orderedCategoryIds = post.categories
        .filter((categoryId) => categoryOrder.has(categoryId))
        .sort(
          (left, right) =>
            (categoryOrder.get(left) ?? Number.POSITIVE_INFINITY) -
            (categoryOrder.get(right) ?? Number.POSITIVE_INFINITY),
        );
      const primaryCategoryId = orderedCategoryIds[0];
      const primaryOrder =
        primaryCategoryId !== undefined
          ? (categoryOrder.get(primaryCategoryId) ?? Number.POSITIVE_INFINITY)
          : Number.POSITIVE_INFINITY;
      const connectedCategories = post.categories.filter((categoryId) =>
        categoryCounts.has(categoryId),
      );
      const linkedCategoryCount = connectedCategories.length;
      const connectedCategoryWeight = connectedCategories.reduce(
        (sum, categoryId) => sum + (categoryCounts.get(categoryId) ?? 0),
        0,
      );
      return {
        post,
        primaryOrder,
        linkedCategoryCount,
        connectedCategoryWeight,
      };
    })
    .sort(
      (left, right) =>
        right.linkedCategoryCount - left.linkedCategoryCount ||
        right.connectedCategoryWeight - left.connectedCategoryWeight ||
        left.primaryOrder - right.primaryOrder ||
        left.post.title.localeCompare(right.post.title),
    );

  const topY = laneY(0, categories.length, CATEGORY_VERTICAL_GAP) + POST_LANE_VERTICAL_PADDING;
  const bottomY =
    laneY(categories.length - 1, categories.length, CATEGORY_VERTICAL_GAP) -
    POST_LANE_VERTICAL_PADDING;
  const ySpan = Math.max(0, bottomY - topY);
  const postSlots = centerOutSlotOrder(postsForLane.length);

  postsForLane.forEach(({ post }, rank) => {
    const slotIndex = postSlots[rank] ?? rank;
    const y =
      postsForLane.length <= 1
        ? round2((topY + bottomY) / 2)
        : round2(topY + (slotIndex / (postsForLane.length - 1)) * ySpan);
    addPostNode(post, POST_LANE_X, y);
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
  const sigmaRef = useRef<SigmaLike | null>(null);
  const graphRef = useRef<Graph<GraphNode, GraphEdge> | null>(null);
  const engineRef = useRef<GraphEngineModules | null>(null);
  const activeNodeIdRef = useRef<string | null>(null);
  const pinnedNodeIdRef = useRef<string | null>(null);
  const labelFontRef = useRef<string>(GRAPH_LABEL_FONT_FALLBACK);
  const labelMeasureContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const themeRef = useRef<ThemePalette>(THEME_FALLBACK);
  const categoryColorsRef = useRef<Map<string, string>>(new Map());
  const visibilityRef = useRef<{ nodes: Set<string> | null; edges: Set<string> | null }>({
    nodes: null,
    edges: null,
  });

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      document.exitFullscreen().catch(() => { });
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
    () =>
      buildGraph(
        categories,
        activePosts,
        draftSet,
        initialCategoryColors,
        themeRef.current,
      ),
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
      labelFontRef.current = resolveGraphLabelFont();
      sigma.setSetting("labelFont", labelFontRef.current);
      sigma.setSetting("labelColor", { color: theme.foreground });
      sigma.refresh();
    }
  }, [categories]);

  const loadGraphEngine = useCallback(async (): Promise<GraphEngineModules> => {
    if (engineRef.current) return engineRef.current;

    const [sigmaMod, edgeCurveMod, nodeImageMod] = await Promise.all([
      import("sigma"),
      import("@sigma/edge-curve"),
      import("@sigma/node-image"),
    ]);

    const engine: GraphEngineModules = {
      SigmaCtor: sigmaMod.default,
      EdgeCurveProgram: edgeCurveMod.default,
      NodeImageProgram: nodeImageMod.createNodeImageProgram({ keepWithinCircle: false }),
      NodeBorderProgram: nodeImageMod.createNodeImageProgram({ keepWithinCircle: false, drawingMode: "color" }),
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

  const refreshVisibility = useCallback(() => {
    const graph = graphRef.current;
    const pinnedNodeId = pinnedNodeIdRef.current;

    // Only collapse to a neighborhood for explicit pinned selections.
    // Hover should not shrink/dim the rest of the graph.
    if (!graph || !pinnedNodeId || !graph.hasNode(pinnedNodeId)) {
      visibilityRef.current = { nodes: null, edges: null };
      return;
    }

    const visibleNodes = new Set<string>();
    const visibleEdges = new Set<string>();
    visibleNodes.add(pinnedNodeId);

    graph.forEachEdge(pinnedNodeId, (edgeId, _attrs, source, target) => {
      visibleEdges.add(edgeId);
      visibleNodes.add(source);
      visibleNodes.add(target);
    });

    visibilityRef.current = { nodes: visibleNodes, edges: visibleEdges };
  }, []);

  const runLayout = useCallback(
    async (
      graph: Graph<GraphNode, GraphEdge>,
      options?: { showIndicator?: boolean },
    ) => {
      if (graph.order === 0) return;
      const showIndicator = options?.showIndicator ?? true;
      if (showIndicator) setIsLayoutRunning(true);

      try {
        sigmaRef.current?.refresh();
      } finally {
        if (showIndicator) setIsLayoutRunning(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let detachLabelHoverListeners: (() => void) | null = null;

    void (async () => {
      const engine = await loadGraphEngine();
      if (cancelled || !containerRef.current) return;
      const labelFont = resolveGraphLabelFont();
      labelFontRef.current = labelFont;

      const sigma = new engine.SigmaCtor(
        new Graph<GraphNode, GraphEdge>(),
        containerRef.current,
        {
          renderLabels: true,
          defaultDrawNodeLabel: drawCrispNodeLabel,
          defaultDrawNodeHover: drawCrispNodeHover,
          labelFont,
          labelSize: GRAPH_LABEL_SIZE,
          labelWeight: GRAPH_LABEL_WEIGHT,
          labelColor: { color: themeRef.current.foreground },
          labelDensity: 0.15,
          labelGridCellSize: 70,
          defaultNodeColor: POST_COLOR,
          defaultEdgeColor: THEME_FALLBACK.rule,
          nodeProgramClasses: {
            image: engine.NodeImageProgram as unknown as never,
            border: engine.NodeBorderProgram as unknown as never,
          },
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
              const baseCategoryColor = categoryColors.get(data.categoryId) ?? palette.foreground;
              result.color = dimColor(
                baseCategoryColor,
                0.74,
                palette.background,
              );
              result.forceLabel = true;
              result.zIndex = 1;
            }

            if (!isVisible) {
              result.color = dimColor(data.color, 0.1, palette.background);
              result.size = Math.max(1.5, (data.size || 4) * 0.58);
              if (data.nodeType === "category") {
                result.label = "";
              } else {
                result.forceLabel = true;
              }
              result.zIndex = 0;
              return result;
            }

            if (data.nodeType === "post") {
              result.forceLabel = true;
              const shouldShowPostLabel = isVisible;
              if (!shouldShowPostLabel) {
                result.label = "";
              }
            }

            if (isActive || isPinned) {
              result.color =
                data.nodeType === "category"
                  ? brightenColor(result.color, 1.25)
                  : brightenColor(data.color, 1.4);
              result.size = (data.size || 4) * 1.24;
              result.zIndex = 2;
            }
            return result;
          },
          edgeReducer: (edge, data) => {
            const result = { ...data };
            const palette = themeRef.current;
            const darkTheme = isDarkTheme(palette);
            const visibleEdges = visibilityRef.current.edges;
            const activeNodeId = activeNodeIdRef.current;
            const isVisible = !visibleEdges || visibleEdges.has(edge);
            const hasActiveSelection = !!activeNodeId;
            const graph = graphRef.current;
            const extremities = graph ? graph.extremities(edge) : null;
            const isConnectedToActive =
              !!activeNodeId &&
              !!extremities &&
              (extremities[0] === activeNodeId || extremities[1] === activeNodeId);

            if (!isVisible) {
              result.color = dimColor(data.color, darkTheme ? 0.08 : 0.16, palette.background);
              result.size = darkTheme ? 0.2 : 0.35;
              result.zIndex = 0;
              return result;
            }

            if (!hasActiveSelection) {
              result.color = dimColor(data.color, darkTheme ? 0.22 : 0.52, palette.background);
              result.size = darkTheme ? 0.4 : 0.95;
              result.zIndex = 0;
              return result;
            }

            if (isConnectedToActive) {
              result.color = brightenColor(data.color, 1.35);
              result.size = Math.max(1.8, (data.size || 1) * 1.8);
              result.zIndex = 2;
              return result;
            }

            result.color = dimColor(data.color, darkTheme ? 0.18 : 0.4, palette.background);
            result.size = darkTheme ? 0.35 : 0.65;
            return result;
          },
        },
      ) as unknown as SigmaLike;

      sigmaRef.current = sigma;
      const initialGraph = latestGraphRef.current;
      graphRef.current = initialGraph;
      await runLayout(initialGraph, { showIndicator: false });
      sigma.setGraph(initialGraph);
      applyThemeToCurrentGraph();
      sigma.getCamera().animatedReset({ duration: 280 });

      const getLabelMeasureContext = () => {
        if (labelMeasureContextRef.current) return labelMeasureContextRef.current;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return null;
        labelMeasureContextRef.current = context;
        return context;
      };

      const setHoverFromNodeId = (nodeId: string) => {
        const graph = graphRef.current;
        if (!graph || !graph.hasNode(nodeId)) return;
        const attrs = graph.getNodeAttributes(nodeId);
        const focus = focusFromNodeId(nodeId);
        setFocusedNode(focus);
        if (attrs.nodeType === "post" && attrs.slug) {
          setHoveredPostSlug(attrs.slug);
        } else {
          setHoveredPostSlug(null);
        }
      };

      const isPointerOnAnyNode = (pointerX: number, pointerY: number) => {
        const graph = graphRef.current;
        const sigmaInstance = sigmaRef.current;
        if (!graph || !sigmaInstance) return false;

        let isOnNode = false;
        graph.forEachNode((nodeId, attrs) => {
          if (isOnNode) return;
          const viewport = sigmaInstance.graphToViewport({ x: attrs.x, y: attrs.y });
          const radius = sigmaInstance.scaleSize(attrs.size) + 4;
          const dx = pointerX - viewport.x;
          const dy = pointerY - viewport.y;
          if (dx * dx + dy * dy <= radius * radius) {
            isOnNode = true;
          }
        });

        return isOnNode;
      };

      const findPostNodeByLabelHit = (pointerX: number, pointerY: number) => {
        const graph = graphRef.current;
        const sigmaInstance = sigmaRef.current;
        const measureContext = getLabelMeasureContext();
        if (!graph || !sigmaInstance || !measureContext) return null;

        measureContext.font = `italic ${GRAPH_LABEL_WEIGHT} ${GRAPH_LABEL_SIZE}px ${labelFontRef.current}`;
        let hitNodeId: string | null = null;

        graph.forEachNode((nodeId, attrs) => {
          if (hitNodeId) return;
          if (attrs.nodeType !== "post" || !attrs.label) return;
          const label = attrs.label;
          const viewport = sigmaInstance.graphToViewport({ x: attrs.x, y: attrs.y });
          const nodeSize = sigmaInstance.scaleSize(attrs.size);
          const labelX = Math.round(viewport.x + nodeSize + POST_LABEL_HIT_PADDING);
          const labelY = Math.round(viewport.y + GRAPH_LABEL_SIZE / 3);
          const metrics = measureContext.measureText(label);
          const labelWidth = metrics.width;
          const labelTop = labelY - (metrics.actualBoundingBoxAscent || GRAPH_LABEL_SIZE);
          const labelBottom = labelY + (metrics.actualBoundingBoxDescent || GRAPH_LABEL_SIZE * 0.3);

          if (
            pointerX >= labelX - 2 &&
            pointerX <= labelX + labelWidth + 2 &&
            pointerY >= labelTop - 2 &&
            pointerY <= labelBottom + 2
          ) {
            hitNodeId = nodeId;
          }
        });

        return hitNodeId;
      };

      let labelHoverNodeId: string | null = null;
      const handleLabelHoverMove = (event: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const hitNodeId = findPostNodeByLabelHit(pointerX, pointerY);

        if (hitNodeId) {
          labelHoverNodeId = hitNodeId;
          setHoverFromNodeId(hitNodeId);
          if (containerRef.current) containerRef.current.style.cursor = "pointer";
          return;
        }

        if (!labelHoverNodeId) return;
        labelHoverNodeId = null;
        if (!isPointerOnAnyNode(pointerX, pointerY)) {
          setFocusedNode(null);
          setHoveredPostSlug(null);
          if (containerRef.current) containerRef.current.style.cursor = "grab";
        }
      };

      const handleLabelHoverLeave = () => {
        if (!labelHoverNodeId) return;
        labelHoverNodeId = null;
        setFocusedNode(null);
        setHoveredPostSlug(null);
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      };

      const currentContainer = containerRef.current;
      currentContainer.addEventListener("mousemove", handleLabelHoverMove);
      currentContainer.addEventListener("mouseleave", handleLabelHoverLeave);
      detachLabelHoverListeners = () => {
        currentContainer.removeEventListener("mousemove", handleLabelHoverMove);
        currentContainer.removeEventListener("mouseleave", handleLabelHoverLeave);
      };

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

      if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
      }

    })();

    return () => {
      cancelled = true;
      detachLabelHoverListeners?.();
      setIsLayoutRunning(false);
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, [applyThemeToCurrentGraph, loadGraphEngine, runLayout]);

  useEffect(() => {
    let cancelled = false;
    latestGraphRef.current = sigmaGraph;
    if (!sigmaRef.current) return () => { };

    void (async () => {
      await runLayout(sigmaGraph, { showIndicator: false });
      if (cancelled || !sigmaRef.current) return;
      graphRef.current = sigmaGraph;
      sigmaRef.current.setGraph(sigmaGraph);
      applyThemeToCurrentGraph();
      sigmaRef.current.getCamera().animatedReset({ duration: 280 });
    })();

    return () => {
      cancelled = true;
    };
  }, [applyThemeToCurrentGraph, runLayout, sigmaGraph]);

  useEffect(() => {
    activeNodeIdRef.current = nodeIdFromFocus(activeNode);
    pinnedNodeIdRef.current = nodeIdFromFocus(pinnedNode);
    refreshVisibility();
    sigmaRef.current?.refresh();
  }, [activeNode, pinnedNode, refreshVisibility]);

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
    void runLayout(graph, { showIndicator: true });
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
        <div className="relative mb-2 h-32 w-full overflow-hidden rounded">
          <Image
            src={withBasePath(focusedPost.image)}
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
      className="relative left-1/2 w-[94vw] -translate-x-1/2 space-y-4 px-4 sm:w-[56vw] sm:px-6 lg:px-8"
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
          isFullscreen ? "h-screen w-screen rounded-none border-none" : "h-[560px] sm:h-[760px]",
        ].join(" ")}
      >
        {hoverCard}
        <div
          ref={containerRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="Productivity explore view connecting categories and active posts"
        />
        {isLayoutRunning ? (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-rule bg-background/95 px-3 py-1 text-xs text-muted">
            Optimizing layout...
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted">
          Categories are on the left and posts are on the right. Hover for blurbs, click a post to open it.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
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
            onClick={rerunLayout}
            className="text-sm text-muted hover:text-foreground"
          >
            Repack nodes
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
