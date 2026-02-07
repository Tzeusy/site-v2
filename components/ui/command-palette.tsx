"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/lib/search";

const TYPE_LABELS: Record<SearchEntry["type"], string> = {
  page: "Page",
  post: "Post",
  project: "Project",
};

function matchScore(entry: SearchEntry, query: string): number {
  const q = query.toLowerCase();
  const title = entry.title.toLowerCase();

  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;

  const desc = entry.description?.toLowerCase() ?? "";
  if (desc.includes(q)) return 40;

  const tags = entry.tags?.join(" ").toLowerCase() ?? "";
  if (tags.includes(q)) return 30;

  return 0;
}

export function CommandPalette({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    if (!query.trim()) return entries.slice(0, 10);

    return entries
      .map((entry) => ({ entry, score: matchScore(entry, query.trim()) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ entry }) => entry);
  }, [entries, query]);

  const safeActiveIndex =
    results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  const closeAndReset = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      closeAndReset();
      router.push(href);
    },
    [closeAndReset, router],
  );

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        if (!open) {
          setQuery("");
          setActiveIndex(0);
        }
      }
      if (e.key === "Escape" && open) {
        closeAndReset();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeAndReset]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.children[
      safeActiveIndex
    ] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex, results]);

  function handleInputKeyDown(e: React.KeyboardEvent) {
    const lastIndex = Math.max(results.length - 1, 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(Math.max(i, 0) + 1, lastIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(Math.min(i, lastIndex) - 1, 0));
    } else if (e.key === "Enter" && results[safeActiveIndex]) {
      e.preventDefault();
      navigate(results[safeActiveIndex].href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={closeAndReset}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded border border-rule bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
          <svg
            className="h-4 w-4 shrink-0 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent font-sans text-sm text-foreground placeholder:text-muted outline-none"
            placeholder="Search pages, posts, projects..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              results[safeActiveIndex]
                ? `command-palette-item-${safeActiveIndex}`
                : undefined
            }
          />
          <kbd className="hidden rounded border border-rule px-1.5 py-0.5 font-sans text-xs text-muted sm:inline-block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="max-h-[min(320px,50vh)] overflow-y-auto p-2"
        >
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted">
              No results found.
            </div>
          )}
          {results.map((entry, i) => (
            <div
              key={entry.href}
              id={`command-palette-item-${i}`}
              role="option"
              aria-selected={i === safeActiveIndex}
              className={`flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm ${
                i === safeActiveIndex
                  ? "bg-foreground/[0.06]"
                  : ""
              }`}
              onClick={() => navigate(entry.href)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="shrink-0 rounded bg-foreground/[0.06] px-1.5 py-0.5 font-sans text-xs text-muted">
                {TYPE_LABELS[entry.type]}
              </span>
              <span className="min-w-0 truncate text-foreground">
                {entry.title}
              </span>
              {entry.description && (
                <span className="ml-auto hidden shrink-0 truncate text-xs text-muted sm:block sm:max-w-[200px]">
                  {entry.description}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
