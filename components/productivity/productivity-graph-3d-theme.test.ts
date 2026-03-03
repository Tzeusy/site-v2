import assert from "node:assert/strict";
import test from "node:test";
import {
  getGraphThemeFromDocument,
  getGraphThemePalette,
  isGraphThemeMutation,
  resolveGraphTheme,
} from "@/components/productivity/productivity-graph-3d-theme";

function withDocumentStub(
  themeValue: string | null,
  cssVars: Record<string, string>,
  fn: () => void,
) {
  const originalDocument = globalThis.document;
  const originalGetComputedStyle = globalThis.getComputedStyle;
  const documentStub = {
    documentElement: {
      getAttribute: () => themeValue,
    },
  } as unknown as Document;
  const getComputedStyleStub = (() =>
    ({
      getPropertyValue: (name: string) => cssVars[name] ?? "",
    } as CSSStyleDeclaration)) as typeof getComputedStyle;

  Object.defineProperty(globalThis, "document", {
    value: documentStub,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "getComputedStyle", {
    value: getComputedStyleStub,
    configurable: true,
    writable: true,
  });

  try {
    fn();
  } finally {
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "getComputedStyle", {
      value: originalGetComputedStyle,
      configurable: true,
      writable: true,
    });
  }
}

test("resolveGraphTheme defaults to light for unexpected values", () => {
  assert.equal(resolveGraphTheme("light"), "light");
  assert.equal(resolveGraphTheme("dark"), "dark");
  assert.equal(resolveGraphTheme("system"), "light");
  assert.equal(resolveGraphTheme(null), "light");
});

test("getGraphThemeFromDocument returns light when no theme attribute is set", () => {
  withDocumentStub(null, {}, () => {
    assert.equal(getGraphThemeFromDocument(), "light");
  });
});

test("getGraphThemeFromDocument reads dark theme from data-theme", () => {
  withDocumentStub("dark", {}, () => {
    assert.equal(getGraphThemeFromDocument(), "dark");
  });
});

test("reads palette values from css variables", () => {
  withDocumentStub(
    "dark",
    {
      "--graph-category-lightness": "72",
      "--background": "rgb(12, 20, 30)",
      "--graph-post-color": "#33aaff",
      "--graph-label-post-color": "#f4f4f5",
    },
    () => {
      const palette = getGraphThemePalette("dark");
      assert.equal(palette.categoryLightness, 72);
      assert.equal(palette.backgroundColor, "rgb(12, 20, 30)");
      assert.equal(palette.postColor, "#33aaff");
      assert.equal(palette.labelPostColor, "#f4f4f5");
    },
  );
});

test("falls back to theme defaults when css variables are missing", () => {
  withDocumentStub("light", {}, () => {
    const palette = getGraphThemePalette("light");
    assert.equal(palette.categoryLightness, 47);
    assert.equal(palette.backgroundColor, "#fafaf9");
    assert.equal(palette.postColor, "#2563eb");
    assert.equal(palette.labelCategoryColor, "#1c1917");
    assert.equal(palette.labelPostColor, "#ffffff");
  });
});

test("tracks data-theme and style root mutations", () => {
  assert.equal(
    isGraphThemeMutation({
      type: "attributes",
      attributeName: "data-theme",
    }),
    true,
  );
  assert.equal(
    isGraphThemeMutation({
      type: "attributes",
      attributeName: "style",
    }),
    true,
  );
  assert.equal(
    isGraphThemeMutation({
      type: "attributes",
      attributeName: "class",
    }),
    false,
  );
  assert.equal(
    isGraphThemeMutation({
      type: "childList",
      attributeName: "data-theme",
    }),
    false,
  );
});
