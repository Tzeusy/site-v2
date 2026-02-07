import type { MetadataRoute } from "next";
import { getPublishedPostSummaries } from "@/lib/blog";

const BASE_URL = "https://tze.how";
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPostSummaries();
  const staticRoutes = [
    "",
    "/about",
    "/projects",
    "/productivity",
    "/blog",
    "/resume",
  ];

  const staticEntries = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const postEntries = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}
