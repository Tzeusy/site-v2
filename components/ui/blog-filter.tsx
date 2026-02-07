"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return posts;

    const selectedSet = new Set(selectedTags);
    return posts.filter((post) =>
      post.tags.some((tag) => selectedSet.has(normalizeTag(tag))),
    );
  }, [posts, selectedTags]);

  const hasSelection = selectedTags.length > 0;

  const visibleTags = useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.trim().toLowerCase();
    return tags.filter((tag) => tag.label.toLowerCase().includes(q));
  }, [tags, search]);

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="space-y-6">
      {tags.length > 0 ? (
        <div ref={dropdownRef} className="relative">
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() =>
                setOpen((prev) => {
                  const next = !prev;
                  if (!next) {
                    setSearch("");
                  }
                  return next;
                })
              }
              className="flex items-center gap-1.5 text-sm uppercase tracking-[0.08em] text-accent"
            >
              Categories
              <svg
                className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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

          {open ? (
            <div className="absolute left-0 z-10 mt-2 max-w-[min(400px,calc(100vw-3rem))] rounded border border-rule bg-background shadow-sm">
              <div className="border-b border-rule px-3 py-2">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter categories..."
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                />
              </div>
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto p-3">
                {visibleTags.length > 0 ? (
                  visibleTags.map((tag) => {
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
                  })
                ) : (
                  <span className="text-sm text-muted">No matching categories.</span>
                )}
              </div>
            </div>
          ) : null}
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
