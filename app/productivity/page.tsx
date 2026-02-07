import type { Metadata } from "next";
import {
  ProductivityGraph,
  type ProductivityGraphCategory,
  type ProductivityGraphPost,
} from "@/components/productivity/productivity-graph";
import {
  getPostSize,
  getPublishedPostSummaries,
  isActivePost,
} from "@/lib/blog";
import {
  normalizeProductivityKey,
  productivityCategories,
  productivityCategoryKeyMap,
} from "@/lib/productivity-categories";

export const metadata: Metadata = {
  title: "Productivity",
  description:
    "An evolving map of active productivity notes across tools, infrastructure, and engineering workflows.",
};

function buildProductivityGraphCategories(): ProductivityGraphCategory[] {
  return productivityCategories.map((category) => ({
    id: normalizeProductivityKey(category.id),
    label: category.label,
  }));
}

export default async function ProductivityPage() {
  const graphCategories = buildProductivityGraphCategories();
  const allPosts = await getPublishedPostSummaries();
  const graphPosts: ProductivityGraphPost[] = allPosts
    .filter((post) => isActivePost(post))
    .map((post) => {
      const linkedCategoryIds = Array.from(
        new Set(
          post.tags
            .map((tag) => normalizeProductivityKey(tag))
            .flatMap((tag) => {
              const category = productivityCategoryKeyMap.get(tag);
              return category ? [normalizeProductivityKey(category.id)] : [];
            }),
        ),
      );

      return {
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        categories: linkedCategoryIds,
        size: getPostSize(post),
      };
    });

  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Productivity</p>
        <h1 className="text-balance text-4xl sm:text-5xl">How the pieces connect.</h1>
        <p className="max-w-[65ch] text-muted">
          This graph shows currently active productivity notes. Category nodes are
          fixed and post nodes are generated from blog tags. Mark a post with{" "}
          <code className="text-foreground">active</code> to include it, and{" "}
          <code className="text-foreground">size-1</code> to{" "}
          <code className="text-foreground">size-5</code> to tune node weight.
        </p>
      </header>

      <ProductivityGraph categories={graphCategories} posts={graphPosts} />

      {graphPosts.length === 0 ? (
        <p className="text-muted">
          No active productivity posts yet. Add the{" "}
          <code className="text-foreground">active</code> tag to a post to include it
          here.
        </p>
      ) : null}
    </article>
  );
}
