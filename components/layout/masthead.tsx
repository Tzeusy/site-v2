import Link from "next/link";
import { SearchTrigger } from "@/components/ui/search-trigger";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WeatherToggle } from "@/components/ui/weather-toggle";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/productivity", label: "Productivity" },
  { href: "/blog", label: "Blog" },
  { href: "/resume", label: "Resume" },
];

export function Masthead() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-[75ch] items-center justify-between gap-4 px-6 py-5 sm:px-8">
        <Link
          href="/"
          className="font-serif text-lg tracking-tight text-foreground no-underline hover:underline"
        >
          tze.how
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted sm:gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="decoration-transparent underline-offset-[0.2em] hover:decoration-current"
            >
              {link.label}
            </Link>
          ))}
          <SearchTrigger />
          <WeatherToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
