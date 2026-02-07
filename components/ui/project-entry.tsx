import type { ProjectEntry as Project } from "@/lib/projects";

type ProjectEntryProps = {
  index: number;
  project: Project;
};

export function ProjectEntry({ index, project }: ProjectEntryProps) {
  return (
    <li className="space-y-2">
      <h3 className="font-serif text-2xl text-foreground">
        {index}. {project.title}
      </h3>
      <p className="text-muted">{project.description}</p>
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
