import type { Metadata } from "next";

const contacts = [
  { label: "GitHub", href: "https://github.com/Tzeusy" },
  { label: "LinkedIn", href: "https://linkedin.com/in/tzehow" },
  { label: "Email", href: "mailto:tzeuse@gmail.com" },
];

export const metadata: Metadata = {
  title: "About",
  description:
    "About Tze How, Site Reliability Engineer focused on understandable systems.",
};

export default function AboutPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">About</p>
        <h1 className="text-balance text-4xl sm:text-5xl">Building calm software.</h1>
        <p className="max-w-[65ch] text-pretty text-lg text-muted">
          I design systems that stay understandable as they grow.
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

      <section className="space-y-5">
        <h2 className="text-2xl">Bio</h2>
        <p className="text-muted">
          I am a Site Reliability Engineer at Citadel and a graduate of SUTD&apos;s
          Computer Science and Design programme.
        </p>
        <p className="text-muted">
          My background spans software engineering, data science and machine
          learning, and quantitative finance. I care most about systems that
          remain clear under pressure.
        </p>
      </section>
    </article>
  );
}
