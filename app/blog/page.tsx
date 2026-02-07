import type { Metadata } from "next";
import { BlogFilter } from "@/components/ui/blog-filter";
import { getPublishedPostSummaries } from "@/lib/blog";
import type { BlogPostSummary } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Long-form essays on reliability, systems, and software practice.",
};

function collectTagOptions(posts: BlogPostSummary[]) {
  const tagMap = new Map<string, string>();

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      const trimmedTag = tag.trim();
      if (!trimmedTag) return;

      const key = trimmedTag.toLowerCase();
      if (!tagMap.has(key)) {
        tagMap.set(key, trimmedTag);
      }
    });
  });

  return Array.from(tagMap.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );
}

export default async function BlogIndexPage() {
  const posts = await getPublishedPostSummaries();
  const tags = collectTagOptions(posts);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Blog</p>
        <h1 className="text-4xl sm:text-5xl">Table of contents</h1>
      </header>

      {posts.length > 0 ? (
        <BlogFilter posts={posts} tags={tags} />
      ) : (
        <p className="text-muted">No published essays yet.</p>
      )}
    </section>
  );
}
