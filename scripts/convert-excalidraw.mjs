/**
 * Convert .excalidraw files in content/blog/{date-slug}/ to paired
 * light/dark SVGs in public/blog/{slug}/.
 *
 * Runs AFTER copy-blog-assets.mjs in the build pipeline.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const PUBLIC_BLOG_DIR = path.join(process.cwd(), "public/blog");


function slugFromDirName(dirName) {
  return dirName.replace(/^\d{4}-\d{2}-\d{2}-/u, "");
}

/** Collect all .excalidraw files across blog content bundles. */
async function findExcalidrawFiles() {
  const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  const results = [];

  for (const dir of dirs) {
    const srcDir = path.join(BLOG_DIR, dir.name);
    const files = await fs.readdir(srcDir);
    const excalidrawFiles = files.filter((f) => f.endsWith(".excalidraw"));

    for (const file of excalidrawFiles) {
      results.push({
        srcPath: path.join(srcDir, file),
        name: file.replace(/\.excalidraw$/u, ""),
        slug: slugFromDirName(dir.name),
      });
    }
  }

  return results;
}

async function main() {
  const files = await findExcalidrawFiles();

  if (files.length === 0) {
    console.log("No .excalidraw files found — skipping conversion.");
    return;
  }

  // Set up DOM shim BEFORE importing excalidraw (it accesses window/DOM at import time)
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

  // Core DOM globals
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    writable: true,
    configurable: true,
  });
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;

  // Browser APIs excalidraw expects
  globalThis.devicePixelRatio = 1;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Element = dom.window.Element;
  globalThis.Node = dom.window.Node;
  globalThis.SVGElement = dom.window.SVGElement ?? class SVGElement {};
  globalThis.Image = dom.window.Image ?? class Image {};
  globalThis.fetch = globalThis.fetch ?? (() => Promise.reject(new Error("no fetch")));

  // FontFace stub (excalidraw uses it for font registration and CSS generation)
  globalThis.FontFace = class FontFace {
    constructor(family, source, descriptors = {}) {
      this.family = family;
      this.source = source;
      this.style = descriptors.style ?? "normal";
      this.weight = descriptors.weight ?? "normal";
      this.stretch = descriptors.stretch ?? "normal";
      this.unicodeRange = descriptors.unicodeRange ?? "U+0000-FFFF";
      this.variant = descriptors.variant ?? "normal";
      this.featureSettings = descriptors.featureSettings ?? "normal";
      this.display = descriptors.display ?? "swap";
      this.status = "loaded";
    }
    load() { return Promise.resolve(this); }
  };

  // Canvas stub (excalidraw may use it for text measurement)
  if (!globalThis.HTMLCanvasElement) {
    globalThis.HTMLCanvasElement = class HTMLCanvasElement {};
  }
  if (!dom.window.document.createElement.__patched) {
    const origCreate = dom.window.document.createElement.bind(dom.window.document);
    dom.window.document.createElement = function (tag, ...args) {
      if (tag === "canvas") {
        return {
          getContext() {
            return {
              measureText: (text) => ({ width: text.length * 8 }),
              fillText() {},
              clearRect() {},
              fillRect() {},
              font: "",
              textAlign: "left",
              textBaseline: "top",
            };
          },
          width: 0,
          height: 0,
          toDataURL: () => "",
        };
      }
      return origCreate(tag, ...args);
    };
    dom.window.document.createElement.__patched = true;
  }

  // Now safe to import excalidraw utils
  const { exportToSvg } = await import("@excalidraw/utils");

  let converted = 0;

  for (const { srcPath, name, slug } of files) {
    const raw = await fs.readFile(srcPath, "utf8");
    const data = JSON.parse(raw);

    const elements = data.elements ?? [];
    const appState = data.appState ?? {};

    // Generate light SVG — match blog's light background #fafaf9
    const lightSvg = await exportToSvg({
      elements,
      appState: {
        ...appState,
        exportWithDarkMode: false,
        exportBackground: true,
        viewBackgroundColor: "#fafaf9",
      },
      files: data.files ?? null,
    });

    // Generate dark SVG — excalidraw applies filter="invert(93%) hue-rotate(180deg)"
    // so we set the background to the pre-image of #171412 (the blog's dark bg)
    const darkSvg = await exportToSvg({
      elements,
      appState: {
        ...appState,
        exportWithDarkMode: true,
        exportBackground: true,
        viewBackgroundColor: "#fffbf9",
      },
      files: data.files ?? null,
    });

    const destDir = path.join(PUBLIC_BLOG_DIR, slug);
    await fs.mkdir(destDir, { recursive: true });

    const serialize = (svg) => {
      const serializer = new dom.window.XMLSerializer();
      let str = serializer.serializeToString(svg);
      // JSDOM's XMLSerializer emits duplicate xmlns — remove all but the first
      let seen = false;
      str = str.replace(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, (match) => {
        if (!seen) { seen = true; return match; }
        return "";
      });
      return str;
    };

    await fs.writeFile(
      path.join(destDir, `${name}-light.svg`),
      serialize(lightSvg),
    );
    await fs.writeFile(
      path.join(destDir, `${name}-dark.svg`),
      serialize(darkSvg),
    );

    converted++;
    console.log(`  ${slug}/${name} → light + dark SVGs`);
  }

  console.log(`Converted ${converted} .excalidraw file(s) to SVG pairs.`);
}

await main();
