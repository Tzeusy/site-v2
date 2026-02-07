# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full rewrite of [tze.how](https://tze.how) — a personal site styled as an "Editorial Minimal" publication.

## Planned Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4.1 (v4 CSS-first config, NOT tailwind.config.js)
- **Package manager:** Bun
- **Blog:** MDX / markdown files in `content/blog/`, rendered at build time
- **Deployment:** Vercel or GitHub Pages with static export

## Commands

```bash
bun install            # Install dependencies
bun dev                # Start dev server
bun build              # Production build
bun lint               # Run linter
```

## Architecture

```
app/                    # Next.js App Router
├── layout.tsx          # Root layout (masthead, footer, theme toggle)
├── page.tsx            # Profile/home page (/)
├── productivity/page.tsx # Productivity graph (/productivity)
├── blog/
│   ├── page.tsx        # Blog index (/blog)
│   └── [slug]/page.tsx # Individual post
└── resume/page.tsx     # Resume page (/resume)
components/
├── layout/             # Masthead, Footer
├── ui/                 # ThemeToggle, ProjectEntry, PostLink
└── mdx/                # MDX components (code blocks, callouts)
content/blog/           # .md/.mdx blog posts with YAML frontmatter
lib/                    # Markdown processing, utilities
public/                 # Static assets, resume.pdf
tailwind.css            # Tailwind v4 entry point (NOT tailwind.config.js)
```

## Design Constraints

The design philosophy is "quiet, confident, literate" — typography-driven, not decoration-driven. When implementing:

- **No animations**, parallax, card-lifting effects, sliding panels, or hover transforms
- **Narrow readable column** (~65–75 chars wide) with generous margins
- **Color is rare** — use the exact palette from README.md (light: `#fafaf9` bg, `#1c1917` text; dark: `#171412` bg, `#e7e5e4` text)
- **Links:** calm blue `#2563eb` (light) / `#60a5fa` (dark), underline on hover only
- **Typography carries the design** — hierarchy via size not weight, line spacing 1.6–1.8
- **Font:** IBM Plex Serif/Sans, Literata, or Inter
- **Code blocks:** syntax highlighting via shiki / rehype-pretty-code

## Issue Tracking

This project uses **bd (beads)** for all task tracking. Do NOT use TodoWrite, TaskCreate, or markdown TODO lists.

```bash
bd ready                              # Find unblocked work
bd show <id>                          # View issue details
bd update <id> --status in_progress   # Claim work
bd close <id>                         # Complete work
bd sync                               # Sync with git
```

## Session Completion Protocol

Work is NOT done until pushed. Before ending any session:

```bash
bun run lint              # Fix lint errors before committing
git status                # Check changes
git add <files>           # Stage code
bd sync                   # Commit beads
git commit -m "..."       # Commit code
bd sync                   # Commit any new beads changes
git push                  # Push to remote
```

## Change Management

This project uses **OpenSpec** for structured planning. Changes follow: Explore → Proposal → Specs → Design → Tasks → Apply → Verify → Archive. See `.claude/skills/` for available OpenSpec workflows.
