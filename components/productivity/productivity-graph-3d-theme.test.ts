import assert from "node:assert/strict";
import test from "node:test";
import {
  getGraphThemeFromDocument,
  getGraphThemePalette,
  resolveGraphTheme,
} from "@/components/productivity/productivity-graph-3d-theme";

function withDocumentAttribute(
  value: string | null,
  fn: () => void,
) {
  const originalDocument = globalThis.document;
  const documentStub = {
    documentElement: {
      getAttribute: () => value,
    },
  } as unknown as Document;

  Object.defineProperty(globalThis, "document", {
    value: documentStub,
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
  }
}

test("resolveGraphTheme defaults to light for unexpected values", () => {
  assert.equal(resolveGraphTheme("light"), "light");
  assert.equal(resolveGraphTheme("dark"), "dark");
  assert.equal(resolveGraphTheme("system"), "light");
  assert.equal(resolveGraphTheme(null), "light");
});

test("getGraphThemeFromDocument returns light when no theme attribute is set", () => {
  withDocumentAttribute(null, () => {
    assert.equal(getGraphThemeFromDocument(), "light");
  });
});

test("getGraphThemeFromDocument reads dark theme from data-theme", () => {
  withDocumentAttribute("dark", () => {
    assert.equal(getGraphThemeFromDocument(), "dark");
  });
});

test("light and dark palettes differ for post and draft link colors", () => {
  const lightPalette = getGraphThemePalette("light");
  const darkPalette = getGraphThemePalette("dark");

  assert.notEqual(lightPalette.postColor, darkPalette.postColor);
  assert.notEqual(lightPalette.linkDraftColor, darkPalette.linkDraftColor);
});
