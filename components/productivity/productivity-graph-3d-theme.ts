export type GraphTheme = "light" | "dark";

export type GraphThemePalette = {
  categoryLightness: number;
  backgroundColor: string;
  categoryFallbackColor: string;
  postColor: string;
  postDraftColor: string;
  linkFallbackColor: string;
  linkDraftColor: string;
  labelCategoryColor: string;
  labelPostColor: string;
};

const GRAPH_THEME_PALETTES: Record<GraphTheme, GraphThemePalette> = {
  light: {
    categoryLightness: 47,
    backgroundColor: "#fafaf9",
    categoryFallbackColor: "#1c1917",
    postColor: "#2563eb",
    postDraftColor: "#94a3b8",
    linkFallbackColor: "#d6d3d1",
    linkDraftColor: "#a8a29e",
    labelCategoryColor: "#1c1917",
    labelPostColor: "#ffffff",
  },
  dark: {
    categoryLightness: 60,
    backgroundColor: "#171412",
    categoryFallbackColor: "#e7e5e4",
    postColor: "#60a5fa",
    postDraftColor: "#64748b",
    linkFallbackColor: "#44403c",
    linkDraftColor: "#78716c",
    labelCategoryColor: "#e7e5e4",
    labelPostColor: "#ffffff",
  },
};

const GRAPH_THEME_ATTRIBUTE_NAMES = new Set(["data-theme", "style"]);

export function resolveGraphTheme(themeValue: string | null | undefined): GraphTheme {
  return themeValue === "dark" ? "dark" : "light";
}

export function getGraphThemeFromDocument(): GraphTheme {
  if (typeof document === "undefined") return "light";
  return resolveGraphTheme(document.documentElement.getAttribute("data-theme"));
}

function readCssVariable(style: CSSStyleDeclaration, name: string) {
  const value = style.getPropertyValue(name).trim();
  return value.length > 0 ? value : null;
}

function resolveNumericCssVariable(
  style: CSSStyleDeclaration,
  name: string,
  fallback: number,
) {
  const value = readCssVariable(style, name);
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveStringCssVariable(
  style: CSSStyleDeclaration,
  name: string,
  fallback: string,
) {
  return readCssVariable(style, name) ?? fallback;
}

export function getGraphThemePalette(theme: GraphTheme) {
  const fallback = GRAPH_THEME_PALETTES[theme];
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") {
    return fallback;
  }

  const style = getComputedStyle(document.documentElement);
  const labelFallback = resolveStringCssVariable(style, "--foreground", fallback.labelCategoryColor);
  return {
    categoryLightness: resolveNumericCssVariable(
      style,
      "--graph-category-lightness",
      fallback.categoryLightness,
    ),
    backgroundColor: resolveStringCssVariable(style, "--background", fallback.backgroundColor),
    categoryFallbackColor: resolveStringCssVariable(
      style,
      "--graph-category-fallback-color",
      fallback.categoryFallbackColor,
    ),
    postColor: resolveStringCssVariable(style, "--graph-post-color", fallback.postColor),
    postDraftColor: resolveStringCssVariable(
      style,
      "--graph-post-draft-color",
      fallback.postDraftColor,
    ),
    linkFallbackColor: resolveStringCssVariable(
      style,
      "--graph-link-fallback-color",
      fallback.linkFallbackColor,
    ),
    linkDraftColor: resolveStringCssVariable(
      style,
      "--graph-link-draft-color",
      fallback.linkDraftColor,
    ),
    labelCategoryColor: resolveStringCssVariable(
      style,
      "--graph-label-category-color",
      labelFallback,
    ),
    labelPostColor: resolveStringCssVariable(
      style,
      "--graph-label-post-color",
      fallback.labelPostColor,
    ),
  };
}

export function isGraphThemeMutation(
  mutation: Pick<MutationRecord, "type" | "attributeName">,
) {
  return (
    mutation.type === "attributes" &&
    mutation.attributeName !== null &&
    GRAPH_THEME_ATTRIBUTE_NAMES.has(mutation.attributeName)
  );
}
