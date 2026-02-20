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
        <p className="text-sm uppercase tracking-[0.08em] text-accent">About Me</p>
        <h1 className="text-balance text-4xl sm:text-5xl">
          Tze How (Lee)
        </h1>
        <p className="max-w-[65ch] text-pretty text-lg text-muted">
          I&rsquo;m a Singaporean software engineer building transparent, powerful software by
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
          I currently work as a Site Reliability Engineer on Citadel&rsquo;s
          Enterprise Data team, where we serve reference data to the firm —
          serving metadata on all tradeable instruments in a performant and auditable manner,
          and underpinning the trading activities of the largest market-maker in the world.
        </p>
        <p className="max-w-[65ch] text-muted">
          I studied Computer Science and Design at the Singapore University of
          Technology and Design, where the curriculum pairs engineering rigour
          with design thinking. That combination shaped how I approach
          software — treating clarity and usability as first-class constraints,
          not afterthoughts.
        </p>
        <p className="max-w-[65ch] text-muted">
          I&rsquo;ve worked across a range of disciplines, mostly centered around Software Engineering
          within finance. I maintain side hobbies in maintaining my own homelab and its
          accompanying electronics and hardware, messing with things like CAD and 3D printing on and off.
        </p>
      </section>

      {/* Philosophy */}
      <section className="space-y-5 border-t border-rule pt-10">
        <h2 className="font-serif text-2xl">Philosophy</h2>
        <p className="max-w-[65ch] text-muted">
          I believe that technology grows like an ever-spreading tree, with
          branches upon branches that are each unlocked by prior work over
          generations. Standing on the shoulders of giants is a motif that
          runs through how I approach software, and life in general.
        </p>
        <p className="max-w-[65ch] text-muted">
          I&rsquo;m a strong believer in the potential of technology to
          improve peoples&rsquo; lives, and I think that the present is always the most
          exciting time to be alive. I believe that the spirit of problem solving is
          how we got to where we are as a species, and that maintaining a deep curiosity
          about problems and ecosystems is how we thrive in tomorrow&rsquo;s world.
        </p>
        <p className="max-w-[65ch] text-muted">
          I&rsquo;m also very curious about the fields of economics and game theory, especially
          on how ideas here shape the world that we live in. There are several adjacent
          spaces like effective altruism and rationality that I actively keep up with, and
          learn from on a day to day basis.
        </p>
      </section>

      {/* Education */}
      <section className="space-y-5 border-t border-rule pt-10">
        <h2 className="font-serif text-2xl">Education</h2>
        <div className="space-y-6 max-w-[65ch]">
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-foreground">
              Singapore University of Technology and Design
            </h3>
            <p className="text-sm text-muted">B. Eng, Computer Science &middot; 2016–2019 &middot; CGPA 4.77/5.0 (summa cum laude)</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>SUTD Distinguished Undergraduate Scholarship — 2 awarded in total cohort</li>
              <li>SUTD Honours List (Dean&rsquo;s List equivalent) — every eligible year</li>
              <li>Singapore Computer Systems Excellence Award</li>
              <li>SUTD-MIT Global Leadership Program (Summer 2017)</li>
            </ul>
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-foreground">
              NUS High School of Math and Science
            </h3>
            <p className="text-sm text-muted">NUS High Diploma (High Distinction) &middot; 2008–2013</p>
            <p className="text-sm text-muted">Honours in Physics, Biology, Chemistry. Major in Mathematics.</p>
          </div>
        </div>
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
        <h2 className="font-serif text-2xl">Current Projects — February 2026</h2>
        <ul className="max-w-[65ch] list-disc space-y-2 pl-5 text-muted">
          <li>Serving reference data to the firm on Citadel&rsquo;s Enterprise Data team.</li>
          <li>Recovering from an <a
            href="/blog/my-open-heart-surgery"
            target="_blank"
            rel="noreferrer"
          >
            Open Heart Surgery
          </a></li>
          <li>Messing around with the latest generation of LLMs, and experimenting with what&rsquo;s made possible with today&rsquo;s latest and greatest tools.</li>
          <li>Rebuilding this site with Next.js, Tailwind CSS v4, and MDX. Or, well, architecting and writing blogposts for this site while Claude and Codex build it.</li>
          <li>Exploring how close I am to my dream of building my own <a
            href="https://github.com/Tzeusy/butlers/"
            target="_blank"
            rel="noreferrer"
          >
            Jarvis
          </a></li>
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
