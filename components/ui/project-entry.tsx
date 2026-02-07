import Link from "next/link";
import type { ProjectEntry as Project } from "@/lib/projects";

type ProjectEntryProps = {
  index: number;
  project: Project;
};

export function ProjectEntry({ index, project }: ProjectEntryProps) {
  return (
    <li className="space-y-4 border-t border-rule pt-10 first:border-t-0 first:pt-0">
      <img
        src={project.thumbnail.src}
        alt={project.thumbnail.alt}
        className="h-56 w-full rounded-sm border border-rule object-cover"
        loading="lazy"
      />
      <h3 className="font-serif text-2xl text-foreground">
        <span className="text-accent">{index}.</span> {project.title}
      </h3>
      <p className="max-w-[70ch] text-muted">{project.description}</p>
      <p className="text-sm text-muted">
        Essay: <Link href={`/blog/${project.blogSlug}`}>Read project notes</Link>
      </p>
      <p className="text-sm text-muted">
        {project.links.map((link, idx) => (
          <span key={`${project.title}-${link.label}`}>
            {idx > 0 ? " · " : "\u2192 "}
            {link.href ? (
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ) : (
              link.label
            )}
          </span>
        ))}
      </p>
    </li>
  );
}
