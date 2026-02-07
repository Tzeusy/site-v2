const rawBasePath =
  process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? "";

const normalizedBasePath =
  rawBasePath === "/" ? "" : rawBasePath.replace(/\/+$/u, "");

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) {
    return path;
  }

  if (!normalizedBasePath) {
    return path;
  }

  if (path === "/") {
    return normalizedBasePath;
  }

  if (path.startsWith(`${normalizedBasePath}/`)) {
    return path;
  }

  return `${normalizedBasePath}${path}`;
}
