import Link from "next/link";

type PostLinkProps = {
  slug: string;
  title: string;
  date: string;
  readingTime: string;
  isDraft?: boolean;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(date: string) {
  return DATE_FORMATTER.format(new Date(date));
}

export function PostLink({ slug, title, date, readingTime, isDraft }: PostLinkProps) {
  return (
    <li className="border-b border-rule py-3">
      <Link
        href={`/blog/${slug}`}
        className="grid grid-cols-[1fr_auto] items-baseline gap-4"
      >
        <span className="text-lg text-foreground">
          {title}
          {isDraft ? (
            <span className="ml-2 text-xs uppercase tracking-wide text-muted">
              Draft
            </span>
          ) : null}
        </span>
        <span className="text-sm text-muted">
          {formatDate(date)} · {readingTime}
        </span>
      </Link>
    </li>
  );
}
