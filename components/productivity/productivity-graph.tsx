"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
} from "d3-force";
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
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

type SimNode = SimulationNodeDatum & {
  nodeId: string;
  nodeType: "category" | "post";
  radius: number;
};

const WIDTH = 980;
const HEIGHT = 620;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const CATEGORY_RING_RADIUS_X = WIDTH * 0.4;
const CATEGORY_RING_RADIUS_Y = HEIGHT * 0.38;
const MARGIN = 42;
const CATEGORY_RADIUS = 15;
const SIM_TICKS = 300;
const POST_LABEL_ZOOM_THRESHOLD = 1.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSize(size: number) {
  return clamp(Number.isFinite(size) ? Math.round(size) : 2, 1, 5);
}

function radiusForSize(size: number) {
  return 8 + normalizeSize(size) * 2;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
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
  return {
    x: round2(CENTER_X + Math.cos(angle) * CATEGORY_RING_RADIUS_X),
    y: round2(CENTER_Y + Math.sin(angle) * CATEGORY_RING_RADIUS_Y),
  };
}

type LayoutResult = {
  categoryPositions: Map<string, { x: number; y: number }>;
  postPositions: Map<string, { x: number; y: number; radius: number }>;
};

function computeForceLayout(
  categories: ProductivityGraphCategory[],
  posts: ProductivityGraphPost[],
): LayoutResult {
  const catNodes: SimNode[] = categories.map((cat, i) => {
    const pt = categoryRingPoint(i, categories.length);
    return {
      nodeId: `cat-${cat.id}`,
      nodeType: "category" as const,
      x: pt.x,
      y: pt.y,
      fx: pt.x,
      fy: pt.y,
      radius: CATEGORY_RADIUS,
    };
  });

  const catIndexById = new Map(catNodes.map((n, i) => [n.nodeId, i]));

  const postNodes: SimNode[] = posts.map((post) => {
    const linkedCatNodes = post.categories
      .map((catId) => catNodes[catIndexById.get(`cat-${catId}`) ?? -1])
      .filter(Boolean);

    const cx =
      linkedCatNodes.length > 0
        ? linkedCatNodes.reduce((s, n) => s + (n.x ?? CENTER_X), 0) /
          linkedCatNodes.length
        : CENTER_X;
    const cy =
      linkedCatNodes.length > 0
        ? linkedCatNodes.reduce((s, n) => s + (n.y ?? CENTER_Y), 0) /
          linkedCatNodes.length
        : CENTER_Y;

    // Deterministic jitter from slug hash
    const h = hashString(post.slug);
    const angle = ((h % 360) * Math.PI) / 180;
    const jitter = 10 + (h % 30);

    return {
      nodeId: `post-${post.slug}`,
      nodeType: "post" as const,
      x: cx + Math.cos(angle) * jitter,
      y: cy + Math.sin(angle) * jitter,
      radius: radiusForSize(post.size),
    };
  });

  const allNodes = [...catNodes, ...postNodes];
  const nodeIndex = new Map(allNodes.map((n, i) => [n.nodeId, i]));

  const links: SimulationLinkDatum<SimNode>[] = posts.flatMap((post) =>
    post.categories
      .filter((catId) => nodeIndex.has(`cat-${catId}`))
      .map((catId) => ({
        source: nodeIndex.get(`post-${post.slug}`)!,
        target: nodeIndex.get(`cat-${catId}`)!,
      })),
  );

  const CATEGORY_CHARGE = -150;
  const POST_CHARGE = CATEGORY_CHARGE / 3;

  const sim = forceSimulation<SimNode>(allNodes)
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .distance(60)
        .strength(0.6),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength((d) =>
        d.nodeType === "category" ? CATEGORY_CHARGE : POST_CHARGE,
      ),
    )
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((d) => d.radius + 8)
        .strength(0.7),
    )
    .force("x", forceX<SimNode>(CENTER_X).strength(0.03))
    .force("y", forceY<SimNode>(CENTER_Y).strength(0.03))
    .stop();

  for (let i = 0; i < SIM_TICKS; i++) {
    sim.tick();
  }

  // Clamp to bounds
  for (const node of allNodes) {
    if (node.fx == null) {
      node.x = clamp(node.x ?? CENTER_X, MARGIN, WIDTH - MARGIN);
    }
    if (node.fy == null) {
      node.y = clamp(node.y ?? CENTER_Y, MARGIN, HEIGHT - MARGIN);
    }
  }

  const categoryPositions = new Map(
    catNodes.map((n) => [
      n.nodeId.slice(4), // strip "cat-" prefix
      { x: round2(n.x ?? 0), y: round2(n.y ?? 0) },
    ]),
  );

  const postPositions = new Map(
    postNodes.map((n) => [
      n.nodeId.slice(5), // strip "post-" prefix
      { x: round2(n.x ?? 0), y: round2(n.y ?? 0), radius: n.radius },
    ]),
  );

  return { categoryPositions, postPositions };
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pan & zoom state
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  const viewBox = useMemo(() => {
    const w = WIDTH / zoom;
    const h = HEIGHT / zoom;
    const x = pan.x - (w - WIDTH) / 2;
    const y = pan.y - (h - HEIGHT) / 2;
    return `${round2(x)} ${round2(y)} ${round2(w)} ${round2(h)}`;
  }, [pan, zoom]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Only pan on primary button, and not when clicking a link or clickable node
      if (e.button !== 0) return;
      const target = e.target as Element;
      if (target.closest("a") || target.closest("[data-clickable]")) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [pan],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Skip single-finger pan while pinching
      if (pinchStart.current) return;
      if (!dragStart.current || !svgRef.current) return;

      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      // Convert screen pixels to SVG units
      const scaleX = (WIDTH / zoom) / rect.width;
      const scaleY = (HEIGHT / zoom) / rect.height;

      const dx = (e.clientX - dragStart.current.x) * scaleX;
      const dy = (e.clientY - dragStart.current.y) * scaleY;

      setPan({ x: dragStart.current.panX - dx, y: dragStart.current.panY - dy });
    },
    [zoom],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      // Only zoom when Shift is held; otherwise let page scroll normally
      if (!e.shiftKey) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92;
      setZoom((z) => clamp(z * factor, 0.4, 4));
    },
    [],
  );

  // Pinch-to-zoom for touch devices
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStart.current = { dist: Math.hypot(dx, dy), zoom };
      }
    },
    [zoom],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2 && pinchStart.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const scale = dist / pinchStart.current.dist;
        setZoom(clamp(pinchStart.current.zoom * scale, 0.4, 4));
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
    pinchStart.current = null;
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsFullscreen(false);
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

  const { categoryPositions, postPositions } = useMemo(
    () => computeForceLayout(categories, activePosts),
    [categories, activePosts],
  );

  const edges = useMemo(
    () =>
      activePosts.flatMap((post) =>
        post.categories
          .filter((categoryId) => categoryPositions.has(categoryId))
          .map((categoryId) => ({
            key: `${post.slug}__${categoryId}`,
            postSlug: post.slug,
            categoryId,
          })),
      ),
    [categoryPositions, activePosts],
  );

  const focusedPost = useMemo(() => {
    if (!activeNode || activeNode.type !== "post") return null;
    return activePosts.find((p) => p.slug === activeNode.id) ?? null;
  }, [activeNode, activePosts]);

  const categoryLabelMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.label])),
    [categories],
  );

  function edgeIsVisible(edge: { postSlug: string; categoryId: string }) {
    if (!activeNode) return true;
    if (activeNode.type === "post") return edge.postSlug === activeNode.id;
    // Category focus: show all edges of posts linked to the focused category
    const post = activePosts.find((p) => p.slug === edge.postSlug);
    return !!post?.categories.includes(activeNode.id);
  }

  function categoryIsVisible(categoryId: string) {
    if (!activeNode) return true;
    if (activeNode.type === "post") {
      return activePosts
        .find((post) => post.slug === activeNode.id)
        ?.categories.includes(categoryId);
    }
    // Category focus: show the focused category + depth-1 sibling categories
    if (categoryId === activeNode.id) return true;
    const linkedPosts = activePosts.filter((p) =>
      p.categories.includes(activeNode.id),
    );
    return linkedPosts.some((p) => p.categories.includes(categoryId));
  }

  function postIsVisible(post: ProductivityGraphPost) {
    if (!activeNode) return true;
    if (activeNode.type === "post") return post.slug === activeNode.id;
    return post.categories.includes(activeNode.id);
  }

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

  const svgContent = (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className={[
        isFullscreen
          ? "h-full w-full"
          : "h-[360px] w-full sm:h-[560px]",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      ].join(" ")}
      style={{ touchAction: "none" }}
      role="img"
      aria-label="Productivity graph connecting categories and active posts"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <defs>
        {activePosts.map((post) => {
          const pos = postPositions.get(post.slug);
          if (!pos || !post.image) return null;
          return (
            <clipPath key={`clip-${post.slug}`} id={`clip-${post.slug}`}>
              <circle cx={pos.x} cy={pos.y} r={pos.radius} />
            </clipPath>
          );
        })}
      </defs>

      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="transparent" />

      {/* Edges */}
      {edges.map((edge) => {
        const postPos = postPositions.get(edge.postSlug);
        const catPos = categoryPositions.get(edge.categoryId);
        if (!postPos || !catPos) return null;

        const visible = edgeIsVisible(edge);
        const edgeIsDraft = draftSet.has(edge.postSlug);
        return (
          <line
            key={edge.key}
            x1={catPos.x}
            y1={catPos.y}
            x2={postPos.x}
            y2={postPos.y}
            stroke="var(--muted)"
            strokeWidth={visible ? 1.4 : 1}
            strokeDasharray={edgeIsDraft ? "4 3" : undefined}
            opacity={visible ? 0.38 : 0.12}
          />
        );
      })}

      {/* Category nodes */}
      {categories.map((category) => {
        const point = categoryPositions.get(category.id);
        if (!point) return null;

        const visible = categoryIsVisible(category.id);
        const isFocused =
          activeNode?.type === "category" &&
          activeNode.id === category.id;
        const isPinned =
          pinnedNode?.type === "category" &&
          pinnedNode.id === category.id;
        return (
          <g
            key={category.id}
            data-clickable
            className="cursor-pointer"
            onMouseEnter={() =>
              setFocusedNode({ type: "category", id: category.id })
            }
            onMouseLeave={() => setFocusedNode(null)}
            onClick={(e) => {
              e.preventDefault();
              setPinnedNode(
                isPinned
                  ? null
                  : { type: "category", id: category.id },
              );
            }}
          >
            <title>{`${category.label} — ${category.description}`}</title>
            <circle
              cx={point.x}
              cy={point.y}
              r={isFocused ? 18 : CATEGORY_RADIUS}
              fill={
                isFocused ? "var(--foreground)" : "var(--background)"
              }
              stroke="var(--foreground)"
              strokeWidth={1.3}
              opacity={visible ? 1 : 0.28}
            />
            <text
              x={point.x}
              y={point.y + 33}
              textAnchor="middle"
              fontSize="12"
              fill="var(--muted)"
              opacity={visible ? 1 : 0.28}
            >
              {category.label}
            </text>
          </g>
        );
      })}

      {/* Post nodes */}
      {activePosts.map((post) => {
        const pos = postPositions.get(post.slug);
        if (!pos) return null;

        const visible = postIsVisible(post);
        const isDraft = draftSet.has(post.slug);
        const isFocused =
          activeNode?.type === "post" && activeNode.id === post.slug;
        const r = isFocused ? pos.radius + 1.5 : pos.radius;

        return (
          <a
            key={post.slug}
            href={withBasePath(`/blog/${post.slug}`)}
            onMouseEnter={() =>
              setFocusedNode({ type: "post", id: post.slug })
            }
            onMouseLeave={() => setFocusedNode(null)}
            onFocus={() =>
              setFocusedNode({ type: "post", id: post.slug })
            }
            onBlur={() => setFocusedNode(null)}
          >
            <title>{isDraft ? `${post.title} (draft)` : post.title}</title>
            {post.image ? (
              <>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill="var(--background)"
                  stroke={
                    isFocused ? "var(--foreground)" : "var(--rule)"
                  }
                  strokeWidth={isFocused ? 2 : 1.2}
                  strokeDasharray={isDraft ? "4 3" : undefined}
                  opacity={visible ? 1 : 0.24}
                />
                <image
                  href={post.image}
                  x={pos.x - pos.radius}
                  y={pos.y - pos.radius}
                  width={pos.radius * 2}
                  height={pos.radius * 2}
                  clipPath={`url(#clip-${post.slug})`}
                  preserveAspectRatio="xMidYMid slice"
                  opacity={visible ? 0.92 : 0.24}
                />
              </>
            ) : (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={
                  isFocused ? "var(--foreground)" : "var(--accent)"
                }
                stroke={isDraft ? "var(--muted)" : undefined}
                strokeWidth={isDraft ? 1.2 : undefined}
                strokeDasharray={isDraft ? "4 3" : undefined}
                opacity={visible ? 0.92 : 0.24}
              />
            )}
            {zoom >= POST_LABEL_ZOOM_THRESHOLD ? (
              <text
                x={pos.x}
                y={pos.y - (pos.radius + 7)}
                textAnchor="middle"
                fontSize={11 + normalizeSize(post.size)}
                fill="var(--foreground)"
                opacity={visible ? 1 : 0.28}
              >
                {post.title}
              </text>
            ) : null}
          </a>
        );
      })}
    </svg>
  );

  const isViewMoved = pan.x !== 0 || pan.y !== 0 || zoom !== 1;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex justify-end gap-4 px-4 py-3">
          {isViewMoved && (
            <button
              type="button"
              onClick={resetView}
              className="text-sm text-muted hover:text-foreground"
            >
              Reset view
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="text-sm text-muted hover:text-foreground"
          >
            Exit fullscreen (Esc)
          </button>
        </div>
        <div className="relative flex-1 px-4 pb-4">
          {hoverCard}
          {svgContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative left-1/2 right-1/2 -ml-[50vw] w-[100vw] space-y-4 sm:-ml-[40vw] sm:w-[80vw]"
    >
      {showDrafts ? (
        <p className="border border-rule px-4 py-2 text-sm text-muted">
          Draft preview mode — draft nodes shown with dashed outlines.
        </p>
      ) : null}

      <div className="relative overflow-hidden rounded border border-rule bg-background">
        {hoverCard}
        {svgContent}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          <span className="hidden sm:inline">Drag to pan, Shift+scroll to zoom.</span>
          <span className="sm:hidden">Drag to pan, pinch to zoom.</span>
          {" "}Click a category to pin focus. Zoom in to reveal post titles.
        </p>
        <div className="flex shrink-0 gap-4">
          {isViewMoved && (
            <button
              type="button"
              onClick={resetView}
              className="text-sm text-muted hover:text-foreground"
            >
              Reset view
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="text-sm text-muted hover:text-foreground"
          >
            Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
}
