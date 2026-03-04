import { SocialLinks, type SocialLink } from "@/components/ui/social-links";

const links: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/Tzeusy", icon: "github", newTab: true },
  { label: "LinkedIn", href: "https://linkedin.com/in/tzehow", icon: "linkedin", newTab: true },
  { label: "Email", href: "mailto:tzeuse@gmail.com", icon: "email" },
  { label: "RSS", href: "/feed.xml", icon: "rss" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-[75ch] flex-col gap-3 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {year} Tze How</p>
        <SocialLinks links={links} />
      </div>
    </footer>
  );
}
