import type { Metadata } from "next";
import {
  ProductivityGraph,
  type ProductivityGraphCategory,
  type ProductivityGraphPost,
} from "@/components/productivity/productivity-graph";
import { Suspense } from "react";
import {
  getAllPostSummaries,
  getPostSize,
  getPostThumbnail,
  isDraftPost,
} from "@/lib/blog";
import { withBasePath } from "@/lib/base-path";
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
    description: category.description,
  }));
}

function isInfraPost(post: { tags: string[] }) {
  const hasInfraTag = post.tags.some(
    (tag) => tag.trim().toLowerCase() === "infra",
  );
  const hasCategory = post.tags.some((tag) =>
    productivityCategoryKeyMap.has(normalizeProductivityKey(tag)),
  );
  return hasInfraTag && hasCategory;
}

async function toGraphPost(post: {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
}): Promise<ProductivityGraphPost> {
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

  const thumbnail = await getPostThumbnail(post.slug);

  return {
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    categories: linkedCategoryIds,
    size: getPostSize(post),
    image: thumbnail ? withBasePath(thumbnail) : undefined,
  };
}

export default async function ProductivityPage() {
  const graphCategories = buildProductivityGraphCategories();
  const allPosts = await getAllPostSummaries();

  const allInfraPosts = allPosts.filter(isInfraPost);
  const publishedInfraPosts = allInfraPosts.filter((p) => !isDraftPost(p));
  const draftSlugs = allInfraPosts
    .filter((p) => isDraftPost(p))
    .map((p) => p.slug);

  const publishedGraphPosts = await Promise.all(publishedInfraPosts.map(toGraphPost));
  const allGraphPosts = await Promise.all(allInfraPosts.map(toGraphPost));

  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Productivity</p>
        <h1 className="text-balance text-4xl sm:text-5xl">How the pieces connect.</h1>
        <p className="max-w-[65ch] text-muted">
          This graph shows various elements in my personal setup for my development workflows
          {/* Mark a post with{" "}
          <code className="text-foreground">active</code> to include it, and{" "}
          <code className="text-foreground">size-1</code> to{" "}
          <code className="text-foreground">size-5</code> to tune node weight. */}
        </p>
      </header>

      <Suspense>
        <ProductivityGraph
          categories={graphCategories}
          posts={publishedGraphPosts}
          allPosts={allGraphPosts}
          draftSlugs={draftSlugs}
        />
      </Suspense>

      {allGraphPosts.length === 0 ? (
        <p className="text-muted">
          No productivity posts yet. Tag a post with{" "}
          <code className="text-foreground">infra</code> and a category (e.g.{" "}
          <code className="text-foreground">homelab</code>) to include it here.
        </p>
      ) : null}
    </article>
  );
}
