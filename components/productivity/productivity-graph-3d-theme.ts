export type GraphTheme = "light" | "dark";

type GraphThemePalette = {
  categoryLightness: number;
  categoryFallbackColor: string;
  postColor: string;
  postDraftColor: string;
  linkFallbackColor: string;
  linkDraftColor: string;
};

const GRAPH_THEME_PALETTES: Record<GraphTheme, GraphThemePalette> = {
  light: {
    categoryLightness: 47,
    categoryFallbackColor: "#1c1917",
    postColor: "#2563eb",
    postDraftColor: "#94a3b8",
    linkFallbackColor: "#d6d3d1",
    linkDraftColor: "#a8a29e",
  },
  dark: {
    categoryLightness: 60,
    categoryFallbackColor: "#e7e5e4",
    postColor: "#60a5fa",
    postDraftColor: "#64748b",
    linkFallbackColor: "#44403c",
    linkDraftColor: "#78716c",
  },
};

export function resolveGraphTheme(themeValue: string | null | undefined): GraphTheme {
  return themeValue === "dark" ? "dark" : "light";
}

export function getGraphThemeFromDocument(): GraphTheme {
  if (typeof document === "undefined") return "light";
  return resolveGraphTheme(document.documentElement.getAttribute("data-theme"));
}

export function getGraphThemePalette(theme: GraphTheme) {
  return GRAPH_THEME_PALETTES[theme];
}
