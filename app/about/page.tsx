import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { projects } from "@/lib/projects";

const contacts = [
  { label: "GitHub", href: "https://github.com/Tzeusy" },
  { label: "LinkedIn", href: "https://linkedin.com/in/tzehow" },
  { label: "Email", href: "mailto:tzeuse@gmail.com" },
];

const highlightSlugs = [
  "openai-car-racing-adventures",
  "handwaving-magicka",
  "project-jessica",
];

const highlights = highlightSlugs
  .map((slug) => projects.find((p) => p.blogSlug === slug))
  .filter((p): p is NonNullable<typeof p> => p != null);

export const metadata: Metadata = {
  title: "About",
  description:
    "About Tze How — Singaporean engineer composing systems from proven ecosystems.",
};

export default function AboutPage() {
  return (
    <article className="space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">About</p>
        <h1 className="text-balance text-4xl sm:text-5xl">
          Composing systems from the shoulders of giants.
        </h1>
        <p className="max-w-[65ch] text-pretty text-lg text-muted">
          Singaporean engineer building transparent, powerful software by
          standing on the shoulders of giants.
        </p>
        <p className="text-sm text-muted">
          {contacts.map((contact, index) => (
            <span key={contact.label}>
              {index > 0 ? " · " : ""}
              <a href={contact.href} target="_blank" rel="noreferrer">
                {contact.label}
              </a>
            </span>
          ))}
        </p>
      </header>

      {/* Bio */}
      <section className="space-y-5 border-t border-rule pt-10">
        <h2 className="font-serif text-2xl">Bio</h2>
        <p className="max-w-[65ch] text-muted">
          I studied Computer Science and Design at the Singapore University of
          Technology and Design, where the curriculum pairs engineering rigour
          with design thinking. That combination shaped how I approach
          software — treating clarity and usability as first-class constraints,
          not afterthoughts.
        </p>
        <p className="max-w-[65ch] text-muted">
          Along the way I built across a wide surface: imitation-learning agents
          for OpenAI Gym, a ROS-controlled robotic barista, FPGA hardware games,
          Ethereum compliance tooling, and food-delivery platforms. That
          curiosity keeps pulling me into new domains — the common thread is
          the same question: what makes something work reliably at the next
          order of magnitude?
        </p>
        <p className="max-w-[65ch] text-muted">
          A highlight was the SUTD–MIT Global Leadership Programme, a ten-week
          exchange in Boston where our team designed and sailed an electric boat
          on the Charles River. It was a crash course in cross-disciplinary
          collaboration under real constraints.
        </p>
        <p className="max-w-[65ch] text-muted">
          Today I work as a Site Reliability Engineer at Citadel, where I focus
          on observability, platform tooling, and keeping systems transparent
          under pressure. The throughline from school to work is the same:
          leverage what exists, make it visible, and compose it into something
          greater than the parts.
        </p>
      </section>

      {/* Philosophy */}
      <section className="space-y-5 border-t border-rule pt-10">
        <h2 className="font-serif text-2xl">Philosophy</h2>
        <p className="max-w-[65ch] text-muted">
          &ldquo;Leveraging ecosystems&rdquo; is not a euphemism for gluing
          libraries together. It means choosing mature, well-understood
          foundations — ROS for robotics, OpenAI Gym for RL, Telegram and
          Etherscan APIs for bots and on-chain analysis — then composing them
          into systems whose behaviour is transparent and whose seams are
          visible.
        </p>
        <p className="max-w-[65ch] text-muted">
          In SRE work the same principle holds: observability stacks,
          infrastructure-as-code, and platform abstractions succeed when they
          make the system legible, not when they hide complexity. Good software
          lets you see through it.
        </p>
      </section>

      {/* Selected work */}
      <section className="space-y-5 border-t border-rule pt-10">
        <h2 className="font-serif text-2xl">Selected work</h2>
        <ul className="space-y-4 list-none">
          {highlights.map((project) => (
            <li key={project.blogSlug} className="flex gap-4 items-start">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-sm border border-rule">
                <Image
                  src={project.thumbnail.src}
                  alt={project.thumbnail.alt}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-foreground">
                  <Link href={`/blog/${project.blogSlug}`}>
                    {project.title}
                  </Link>
                </h3>
                <p className="text-sm text-muted">{project.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          <Link href="/projects">View all projects →</Link>
        </p>
      </section>

      {/* Now */}
      <section className="space-y-5 border-t border-rule pt-10">
        <h2 className="font-serif text-2xl">Now — February 2025</h2>
        <ul className="max-w-[65ch] list-disc space-y-2 pl-5 text-muted">
          <li>Working on observability and platform reliability at Citadel.</li>
          <li>Rebuilding this site with Next.js, Tailwind CSS v4, and MDX.</li>
          <li>Reading about systems thinking and software composition.</li>
        </ul>
      </section>

      {/* Colophon */}
      <section className="space-y-3 border-t border-rule pt-10">
        <h2 className="font-serif text-2xl">Colophon</h2>
        <p className="text-sm text-muted">
          Built with Next.js, Tailwind CSS v4, and MDX. Typeset in IBM Plex
          Serif and Inter. Source on{" "}
          <a
            href="https://github.com/Tzeusy/professional-site-v2"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </section>
    </article>
  );
}
