import type { Metadata } from "next";
import Link from "next/link";
import { Kbd } from "@/components/ui/kbd";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Tze How — engineer obsessed with how systems scale, break, and grow.",
};

export default function HomePage() {
  return (
    <article className="space-y-12">
      <section className="space-y-4">
        {/* <p className="text-sm uppercase tracking-[0.08em] text-accent">Tze How</p> */}
        <h1 className="text-balance text-4xl sm:text-5xl">
          Welcome to my personal website!
        </h1>
        <p className="max-w-[65ch] text-pretty text-lg text-muted">
          My name&apos;s Tze How, and I&apos;m currently a Site Reliability
          Engineer at Citadel&apos;s Enterprise Data team. I hope you learn
          something new here, and if you have any questions or want to chat
          about anything, feel free to reach out!
        </p>
      </section>

      <nav className="space-y-4 border-y border-rule py-8">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Sections</p>
        <p className="text-muted">
          <Link href="/about">About</Link> for background, bio, and contact.
        </p>
        <p className="text-muted">
          <Link href="/projects">Projects</Link> for an annotated list of work and
          linked project notes.
        </p>
        <p className="text-muted">
          <Link href="/blog">Blog</Link> for long-form essays.
        </p>
      </nav>

      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Shortcuts</p>
        <p className="text-muted">
          <Kbd shortcut="K" /> for quick-search.
        </p>
        <p className="text-muted">
          <Kbd shortcut="J" /> to toggle night mode.
        </p>
      </section>
    </article>
  );
}
