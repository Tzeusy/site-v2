import { getPublishedPostSummaries } from "./blog";
import { projects } from "./projects";

export type SearchEntry = {
  type: "page" | "post" | "project";
  title: string;
  href: string;
  description?: string;
  tags?: string[];
};

const staticPages: SearchEntry[] = [
  { type: "page", title: "Home", href: "/" },
  { type: "page", title: "About", href: "/about" },
  { type: "page", title: "Projects", href: "/projects" },
  { type: "page", title: "Productivity", href: "/productivity" },
  { type: "page", title: "Blog", href: "/blog" },
  { type: "page", title: "Resume", href: "/resume" },
];

export async function getSearchEntries(): Promise<SearchEntry[]> {
  const posts = await getPublishedPostSummaries();

  const postEntries: SearchEntry[] = posts.map((post) => ({
    type: "post",
    title: post.title,
    href: `/blog/${post.slug}`,
    description: post.summary,
    tags: post.tags,
  }));

  const postHrefs = new Set(postEntries.map((p) => p.href));

  const projectEntries: SearchEntry[] = projects
    .filter((project) => !postHrefs.has(`/blog/${project.blogSlug}`))
    .map((project) => ({
      type: "project",
      title: project.title,
      href: `/blog/${project.blogSlug}`,
      description: project.description,
    }));

  return [...staticPages, ...postEntries, ...projectEntries];
}
