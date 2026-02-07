export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto w-full max-w-[75ch] px-6 py-8 text-sm text-muted sm:px-8">
        <p>Tze How. {year}.</p>
      </div>
    </footer>
  );
}
