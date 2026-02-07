import Link from "next/link";

export default function NotFound() {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">404</p>
        <h1 className="text-balance text-4xl sm:text-5xl">Page not found.</h1>
        <p className="max-w-[65ch] text-lg text-muted">
          The page you requested does not exist, may have moved, or was removed.
        </p>
      </header>

      <section className="space-y-3 border-t border-rule pt-8">
        <p className="text-sm uppercase tracking-[0.08em] text-accent">Continue</p>
        <ul className="space-y-2 text-muted">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/blog">Blog</Link>
          </li>
          <li>
            <Link href="/projects">Projects</Link>
          </li>
          <li>
            <Link href="/about">About</Link>
          </li>
        </ul>
      </section>
    </article>
  );
}
