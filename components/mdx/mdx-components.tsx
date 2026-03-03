import type { MDXComponents } from "mdx/types";
import React from "react";
import Image from "next/image";
import { withBasePath } from "@/lib/base-path";
import { Callout } from "@/components/mdx/callout";
import { Collapsible } from "@/components/mdx/collapsible";
import { YouTube } from "@/components/mdx/youtube";
import { MermaidDiagram } from "@/components/mdx/mermaid-diagram";
import { ExcalidrawDiagram } from "@/components/mdx/excalidraw-diagram";
import { ResizableFigure } from "@/components/mdx/resizable-figure";

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

// Named so the <p> override can detect it and avoid <p><figure> nesting
function MdxImg({ className = "", alt, width, height, src, ...props }: React.ComponentPropsWithoutRef<"img">) {
  const resolvedWidth = parseDimension(width) ?? DEFAULT_MDX_IMAGE_WIDTH;
  const resolvedHeight = parseDimension(height) ?? DEFAULT_MDX_IMAGE_HEIGHT;
  const resolvedSrc = typeof src === "string" ? withBasePath(src) : src;

  if (!resolvedSrc) return null;

  return (
    <ResizableFigure className="my-6">
      <Image
        className={`pointer-events-none h-auto w-full rounded-md border border-rule ${className}`}
        alt={alt ?? ""}
        src={resolvedSrc}
        width={resolvedWidth}
        height={resolvedHeight}
        sizes="100vw"
        draggable={false}
        {...props}
      />
      {alt && (
        <figcaption className="mt-2 text-center text-sm italic text-muted">
          {alt}
        </figcaption>
      )}
    </ResizableFigure>
  );
}

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
  p: ({ className = "", children, ...props }) => {
    // <p> cannot contain block-level elements (<figure>, <div>, etc.).
    // MDX wraps images in <p> tags; when an image appears alongside text in
    // a list item, remark-unwrap-images cannot remove the wrapper. Detect the
    // custom img component (which renders a <figure>) in children and fall
    // back to <div> to avoid the invalid <p><figure> nesting.
    const hasBlockChild = React.Children.toArray(children).some(
      (child) => React.isValidElement(child) && child.type === MdxImg,
    );
    if (hasBlockChild) {
      return (
        <div className={`my-5 text-base text-foreground ${className}`}>
          {children}
        </div>
      );
    }
    return (
      <p className={`my-5 text-base text-foreground ${className}`} {...props}>
        {children}
      </p>
    );
  },
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
  img: MdxImg,
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
  Collapsible,
  YouTube,
  MermaidDiagram,
  ExcalidrawDiagram,
};
