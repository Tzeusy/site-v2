import type { Metadata } from "next";
import { ProjectEntry } from "@/components/ui/project-entry";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Annotated projects by Tze How with linked essays and supporting references.",
};

export default function ProjectsPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Projects</p>
        <h1 className="text-balance text-4xl sm:text-5xl">Select projects and write-ups.</h1>
        <p className="max-w-[70ch] text-muted">
          Each project links to a dedicated write-up. Where a full essay is still
          in progress, the link points to a placeholder note.
        </p>
      </header>

      <ul className="space-y-10 list-none">
        {projects.map((project) => (
          <ProjectEntry key={project.title} project={project} />
        ))}
      </ul>
    </article>
  );
}
