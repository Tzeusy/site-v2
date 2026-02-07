import type { Metadata } from "next";
import Link from "next/link";

type Workflow = {
  title: string;
  blurb: string;
  slug: string;
};

type WorkflowGroup = {
  heading: string;
  description: string;
  items: Workflow[];
};

const groups: WorkflowGroup[] = [
  {
    heading: "Desktop & Environment",
    description:
      "Reducing friction in the tools I stare at all day.",
    items: [
      {
        title: "i3wm Ricing",
        blurb:
          "Tiling window manager setup for a distraction-free, keyboard-driven desktop. Covers keybindings, status bars, and compositing.",
        slug: "setting-up-of-i3wm-ricing",
      },
    ],
  },
  {
    heading: "Automation",
    description:
      "Replacing repetitive manual work with scripts and bots.",
    items: [
      {
        title: "Badminton Court Bot",
        blurb:
          "A Telegram bot that collapses dozens of OnePA.sg slot checks into a single query. Built to save ten minutes of clicking every week.",
        slug: "badminton-court-bot",
      },
    ],
  },
  {
    heading: "Observability",
    description:
      "Making systems legible so problems surface before users notice.",
    items: [
      {
        title: "Why Most Metrics Dashboards Fail",
        blurb:
          "Dashboards that optimize for visual density over operational decisions create noise, not insight. A framework for dashboards that actually get used.",
        slug: "why-most-metrics-dashboards-fail",
      },
    ],
  },
  {
    heading: "Resilience",
    description:
      "Designing systems that degrade gracefully instead of failing all at once.",
    items: [
      {
        title: "Designing for Partial Failure",
        blurb:
          "A practical approach to graceful degradation — keeping the system useful when one dependency is unhealthy.",
        slug: "designing-for-partial-failure",
      },
      {
        title: "Understanding Async Boundaries",
        blurb:
          "Where to draw asynchronous seams so failures stay local and behavior remains predictable.",
        slug: "understanding-async-boundaries",
      },
    ],
  },
];

export const metadata: Metadata = {
  title: "Workflows",
  description:
    "Personal workflow optimizations — desktop setup, automation, observability, and resilience patterns.",
};

export default function WorkflowsPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">
          Workflows
        </p>
        <h1 className="text-balance text-4xl sm:text-5xl">
          How I work.
        </h1>
        <p className="max-w-[65ch] text-muted">
          Optimizations, tools, and patterns I keep coming back to — from
          desktop environment to production resilience. Each links to a
          longer write-up.
        </p>
      </header>

      {groups.map((group) => (
        <section
          key={group.heading}
          className="space-y-5 border-t border-rule pt-10"
        >
          <h2 className="font-serif text-2xl">{group.heading}</h2>
          <p className="max-w-[65ch] text-sm text-muted">{group.description}</p>
          <ul className="space-y-4 list-none">
            {group.items.map((item) => (
              <li key={item.slug} className="space-y-1">
                <h3 className="text-foreground">
                  <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                </h3>
                <p className="max-w-[65ch] text-sm text-muted">{item.blurb}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
