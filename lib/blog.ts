import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import readingTime from "reading-time";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { withBasePath } from "@/lib/base-path";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export type BlogFrontmatter = {
  title: string;
  date: string;
  summary: string;
  tags: string[];
};

export type BlogPostSummary = BlogFrontmatter & {
  slug: string;
  readingTime: string;
};

export type BlogHeading = {
  level: 2 | 3;
  text: string;
  id: string;
};

export type BlogPost = BlogPostSummary & {
  content: React.ReactElement;
  headings: BlogHeading[];
};

type RawFrontmatter = {
  title?: unknown;
  date?: unknown;
  summary?: unknown;
  tags?: unknown;
};

type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const prettyCodeOptions = {
  theme: {
    dark: "github-dark",
    light: "github-light",
  },
};

function prefixRootRelativeUrls() {
  const urlAttributes = ["src", "href", "poster", "srcSet"] as const;

  function rewrite(value: unknown) {
    if (typeof value !== "string") {
      return value;
    }
    if (!value.startsWith("/")) {
      return value;
    }
    return withBasePath(value);
  }

  function visit(node: HastNode) {
    if (node.type === "element" && node.properties) {
      for (const attr of urlAttributes) {
        if (attr in node.properties) {
          node.properties[attr] = rewrite(node.properties[attr]);
        }
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child) => visit(child));
    }
  }

  return (tree: HastNode) => visit(tree);
}

function slugFromFileName(fileName: string) {
  return fileName.replace(/\.mdx?$/u, "");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/gu, "")
    .replace(/\s+/gu, "-");
}

function extractHeadings(source: string): BlogHeading[] {
  return source
    .split("\n")
    .map((line) => line.match(/^(##|###)\s+(.+)$/u))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      level: match[1] === "##" ? 2 : 3,
      text: match[2].trim(),
      id: slugify(match[2]),
    }));
}

function normalizeFrontmatter(frontmatter: RawFrontmatter) {
  const rawDate = frontmatter.date;
  const parsedDate =
    rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : typeof rawDate === "string"
        ? rawDate
        : new Date(0).toISOString().slice(0, 10);

  return {
    title:
      typeof frontmatter.title === "string"
        ? frontmatter.title
        : "Untitled post",
    date: parsedDate,
    summary: typeof frontmatter.summary === "string" ? frontmatter.summary : "",
    tags: Array.isArray(frontmatter.tags)
      ? frontmatter.tags.map((tag) => String(tag))
      : [],
  } satisfies BlogFrontmatter;
}

async function readPostFile(slug: string) {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    const isNotFound =
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT";
    if (isNotFound) {
      return null;
    }
    throw error;
  }
}

export async function getPostSlugs() {
  const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.mdx?$/u.test(entry.name))
    .map((entry) => slugFromFileName(entry.name));
}

export async function getAllPostSummaries(): Promise<BlogPostSummary[]> {
  const slugs = await getPostSlugs();
  const summaries = await Promise.all(
    slugs.map(async (slug) => {
      const source = await readPostFile(slug);
      if (!source) {
        return null;
      }
      const { data, content } = matter(source);
      const frontmatter = normalizeFrontmatter(data as RawFrontmatter);

      return {
        ...frontmatter,
        slug,
        readingTime: readingTime(content).text,
      };
    }),
  );

  return summaries
    .filter((summary): summary is BlogPostSummary => Boolean(summary))
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
}

export function filterPostSummariesByTag(
  posts: BlogPostSummary[],
  tag?: string,
) {
  if (!tag) {
    return posts;
  }

  return posts.filter((post) =>
    post.tags.some((postTag) => postTag.toLowerCase() === tag.toLowerCase()),
  );
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const source = await readPostFile(slug);
  if (!source) {
    return null;
  }

  const { content, data } = matter(source);
  const frontmatter = normalizeFrontmatter(data as RawFrontmatter);

  const compiled = await compileMDX<BlogFrontmatter>({
    source: content,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        rehypePlugins: [
          rehypeSlug,
          prefixRootRelativeUrls,
          [rehypePrettyCode, prettyCodeOptions],
        ],
      },
    },
    components: mdxComponents,
  });

  return {
    ...frontmatter,
    slug,
    content: compiled.content,
    headings: extractHeadings(content),
    readingTime: readingTime(content).text,
  };
}

export async function getAdjacentPosts(slug: string) {
  const posts = await getAllPostSummaries();
  const currentIndex = posts.findIndex((post) => post.slug === slug);

  return {
    previousPost: currentIndex >= 0 ? posts[currentIndex + 1] ?? null : null,
    nextPost: currentIndex > 0 ? posts[currentIndex - 1] : null,
  };
}
