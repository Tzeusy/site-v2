import { isValidElement, type ReactNode } from "react";

type BlogHeadingLike = {
  level: 1 | 2 | 3;
  text: string;
  id: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/gu, "")
    .replace(/\s+/gu, "-");
}

function collapseWhitespace(input: string) {
  return input.replace(/\s+/gu, " ").trim();
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractText(child)).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }

  return "";
}

function collectHeadings(node: ReactNode, headings: BlogHeadingLike[]) {
  if (node == null || typeof node === "boolean") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((child) => collectHeadings(child, headings));
    return;
  }

  if (!isValidElement<{ children?: ReactNode; id?: unknown }>(node)) {
    return;
  }

  if (typeof node.type === "string" && /^h[1-3]$/u.test(node.type)) {
    const text = collapseWhitespace(extractText(node.props.children));
    const id =
      typeof node.props.id === "string" && node.props.id.length > 0
        ? node.props.id
        : slugify(text);

    if (text.length > 0) {
      headings.push({
        level: Number(node.type.slice(1)) as 1 | 2 | 3,
        text,
        id,
      });
    }
  }

  collectHeadings(node.props.children, headings);
}

export function extractHeadingsFromNode(node: ReactNode): BlogHeadingLike[] {
  const headings: BlogHeadingLike[] = [];
  collectHeadings(node, headings);
  return headings;
}
