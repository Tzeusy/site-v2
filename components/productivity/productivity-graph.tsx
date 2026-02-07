"use client";

import { useMemo, useState } from "react";
import { withBasePath } from "@/lib/base-path";

export type ProductivityGraphCategory = {
  id: string;
  label: string;
};

export type ProductivityGraphPost = {
  slug: string;
  title: string;
  summary: string;
  size: number;
  categories: string[];
};

type ProductivityGraphProps = {
  categories: ProductivityGraphCategory[];
  posts: ProductivityGraphPost[];
};

type FocusedNode =
  | { type: "category"; id: string }
  | { type: "post"; id: string }
  | null;

type Point = {
  x: number;
  y: number;
};

type PositionedPost = ProductivityGraphPost & {
  x: number;
  y: number;
  radius: number;
  anchorX: number;
  anchorY: number;
};

const WIDTH = 980;
const HEIGHT = 620;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const CATEGORY_RING_RADIUS_X = WIDTH * 0.4;
const CATEGORY_RING_RADIUS_Y = HEIGHT * 0.38;
const MARGIN = 42;

function hashString(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSize(size: number) {
  return clamp(Number.isFinite(size) ? Math.round(size) : 2, 1, 5);
}

function radiusForSize(size: number) {
  return 8 + normalizeSize(size) * 2;
}

function categoryPoint(index: number, total: number): Point {
  const angle = (-Math.PI / 2) + (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    x: CENTER_X + Math.cos(angle) * CATEGORY_RING_RADIUS_X,
    y: CENTER_Y + Math.sin(angle) * CATEGORY_RING_RADIUS_Y,
  };
}

function computePostLayout(
  posts: ProductivityGraphPost[],
  categoryPositions: Map<string, Point>,
): PositionedPost[] {
  const initial = posts.map((post) => {
    const linkedPoints = post.categories
      .map((categoryId) => categoryPositions.get(categoryId))
      .filter((point): point is Point => Boolean(point));

    const anchor =
      linkedPoints.length > 0
        ? linkedPoints.reduce(
            (acc, point) => ({
              x: acc.x + point.x / linkedPoints.length,
              y: acc.y + point.y / linkedPoints.length,
            }),
            { x: 0, y: 0 },
          )
        : { x: CENTER_X, y: CENTER_Y };

    const hash = hashString(post.slug);
    const angle = ((hash % 360) * Math.PI) / 180;
    const offset = 16 + (hash % 34);
    const radius = radiusForSize(post.size);

    return {
      ...post,
      anchorX: anchor.x,
      anchorY: anchor.y,
      x: clamp(anchor.x + Math.cos(angle) * offset, MARGIN, WIDTH - MARGIN),
      y: clamp(anchor.y + Math.sin(angle) * offset, MARGIN, HEIGHT - MARGIN),
      radius,
    };
  });

  for (let step = 0; step < 24; step += 1) {
    for (let left = 0; left < initial.length; left += 1) {
      for (let right = left + 1; right < initial.length; right += 1) {
        const a = initial[left];
        const b = initial[right];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const minDistance = a.radius + b.radius + 18;
        if (distance >= minDistance) {
          continue;
        }

        const push = (minDistance - distance) / 2;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x = clamp(a.x - nx * push, MARGIN, WIDTH - MARGIN);
        a.y = clamp(a.y - ny * push, MARGIN, HEIGHT - MARGIN);
        b.x = clamp(b.x + nx * push, MARGIN, WIDTH - MARGIN);
        b.y = clamp(b.y + ny * push, MARGIN, HEIGHT - MARGIN);
      }
    }

    for (const node of initial) {
      node.x = clamp(node.x * 0.92 + node.anchorX * 0.08, MARGIN, WIDTH - MARGIN);
      node.y = clamp(node.y * 0.92 + node.anchorY * 0.08, MARGIN, HEIGHT - MARGIN);
    }
  }

  return initial;
}

export function ProductivityGraph({ categories, posts }: ProductivityGraphProps) {
  const [focusedNode, setFocusedNode] = useState<FocusedNode>(null);

  const categoryPositions = useMemo(
    () =>
      new Map(
        categories.map((category, index) => [
          category.id,
          categoryPoint(index, categories.length),
        ]),
      ),
    [categories],
  );

  const positionedPosts = useMemo(
    () => computePostLayout(posts, categoryPositions),
    [posts, categoryPositions],
  );

  const edges = useMemo(
    () =>
      positionedPosts.flatMap((post) =>
        post.categories
          .filter((categoryId) => categoryPositions.has(categoryId))
          .map((categoryId) => ({
            key: `${post.slug}__${categoryId}`,
            postSlug: post.slug,
            categoryId,
          })),
      ),
    [categoryPositions, positionedPosts],
  );

  const postsBySlug = useMemo(
    () => new Map(positionedPosts.map((post) => [post.slug, post])),
    [positionedPosts],
  );

  function edgeIsVisible(edge: { postSlug: string; categoryId: string }) {
    if (!focusedNode) {
      return true;
    }
    if (focusedNode.type === "post") {
      return edge.postSlug === focusedNode.id;
    }
    return edge.categoryId === focusedNode.id;
  }

  function categoryIsVisible(categoryId: string) {
    if (!focusedNode) {
      return true;
    }
    if (focusedNode.type === "category") {
      return categoryId === focusedNode.id;
    }
    return positionedPosts
      .find((post) => post.slug === focusedNode.id)
      ?.categories.includes(categoryId);
  }

  function postIsVisible(post: ProductivityGraphPost) {
    if (!focusedNode) {
      return true;
    }
    if (focusedNode.type === "post") {
      return post.slug === focusedNode.id;
    }
    return post.categories.includes(focusedNode.id);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded border border-rule bg-background">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[560px] w-full min-w-[720px]"
          role="img"
          aria-label="Productivity graph connecting categories and active posts"
        >
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="transparent" />

          {edges.map((edge) => {
            const post = postsBySlug.get(edge.postSlug);
            const categoryPointValue = categoryPositions.get(edge.categoryId);
            if (!post || !categoryPointValue) {
              return null;
            }

            const visible = edgeIsVisible(edge);
            return (
              <line
                key={edge.key}
                x1={categoryPointValue.x}
                y1={categoryPointValue.y}
                x2={post.x}
                y2={post.y}
                stroke="var(--rule)"
                strokeWidth={visible ? 1.6 : 1}
                opacity={visible ? 1 : 0.22}
              />
            );
          })}

          {categories.map((category) => {
            const point = categoryPositions.get(category.id);
            if (!point) {
              return null;
            }

            const visible = categoryIsVisible(category.id);
            const isFocused =
              focusedNode?.type === "category" && focusedNode.id === category.id;
            return (
              <g
                key={category.id}
                onMouseEnter={() => setFocusedNode({ type: "category", id: category.id })}
                onMouseLeave={() => setFocusedNode(null)}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isFocused ? 18 : 15}
                  fill={isFocused ? "var(--foreground)" : "var(--background)"}
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

          {positionedPosts.map((post) => {
            const visible = postIsVisible(post);
            const isFocused = focusedNode?.type === "post" && focusedNode.id === post.slug;
            return (
              <a
                key={post.slug}
                href={withBasePath(`/blog/${post.slug}`)}
                onMouseEnter={() => setFocusedNode({ type: "post", id: post.slug })}
                onMouseLeave={() => setFocusedNode(null)}
                onFocus={() => setFocusedNode({ type: "post", id: post.slug })}
                onBlur={() => setFocusedNode(null)}
              >
                <title>{post.title}</title>
                <circle
                  cx={post.x}
                  cy={post.y}
                  r={isFocused ? post.radius + 1.5 : post.radius}
                  fill={isFocused ? "var(--foreground)" : "var(--accent)"}
                  opacity={visible ? 0.92 : 0.24}
                />
                <text
                  x={post.x}
                  y={post.y - (post.radius + 7)}
                  textAnchor="middle"
                  fontSize={11 + normalizeSize(post.size)}
                  fill="var(--foreground)"
                  opacity={visible ? 1 : 0.28}
                >
                  {post.title}
                </text>
              </a>
            );
          })}
        </svg>
      </div>

      <p className="text-sm text-muted">
        Active productivity notes are shown as circles. Hover or focus a node to
        isolate its
        relationships.
      </p>
    </div>
  );
}
