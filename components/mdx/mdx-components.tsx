import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import { withBasePath } from "@/lib/base-path";
import { Callout } from "@/components/mdx/callout";

const DEFAULT_MDX_IMAGE_WIDTH = 1200;
const DEFAULT_MDX_IMAGE_HEIGHT = 630;

const parseDimension = (value: number | string | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

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
  img: ({ className = "", alt, width, height, src, ...props }) => {
    const resolvedWidth = parseDimension(width) ?? DEFAULT_MDX_IMAGE_WIDTH;
    const resolvedHeight = parseDimension(height) ?? DEFAULT_MDX_IMAGE_HEIGHT;
    const resolvedSrc =
      typeof src === "string" ? withBasePath(src) : src;

    if (!resolvedSrc) {
      return null;
    }

    return (
      <Image
        className={`my-6 h-auto w-full rounded-md border border-rule ${className}`}
        alt={alt ?? ""}
        src={resolvedSrc}
        width={resolvedWidth}
        height={resolvedHeight}
        sizes="100vw"
        {...props}
      />
    );
  },
  figure: ({ className = "", ...props }) => (
    <figure className={`my-8 ${className}`} {...props} />
  ),
  figcaption: ({ className = "", ...props }) => (
    <figcaption
      className={`mt-2 text-center text-sm text-muted ${className}`}
      {...props}
    />
  ),
  Callout,
};
