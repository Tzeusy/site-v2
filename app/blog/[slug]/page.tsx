import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdjacentPosts,
  getPostBySlug,
  getPublishedPostSummaries,
  getPostSlugs,
  isDraftPost,
} from "@/lib/blog";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found",
    };
  }

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      url: `https://tze.how/blog/${post.slug}`,
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const allPosts = await getPublishedPostSummaries();
  const { previousPost, nextPost } = await getAdjacentPosts(slug);
  const relatedPosts = allPosts
    .filter(
      (candidate) =>
        candidate.slug !== slug &&
        candidate.tags.some((tag) => post.tags.includes(tag)),
    )
    .slice(0, 3);
  const showToc = post.headings.length >= 3;

  const isDraft = isDraftPost(post);

  return (
    <article className="space-y-10">
      {isDraft ? (
        <p className="border border-rule px-4 py-2 text-sm text-muted">
          This post is a draft and is not listed publicly.
        </p>
      ) : null}

      <header className="space-y-4">
        <p className="text-sm text-muted">
          <time dateTime={post.date}>{post.date}</time> · {post.readingTime}
        </p>
        <h1 className="text-balance text-4xl sm:text-5xl">{post.title}</h1>
        <p className="text-lg text-muted">{post.summary}</p>
        {post.tags.length > 0 ? (
          <p className="text-sm text-muted">
            {post.tags.map((tag, index) => (
              <span key={tag}>
                {index > 0 ? " · " : ""}
                {tag}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {showToc ? (() => {
        const minLevel = Math.min(...post.headings.map((h) => h.level));
        return (
          <nav className="space-y-2 border-y border-rule py-4">
            <p className="text-sm uppercase tracking-[0.08em] text-accent">
              In this essay
            </p>
            <ol className="space-y-1 text-sm text-muted">
              {post.headings.map((heading) => (
                <li key={heading.id} style={{ paddingLeft: `${(heading.level - minLevel) * 1}rem` }}>
                  <a href={`#${heading.id}`}>
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        );
      })() : null}

      <section className="blog-post-content-underlines space-y-4 text-justify hyphens-auto">
        {post.content}
      </section>

      {relatedPosts.length > 0 ? (
        <section className="space-y-3 border-t border-rule pt-8">
          <p className="text-sm uppercase tracking-[0.08em] text-accent">
            More on this topic
          </p>
          <ul className="space-y-1 text-sm">
            {relatedPosts.map((relatedPost) => (
              <li key={relatedPost.slug}>
                <Link href={`/blog/${relatedPost.slug}`}>{relatedPost.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="grid gap-4 border-t border-rule pt-8 text-sm sm:grid-cols-2">
        <div>
          {previousPost ? (
            <>
              <p className="text-muted">Previous</p>
              <Link href={`/blog/${previousPost.slug}`}>{previousPost.title}</Link>
            </>
          ) : null}
        </div>
        <div className="sm:text-right">
          {nextPost ? (
            <>
              <p className="text-muted">Next</p>
              <Link href={`/blog/${nextPost.slug}`}>{nextPost.title}</Link>
            </>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
