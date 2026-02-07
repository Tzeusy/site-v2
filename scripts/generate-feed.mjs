import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SITE_URL = "https://tze.how";
const SITE_TITLE = "Tze How";
const SITE_DESCRIPTION =
  "Long-form essays on reliability, systems, and software practice.";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const FEED_PATH = path.join(process.cwd(), "public/feed.xml");

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeDate(rawDate) {
  if (rawDate instanceof Date) {
    return rawDate.toISOString().slice(0, 10);
  }
  if (typeof rawDate === "string") {
    return rawDate;
  }
  return "1970-01-01";
}

function normalizeFrontmatter(data, slug) {
  return {
    slug,
    title: typeof data.title === "string" ? data.title : "Untitled post",
    summary: typeof data.summary === "string" ? data.summary : "",
    date: normalizeDate(data.date),
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : [],
  };
}

function hasTag(tags, tag) {
  const normalizedTag = tag.trim().toLowerCase();
  return tags.some((item) => item.trim().toLowerCase() === normalizedTag);
}

async function getFeedPosts() {
  const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
  const postFiles = entries
    .filter((entry) => entry.isFile() && /\.mdx?$/u.test(entry.name))
    .map((entry) => ({
      slug: entry.name.replace(/\.mdx?$/u, ""),
      filePath: path.join(BLOG_DIR, entry.name),
    }));

  const posts = await Promise.all(
    postFiles.map(async ({ slug, filePath }) => {
      const source = await fs.readFile(filePath, "utf8");
      const { data } = matter(source);
      return normalizeFrontmatter(data, slug);
    }),
  );

  return posts
    .filter((post) => !hasTag(post.tags, "draft"))
    .sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
}

function renderFeedXml(posts) {
  const now = new Date().toUTCString();
  const latestPostDate = posts.length > 0 ? new Date(posts[0].date).toUTCString() : now;

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(post.summary)}</description>`,
        `      <pubDate>${new Date(post.date).toUTCString()}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(SITE_TITLE)}</title>`,
    `    <link>${SITE_URL}</link>`,
    `    <description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    "    <language>en-us</language>",
    `    <lastBuildDate>${latestPostDate}</lastBuildDate>`,
    "    <generator>site-v2 feed generator</generator>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

async function main() {
  const posts = await getFeedPosts();
  const xml = renderFeedXml(posts);
  await fs.writeFile(FEED_PATH, xml, "utf8");
}

await main();
