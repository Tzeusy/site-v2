"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

type ViewMode = "board" | "matrix";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const toHex = (n: number) => {
    const v = Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
    return v;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildCategoryColorMap(categories: ProductivityGraphCategory[]) {
  const map = new Map<string, string>();
  categories.forEach((category, index) => {
    const hue = (index * 137.508 + 22) % 360;
    map.set(category.id, hslToHex(hue, 44, 62));
  });
  return map;
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function scoreForPost(post: ProductivityGraphPost) {
  return clamp(Number.isFinite(post.size) ? Math.round(post.size) : 2, 1, 5);
}

export function ProductivityGraph({
  categories,
  posts,
  allPosts,
  draftSlugs,
}: ProductivityGraphProps) {
  const searchParams = useSearchParams();
  const showDrafts = searchParams.get("drafts") === "true";
  const initialViewMode: ViewMode =
    searchParams.get("view") === "matrix" ? "matrix" : "board";
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [query, setQuery] = useState("");

  const activePosts = showDrafts ? allPosts : posts;
  const draftSet = useMemo(() => new Set(draftSlugs), [draftSlugs]);
  const categoryColorMap = useMemo(() => buildCategoryColorMap(categories), [categories]);
  const categoryLabelMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.label])),
    [categories],
  );

  const normalizedQuery = normalizeQuery(query);

  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return activePosts;

    return activePosts.filter((post) => {
      const haystack = [
        post.title,
        post.summary,
        ...post.categories.map((categoryId) => categoryLabelMap.get(categoryId) ?? categoryId),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activePosts, categoryLabelMap, normalizedQuery]);

  const categorySections = useMemo(() => {
    return categories.map((category) => {
      const postsForCategory = filteredPosts
        .filter((post) => post.categories.includes(category.id))
        .sort(
          (left, right) =>
            scoreForPost(right) - scoreForPost(left) || left.title.localeCompare(right.title),
        );

      return {
        category,
        posts: postsForCategory,
      };
    });
  }, [categories, filteredPosts]);

  const usedCategoryCount = categorySections.filter((section) => section.posts.length > 0).length;

  const crossCategoryPosts = useMemo(
    () =>
      filteredPosts
        .filter((post) => post.categories.length > 1)
        .sort(
          (left, right) =>
            right.categories.length - left.categories.length || left.title.localeCompare(right.title),
        ),
    [filteredPosts],
  );

  const matrixPosts = useMemo(
    () => [...filteredPosts].sort((left, right) => left.title.localeCompare(right.title)),
    [filteredPosts],
  );

  return (
    <div className="relative left-1/2 w-[96vw] -translate-x-1/2 space-y-6 px-4 sm:px-6 lg:px-8">
      {showDrafts ? (
        <p className="rounded-md border border-rule px-4 py-2 text-sm text-muted">
          Draft preview mode enabled. Draft posts are included in this view.
        </p>
      ) : null}

      <section
        className="overflow-hidden rounded-2xl border border-rule"
        style={{
          background:
            "linear-gradient(132deg, color-mix(in oklab, var(--background) 91%, #c4b5fd 9%), color-mix(in oklab, var(--background) 90%, #7dd3fc 10%) 48%, color-mix(in oklab, var(--background) 93%, #86efac 7%))",
        }}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">Productivity map</p>
            <h2 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">
              Category-first relationship board
            </h2>
            <p className="max-w-[72ch] text-sm text-muted sm:text-[0.95rem]">
              Posts are grouped by category, with cross-category tags kept visible on every card so
              connections stay obvious without visual clutter. Switch to matrix view for a compact
              category-to-post map.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-rule/80 bg-background/75 px-3 py-2">
              <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted">Visible posts</p>
              <p className="text-lg font-semibold text-foreground">{filteredPosts.length}</p>
            </div>
            <div className="rounded-xl border border-rule/80 bg-background/75 px-3 py-2">
              <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted">Active categories</p>
              <p className="text-lg font-semibold text-foreground">{usedCategoryCount}</p>
            </div>
            <div className="rounded-xl border border-rule/80 bg-background/75 px-3 py-2">
              <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted">Cross-category posts</p>
              <p className="text-lg font-semibold text-foreground">{crossCategoryPosts.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2" role="tablist" aria-label="Productivity view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "board"}
              onClick={() => setViewMode("board")}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                viewMode === "board"
                  ? "border-foreground bg-foreground text-background"
                  : "border-rule bg-background/80 text-foreground hover:bg-background",
              ].join(" ")}
            >
              Board view
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "matrix"}
              onClick={() => setViewMode("matrix")}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                viewMode === "matrix"
                  ? "border-foreground bg-foreground text-background"
                  : "border-rule bg-background/80 text-foreground hover:bg-background",
              ].join(" ")}
            >
              Matrix view
            </button>
          </div>

          <label className="block">
            <span className="sr-only">Filter posts</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter posts or categories..."
              className="w-full rounded-xl border border-rule bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-foreground focus:outline-none"
            />
          </label>

          {viewMode === "board" ? (
            <nav className="flex flex-wrap gap-2" aria-label="Category quick links">
              {categorySections.map(({ category, posts: postsForCategory }) => {
                const color = categoryColorMap.get(category.id) ?? "#64748b";
                const hasPosts = postsForCategory.length > 0;
                return (
                  <a
                    key={category.id}
                    href={`#category-${category.id.replace(/\s+/gu, "-")}`}
                    className="inline-flex items-center gap-2 rounded-full border border-rule bg-background/80 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-background"
                    style={{ opacity: hasPosts ? 1 : 0.58 }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span>{category.label}</span>
                    <span className="text-muted">{postsForCategory.length}</span>
                  </a>
                );
              })}
            </nav>
          ) : null}
        </div>
      </section>

      {viewMode === "board" ? (
        <>
          {crossCategoryPosts.length > 0 ? (
            <section className="space-y-3 rounded-2xl border border-rule bg-background p-4 sm:p-5">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Cross-category highlights</h3>
                <p className="text-sm text-muted">
                  These posts connect multiple parts of the setup and are the best entry points.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {crossCategoryPosts.map((post) => (
                  <article
                    key={`cross-${post.slug}`}
                    className="group rounded-xl border border-rule bg-background p-3 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                      <Link href={withBasePath(`/blog/${post.slug}`)} className="hover:underline">
                        {post.title}
                      </Link>
                    </p>
                    {post.summary ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{post.summary}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {post.categories.map((categoryId) => {
                        const color = categoryColorMap.get(categoryId) ?? "#64748b";
                        return (
                          <span
                            key={`${post.slug}-${categoryId}-cross`}
                            className="rounded-full border px-2 py-0.5 text-[11px]"
                            style={{
                              borderColor: `color-mix(in oklab, ${color} 55%, var(--rule) 45%)`,
                              background: `color-mix(in oklab, ${color} 16%, var(--background) 84%)`,
                            }}
                          >
                            {categoryLabelMap.get(categoryId) ?? categoryId}
                          </span>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {categorySections.map(({ category, posts: postsForCategory }) => {
              const color = categoryColorMap.get(category.id) ?? "#64748b";
              const sectionId = `category-${category.id.replace(/\s+/gu, "-")}`;

              return (
                <section
                  id={sectionId}
                  key={category.id}
                  className="rounded-2xl border border-rule bg-background p-4 sm:p-5"
                >
                  <header className="mb-4 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        {category.label}
                      </h3>
                      <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-muted">
                        {postsForCategory.length}
                      </span>
                    </div>
                    <p className="text-sm text-muted">{category.description}</p>
                  </header>

                  {postsForCategory.length > 0 ? (
                    <div className="space-y-3">
                      {postsForCategory.map((post) => {
                        const isDraft = draftSet.has(post.slug);
                        return (
                          <article
                            key={`${category.id}-${post.slug}`}
                            className="group rounded-xl border border-rule bg-background p-3 transition-colors hover:border-foreground/25"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                              {post.image ? (
                                <Link
                                  href={withBasePath(`/blog/${post.slug}`)}
                                  className="relative block h-20 w-full shrink-0 overflow-hidden rounded-md sm:w-32"
                                >
                                  <Image
                                    src={withBasePath(post.image)}
                                    alt=""
                                    fill
                                    unoptimized
                                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    sizes="(min-width: 640px) 128px, 100vw"
                                  />
                                </Link>
                              ) : null}

                              <div className="min-w-0 flex-1 space-y-1.5">
                                <p className="line-clamp-2 text-[0.98rem] font-medium leading-snug text-foreground">
                                  <Link href={withBasePath(`/blog/${post.slug}`)} className="hover:underline">
                                    {post.title}
                                  </Link>
                                  {isDraft ? (
                                    <span className="ml-2 rounded bg-rule px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                                      draft
                                    </span>
                                  ) : null}
                                </p>
                                {post.summary ? (
                                  <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                                    {post.summary}
                                  </p>
                                ) : null}

                                <div className="flex flex-wrap gap-1.5">
                                  {post.categories.map((categoryId) => {
                                    const categoryColor = categoryColorMap.get(categoryId) ?? "#64748b";
                                    return (
                                      <span
                                        key={`${post.slug}-${categoryId}`}
                                        className="rounded-full border px-2 py-0.5 text-[11px]"
                                        style={{
                                          borderColor: `color-mix(in oklab, ${categoryColor} 55%, var(--rule) 45%)`,
                                          background: `color-mix(in oklab, ${categoryColor} 16%, var(--background) 84%)`,
                                        }}
                                      >
                                        {categoryLabelMap.get(categoryId) ?? categoryId}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-rule px-3 py-4 text-sm text-muted">
                      No matching posts in this category yet.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <section className="rounded-2xl border border-rule bg-background p-4 sm:p-5">
          <div className="mb-3 space-y-1">
            <h3 className="text-base font-semibold text-foreground">Category-to-post matrix</h3>
            <p className="text-sm text-muted">
              Rows are categories, columns are posts. Filled cells show category membership.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-44 bg-background px-3 py-2 text-left font-medium text-foreground">
                    Category
                  </th>
                  {matrixPosts.map((post) => (
                    <th
                      key={`matrix-head-${post.slug}`}
                      className="min-w-44 max-w-44 border-l border-rule px-3 py-2 text-left align-bottom font-medium text-foreground"
                    >
                      <Link href={withBasePath(`/blog/${post.slug}`)} className="line-clamp-2 hover:underline">
                        {post.title}
                      </Link>
                      {draftSet.has(post.slug) ? (
                        <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted">
                          draft
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorySections
                  .filter(({ posts: postsForCategory }) => postsForCategory.length > 0)
                  .map(({ category }) => {
                    const categoryColor = categoryColorMap.get(category.id) ?? "#64748b";
                    return (
                      <tr key={`matrix-row-${category.id}`} className="border-t border-rule">
                        <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-normal text-foreground">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: categoryColor }}
                              aria-hidden
                            />
                            {category.label}
                          </span>
                        </th>
                        {matrixPosts.map((post) => {
                          const isLinked = post.categories.includes(category.id);
                          return (
                            <td
                              key={`matrix-cell-${category.id}-${post.slug}`}
                              className="border-l border-rule px-3 py-2"
                            >
                              {isLinked ? (
                                <span
                                  className="block h-6 w-full rounded-sm"
                                  style={{
                                    background: `color-mix(in oklab, ${categoryColor} 22%, var(--background) 78%)`,
                                  }}
                                  aria-label={`${category.label} linked to ${post.title}`}
                                />
                              ) : (
                                <span className="block h-6 w-full rounded-sm bg-background" aria-hidden />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {filteredPosts.length === 0 ? (
        <p className="rounded-xl border border-rule px-4 py-3 text-sm text-muted">
          No posts matched that filter.
        </p>
      ) : null}
    </div>
  );
}
