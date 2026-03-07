# Blog Taxonomy Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the blog taxonomy into a low-cardinality primary `category` and high-cardinality freeform `tags`, while relabeling the existing blog index UI accordingly.

**Architecture:** Add a first-class `category` field to the shared blog frontmatter parser, thread it through blog consumers, and backfill every post so the content model is explicit. The blog index will expose `Categories` and `Tags` as separate filters, and individual post pages will surface the primary category distinctly from the tag list.

**Tech Stack:** Next.js App Router, TypeScript, MDX frontmatter via `gray-matter`

---

### Task 1: Define the shared taxonomy model

**Files:**
- Modify: `lib/blog.ts`
- Modify: `scripts/generate-feed.mjs`

**Steps:**
1. Add a `BlogCategory` union with the canonical values `finance`, `programming`, `personal`, and `other`.
2. Extend normalized blog frontmatter to include `category`.
3. Add normalization helpers and labels so downstream UI can render title-cased category names consistently.
4. Mirror the same normalization in the feed script so content parsing stays aligned.

### Task 2: Update blog consumers

**Files:**
- Modify: `app/blog/page.tsx`
- Modify: `components/ui/blog-filter.tsx`
- Modify: `app/blog/[slug]/page.tsx`
- Modify: `lib/search.ts`

**Steps:**
1. Build separate category and tag filter options for the blog index.
2. Rename the current filter label from `Categories` to `Tags`.
3. Add a dedicated category filter using the new frontmatter field.
4. Show the primary category on individual post pages and use it to improve related-post ranking.
5. Include the category in search metadata so blog posts remain discoverable by taxonomy.

### Task 3: Backfill all posts

**Files:**
- Modify: `content/blog/**/index.mdx`

**Steps:**
1. Add a `category:` line to every blog post frontmatter block.
2. Use `programming`, `finance`, `personal`, or `other` based on the post's dominant subject.
3. Preserve existing dates, titles, summaries, and tags exactly.

### Task 4: Verify and hand off

**Files:**
- Modify: `AGENTS.md` if a durable repository note emerges

**Steps:**
1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Inspect the final diff for taxonomy consistency.
5. Commit and push if repository policy allows it.
