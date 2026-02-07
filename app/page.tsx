import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Tze How — Site Reliability Engineer composing systems from proven ecosystems.",
};

export default function HomePage() {
  return (
    <article className="space-y-12">
      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Tze How</p>
        <h1 className="text-balance text-4xl sm:text-5xl">
          Composing systems from the ecosystem up.
        </h1>
        <p className="max-w-[65ch] text-pretty text-lg text-muted">
          Site Reliability Engineer at Citadel. I build on the shoulders of
          giants — leveraging proven tools to create transparent, powerful
          software.
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
    </article>
  );
}
