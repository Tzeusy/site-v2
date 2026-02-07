import type { Metadata } from "next";
import { ProjectEntry } from "@/components/ui/project-entry";
import { projects } from "@/lib/projects";

const contacts = [
  { label: "GitHub", href: "https://github.com/Tzeusy" },
  { label: "LinkedIn", href: "https://linkedin.com/in/tzehow" },
  { label: "Email", href: "mailto:tzeuse@gmail.com" },
];

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Profile of Tze How, Site Reliability Engineer focused on calm and understandable systems.",
};

export default function HomePage() {
  return (
    <article className="space-y-14">
      <section className="space-y-5">
        <p className="text-sm uppercase tracking-[0.08em] text-muted">Profile</p>
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
      </section>

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

      <section className="space-y-6">
        <h2 className="text-2xl">Projects</h2>
        <ol className="space-y-10">
          {projects.map((project, index) => (
            <ProjectEntry key={project.title} index={index + 1} project={project} />
          ))}
        </ol>
      </section>
    </article>
  );
}
