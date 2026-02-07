import type { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  h1: ({ className = "", ...props }) => (
    <h1 className={`mt-10 text-4xl sm:text-5xl ${className}`} {...props} />
  ),
  h2: ({ className = "", ...props }) => (
    <h2 className={`mt-10 text-3xl ${className}`} {...props} />
  ),
  h3: ({ className = "", ...props }) => (
    <h3 className={`mt-8 text-2xl ${className}`} {...props} />
  ),
  p: ({ className = "", ...props }) => (
    <p className={`my-5 text-base text-foreground ${className}`} {...props} />
  ),
  ul: ({ className = "", ...props }) => (
    <ul
      className={`my-5 list-disc space-y-2 pl-6 text-foreground ${className}`}
      {...props}
    />
  ),
  ol: ({ className = "", ...props }) => (
    <ol
      className={`my-5 list-decimal space-y-2 pl-6 text-foreground ${className}`}
      {...props}
    />
  ),
  blockquote: ({ className = "", ...props }) => (
    <blockquote
      className={`my-6 border-l-2 border-rule pl-4 italic text-muted ${className}`}
      {...props}
    />
  ),
  pre: ({ className = "", ...props }) => (
    <pre
      className={`my-6 overflow-x-auto rounded-md border border-rule ${className}`}
      {...props}
    />
  ),
  img: ({ className = "", alt, ...props }) => (
    <img
      className={`my-6 w-full rounded-md border border-rule ${className}`}
      alt={alt ?? ""}
      loading="lazy"
      {...props}
    />
  ),
  figure: ({ className = "", ...props }) => (
    <figure className={`my-8 ${className}`} {...props} />
  ),
  figcaption: ({ className = "", ...props }) => (
    <figcaption
      className={`mt-2 text-center text-sm text-muted ${className}`}
      {...props}
    />
  ),
};
