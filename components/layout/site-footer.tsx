const links = [
  { label: "GitHub", href: "https://github.com/Tzeusy" },
  { label: "LinkedIn", href: "https://linkedin.com/in/tzehow" },
  { label: "Email", href: "mailto:tzeuse@gmail.com" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-[75ch] flex-col gap-3 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {year} Tze How</p>
        <p className="flex gap-4">
          {links.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </p>
      </div>
    </footer>
  );
}
