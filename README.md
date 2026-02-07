# site-v2

Full rewrite of [tze.how](https://tze.how) — a personal site styled as an editorial publication.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4.1 (v4 CSS-first config) |
| Package manager | Bun |
| Blog | MDX / rendered markdown (file-based, no CMS) |

## Run Locally

Prerequisites: Node.js 20+, Bun 1.2+

```bash
git clone https://github.com/Tzeusy/site-v2.git
cd site-v2
bun install
bun dev
```

Open `http://localhost:3000`.

## Project Structure

```
app/                    # Next.js App Router
├── layout.tsx          # Root layout (masthead, footer, theme)
├── page.tsx            # Home
├── about/page.tsx      # About, bio, philosophy
├── productivity/page.tsx # Productivity graph of active tooling notes
├── blog/
│   ├── page.tsx        # Blog index
│   └── [slug]/page.tsx # Individual post
├── projects/page.tsx   # Annotated project list
└── resume/page.tsx     # Resume
components/
├── layout/             # Masthead, Footer
├── ui/                 # ThemeToggle, ProjectEntry, PostLink
└── mdx/                # MDX components (code blocks, callouts)
content/blog/           # .md/.mdx blog posts with YAML frontmatter
lib/                    # Markdown processing, utilities
public/                 # Static assets, images, resume.pdf
tailwind.css            # Tailwind v4 entry point
```

## Deployment

Static export via GitHub Pages:

- `next.config.ts` sets `output: "export"`
- `bun run build` emits static files to `out/`
- `.github/workflows/ci.yml` runs lint, typecheck, and build on push/PR
- `.github/workflows/deploy-pages.yml` deploys `out/` to GitHub Pages on `main`
- `public/CNAME` is set to `tze.how`
