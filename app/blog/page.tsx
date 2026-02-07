import type { Metadata } from "next";
import { PostLink } from "@/components/ui/post-link";
import { getAllPostSummaries } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Long-form essays on reliability, systems, and software practice.",
};

export default async function BlogIndexPage() {
  const posts = await getAllPostSummaries();

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Blog</p>
        <h1 className="text-4xl sm:text-5xl">Table of contents</h1>
      </header>

      {posts.length > 0 ? (
        <ol>
          {posts.map((post) => (
            <PostLink
              key={post.slug}
              slug={post.slug}
              title={post.title}
              date={post.date}
            />
          ))}
        </ol>
      ) : (
        <p className="text-muted">No published essays yet.</p>
      )}
    </section>
  );
}
