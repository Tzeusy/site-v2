"use client";

import { useMemo, useState } from "react";
import { PostLink } from "@/components/ui/post-link";
import type { BlogPostSummary } from "@/lib/blog";

type TagOption = {
  id: string;
  label: string;
};

type BlogFilterProps = {
  posts: BlogPostSummary[];
  tags: TagOption[];
};

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

export function BlogFilter({ posts, tags }: BlogFilterProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return posts;

    const selectedSet = new Set(selectedTags);
    return posts.filter((post) =>
      post.tags.some((tag) => selectedSet.has(normalizeTag(tag))),
    );
  }, [posts, selectedTags]);

  const hasSelection = selectedTags.length > 0;

  function toggleTag(tagId: string) {
    setSelectedTags((current) =>
      current.includes(tagId)
        ? current.filter((tag) => tag !== tagId)
        : [...current, tagId],
    );
  }

  function clearTags() {
    setSelectedTags([]);
  }

  return (
    <div className="space-y-6">
      {tags.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-sm uppercase tracking-[0.08em] text-accent">
              Categories
            </span>
            <span className="text-muted">
              {hasSelection
                ? `Showing ${filteredPosts.length} of ${posts.length}`
                : `${posts.length} essays`}
            </span>
            {hasSelection ? (
              <button
                type="button"
                onClick={clearTags}
                className="text-muted hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isActive = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    isActive
                      ? "border-foreground bg-foreground/[0.06] text-foreground"
                      : "border-rule text-muted"
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {filteredPosts.length > 0 ? (
        <ol>
          {filteredPosts.map((post) => (
            <PostLink
              key={post.slug}
              slug={post.slug}
              title={post.title}
              date={post.date}
              readingTime={post.readingTime}
            />
          ))}
        </ol>
      ) : (
        <p className="text-muted">No essays match those categories.</p>
      )}
    </div>
  );
}
