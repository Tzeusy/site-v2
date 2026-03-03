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

const DARK_BG = "#171412";

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

  // Lazy-load heavy deps only when needed
  const { exportToSvg } = await import("@excalidraw/utils");
  const { JSDOM } = await import("jsdom");

  // Set up DOM shim for excalidraw's SVG generation
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.navigator = dom.window.navigator;
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;

  let converted = 0;

  for (const { srcPath, name, slug } of files) {
    const raw = await fs.readFile(srcPath, "utf8");
    const data = JSON.parse(raw);

    const elements = data.elements ?? [];
    const appState = data.appState ?? {};

    // Generate light SVG
    const lightSvg = await exportToSvg({
      elements,
      appState: {
        ...appState,
        exportWithDarkMode: false,
        exportBackground: true,
      },
      files: data.files ?? null,
    });

    // Generate dark SVG
    const darkSvg = await exportToSvg({
      elements,
      appState: {
        ...appState,
        exportWithDarkMode: true,
        exportBackground: true,
        viewBackgroundColor: DARK_BG,
      },
      files: data.files ?? null,
    });

    const destDir = path.join(PUBLIC_BLOG_DIR, slug);
    await fs.mkdir(destDir, { recursive: true });

    const serialize = (svg) => {
      const serializer = new dom.window.XMLSerializer();
      return serializer.serializeToString(svg);
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
