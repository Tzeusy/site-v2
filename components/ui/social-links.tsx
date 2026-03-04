type SocialIconName = "github" | "linkedin" | "email" | "rss";

export type SocialLink = {
  label: string;
  href: string;
  icon: SocialIconName;
  newTab?: boolean;
};

type SocialLinksProps = {
  links: SocialLink[];
  className?: string;
};

function SocialIcon({ name }: { name: SocialIconName }) {
  if (name === "github") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M12 2C6.477 2 2 6.589 2 12.249c0 4.528 2.865 8.37 6.839 9.726.5.096.682-.223.682-.496 0-.245-.009-.895-.014-1.757-2.782.617-3.369-1.37-3.369-1.37-.455-1.184-1.11-1.5-1.11-1.5-.909-.637.069-.624.069-.624 1.004.073 1.532 1.056 1.532 1.056.892 1.566 2.341 1.114 2.91.852.09-.664.35-1.115.636-1.372-2.22-.259-4.555-1.139-4.555-5.069 0-1.12.39-2.036 1.03-2.753-.103-.26-.446-1.304.097-2.719 0 0 .84-.277 2.75 1.051A9.368 9.368 0 0 1 12 7.097a9.37 9.37 0 0 1 2.503.344c1.909-1.328 2.748-1.051 2.748-1.051.544 1.415.202 2.459.1 2.72.642.716 1.029 1.632 1.029 2.752 0 3.94-2.338 4.807-4.566 5.06.359.319.679.948.679 1.91 0 1.379-.012 2.492-.012 2.831 0 .276.18.597.688.495C19.138 20.616 22 16.775 22 12.25 22 6.59 17.523 2 12 2Z" />
      </svg>
    );
  }

  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M20.45 20.45H16.9v-5.57c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.67H9.35V9h3.4v1.56h.05c.47-.9 1.63-1.86 3.35-1.86 3.58 0 4.24 2.36 4.24 5.42v6.33ZM5.34 7.43a2.06 2.06 0 1 1 0-4.11 2.06 2.06 0 0 1 0 4.11ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77A1.77 1.77 0 0 0 0 1.77v20.46C0 23.2.8 24 1.77 24h20.45A1.78 1.78 0 0 0 24 22.23V1.77C24 .8 23.2 0 22.22 0Z" />
      </svg>
    );
  }

  if (name === "email") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.4-.5 7.6 6.333L19.6 6H4.4Zm15.6 1.302-7.36 6.132a1 1 0 0 1-1.28 0L4 7.302V17.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V7.302Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M6 18.2a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Zm3.6.18a4.8 4.8 0 0 0-4.8-4.8v2.4a2.4 2.4 0 0 1 2.4 2.4h2.4ZM14.4 18.4a9.6 9.6 0 0 0-9.6-9.6v2.4a7.2 7.2 0 0 1 7.2 7.2h2.4ZM4.8 4h14.4A2.8 2.8 0 0 1 22 6.8v10.4A2.8 2.8 0 0 1 19.2 20H16.8v-2h2.4a.8.8 0 0 0 .8-.8V6.8a.8.8 0 0 0-.8-.8H4.8a.8.8 0 0 0-.8.8v4h-2v-4A2.8 2.8 0 0 1 4.8 4Z" />
    </svg>
  );
}

export function SocialLinks({ links, className }: SocialLinksProps) {
  return (
    <div className={className ?? "flex items-center gap-2"}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target={link.newTab ? "_blank" : undefined}
          rel={link.newTab ? "noreferrer" : undefined}
          aria-label={link.label}
          title={link.label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted transition hover:border-rule hover:text-foreground"
        >
          <SocialIcon name={link.icon} />
          <span className="sr-only">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
