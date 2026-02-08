/**
 * Copy non-MDX assets from content/blog/{date-slug}/ to public/blog/{slug}/
 * so they are served as static files during build.
 *
 * The slug is derived by stripping the YYYY-MM-DD- prefix from the directory name.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const PUBLIC_BLOG_DIR = path.join(process.cwd(), "public/blog");

function slugFromDirName(dirName) {
  return dirName.replace(/^\d{4}-\d{2}-\d{2}-/u, "");
}

async function main() {
  // Clean previous output
  await fs.rm(PUBLIC_BLOG_DIR, { recursive: true, force: true });

  const entries = await fs.readdir(BLOG_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());

  let copied = 0;

  for (const dir of dirs) {
    const slug = slugFromDirName(dir.name);
    const srcDir = path.join(BLOG_DIR, dir.name);
    const files = await fs.readdir(srcDir);

    const assets = files.filter((f) => !/\.mdx?$/u.test(f));
    if (assets.length === 0) continue;

    const destDir = path.join(PUBLIC_BLOG_DIR, slug);
    await fs.mkdir(destDir, { recursive: true });

    for (const asset of assets) {
      await fs.copyFile(path.join(srcDir, asset), path.join(destDir, asset));
      copied++;
    }
  }

  console.log(`Copied ${copied} blog assets to public/blog/`);
}

await main();
