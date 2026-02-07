# site-v2

Full rewrite of [tze.how](https://tze.how) — a personal site as a publication, not a dashboard.

## Theme: Editorial Minimal

Quiet, confident, literate. Slightly academic but modern.
Think: a personal column in a serious magazine written by an engineer.

The design disappears so the content feels deliberate and trustworthy.
A reader should be able to stay on the page for 10 minutes without fatigue.

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

### Prerequisites

- Node.js 20+ (LTS recommended)
- Bun 1.2+

### Setup

```bash
git clone https://github.com/Tzeusy/site-v2.git
cd site-v2
bun install
```

### Start the development server

```bash
bun dev
```

Open `http://localhost:3000` in your browser.

## Navigation

Not a "navbar" — a publication masthead. Simple nameplate + small navigation.

```
TH — Software Engineer         Profile · Blog · Resume · ☾
```

- **Profile** — `/` — Who you are, what you do, projects, contact
- **Blog** — `/blog` — Table-of-contents index, long-form essay posts
- **Resume** — `/resume` — Embedded PDF or styled HTML resume + download

The dark/light toggle (`☾` / `☀`) sits at the end of the navigation.

## Page Details

### Profile (`/`)

One clear statement of what you do. No photo required — the writing is the identity.

```
Building calm software.
I design systems that stay understandable as they grow.
```

Then contact links (GitHub, LinkedIn, email) — understated, inline.

Below: a brief bio, then projects as annotated bibliography entries.

#### Bio

- Current role: Site Reliability Engineer at Citadel
- Education: B.Eng, Computer Science and Design (CSD), SUTD
- Background: software engineering, data science/ML, quantitative finance
- Skills presented as prose or a quiet list — not a grid, not a carousel

#### Projects

Not cards. Not thumbnails. They read like annotated bibliography entries.
The emphasis is what problem you solved, not features.

```
OpenAI Car Racing
Imitation learning for the OpenAI Gym environment with Layerwise
Relevance Propagation for neural network visualization.
→ GitHub · Best Project Award

Automated Barista
Automating a Niryo One 6-axis robotic arm and coffee machine via ROS
for SUTD Open House 2020.
→ Video · Outstanding Contribution to Pillar

Ethereum Activity Analyzer
Fully automated address analysis for MAS guideline compliance.
Built during internship at traceto.io.
→ Case study

i3 Ricing
Tiling window manager customization — making the desktop environment
more accessible and aesthetic.
→ Write-up

Handwaving Magicka
Using computer vision and emulated controllers to play Magicka
with hand gestures.
→ GitHub

Badminton Court Bot
Telegram bot that checks OnePA.sg for badminton court availability
so you don't have to.
→ GitHub

SUTD-MIT Global Leadership Programme
10-week exchange building an electric boat to sail the Charles River.
→ Most Technically Challenging Boat

Binary Sudoku
An 8×8 Binary Sudoku on a Mojo FPGA with WS2812b programmable LEDs.
→ GitHub

Myx: Food Ordering
Vue-based food delivery platform for customers and merchants.
→ Project
```

### Blog (`/blog`)

Blog index feels like a table of contents — title and date, nothing else competing.

```
Understanding Async Boundaries                         Jan 2026
Designing for Partial Failure                          Dec 2025
Why Most Metrics Dashboards Fail                       Nov 2025
```

Posts themselves resemble long-form essays:
- Generous margins
- Readable code blocks with syntax highlighting (shiki / rehype-pretty-code)
- Optional table of contents for longer posts
- No clutter around the article

**Markdown-based** — posts authored as `.md` or `.mdx` files in `/content/blog/`.
Rendered at build time via `next-mdx-remote` or similar.

Frontmatter schema:

```yaml
---
title: "Post Title"
date: 2025-01-15
summary: "Short description"
tags: ["python", "machine-learning"]
---
```

Features:
- Reading time estimate
- Previous / Next post navigation
- Tag-based filtering (subtle, not color-coded chips)

### Resume (`/resume`)

- Embedded PDF viewer or styled HTML version
- Download button for PDF
- Located at `/public/resume.pdf`

## Visual Language

### Layout

The page is vertically structured and centered.
Content lives in a narrow readable column (~65–75 characters wide).

Large margins are intentional — they slow the reader down and improve comprehension.
No sidebars. No card grids. No multi-column layouts.

### Typography (the main design feature)

Typography carries the design — not color, not decoration.

| Element | Feeling |
|---|---|
| H1 | An essay title |
| H2 | Chapter header |
| Body | Readable prose |
| Metadata | Subtle margin note |

- Large, book-like headings
- Comfortable line spacing (~1.6–1.8 for body)
- Strong hierarchy using size, not weight
- Links are understated but obvious (calm blue, no underline until hover)

Font: a modern serif or sans-serif with good reading characteristics
(e.g. `IBM Plex Serif` for headings, `Inter` or `IBM Plex Sans` for body — or a single variable font like `Literata`).

### Color

Color is rare and intentional.

**Light mode**

| Role | Value |
|---|---|
| Background | Paper white `#fafaf9` |
| Text | Dark ink `#1c1917` |
| Text secondary | Muted `#78716c` |
| Link | Calm blue `#2563eb` |
| Border / rule | `#e7e5e4` |

**Dark mode**

Dark mode is not "inverted" — it feels like reading at night, not like a code editor.

| Role | Value |
|---|---|
| Background | Deep ink `#171412` |
| Text | Soft off-white `#e7e5e4` |
| Text secondary | Muted `#a8a29e` |
| Link | Slightly brighter blue `#60a5fa` |
| Border / rule | `#292524` |

### Interaction Style

Very restrained. Interaction should feel invisible.

**Allowed:**
- Hover underline on links
- Subtle focus outline for accessibility
- Dark/light toggle

**Avoid:**
- Animations
- Sliding panels
- Hover transformations
- Card lifting effects
- Animated gradients
- Parallax
- 3D elements

## Project Structure

```
site-v2/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (masthead, footer, theme)
│   ├── page.tsx            # Profile (home)
│   ├── blog/
│   │   ├── page.tsx        # Blog index (table of contents)
│   │   └── [slug]/
│   │       └── page.tsx    # Individual essay
│   └── resume/
│       └── page.tsx
├── components/
│   ├── layout/             # Masthead, Footer
│   ├── ui/                 # ThemeToggle, ProjectEntry, PostLink
│   └── mdx/                # MDX components (code blocks, callouts)
├── content/
│   └── blog/               # Markdown blog posts
│       ├── post-1.mdx
│       └── post-2.mdx
├── lib/                    # Markdown processing, utilities
├── public/
│   ├── images/
│   └── resume.pdf
├── tailwind.css            # Tailwind v4 entry point
├── tsconfig.json
├── next.config.ts
├── bun.lock
└── package.json
```

## Deployment

This repo is configured for **static export** and GitHub Pages:

- `next.config.ts` sets `output: "export"`
- `bun run build` emits static files to `out/`
- `.github/workflows/ci.yml` runs lint, typecheck, and build on push/PR
- `.github/workflows/deploy-pages.yml` deploys `out/` to GitHub Pages on `main`
- `public/CNAME` is set to `tze.how`

If you deploy on Vercel instead, keep CI enabled and disable the Pages deploy
workflow.

## Personal Info

- **Name:** Tze How
- **Domain:** tze.how
- **Nationality:** Singaporean
- **Current role:** Site Reliability Engineer at Citadel
- **Education:** B.Eng, Computer Science and Design (CSD), SUTD
- **GitHub:** [Tzeusy](https://github.com/Tzeusy)
- **LinkedIn:** [tzehow](https://linkedin.com/in/tzehow)
- **Email:** tzeuse@gmail.com

## Deployment

- Target: Vercel (natural fit for Next.js) or GitHub Pages with static export
- Domain: tze.how
- CI/CD: GitHub Actions or Vercel auto-deploy on push
