import Link from "next/link";

type PostLinkProps = {
  slug: string;
  title: string;
  date: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function PostLink({ slug, title, date }: PostLinkProps) {
  return (
    <li className="border-b border-rule py-3">
      <Link
        href={`/blog/${slug}`}
        className="grid grid-cols-[1fr_auto] items-baseline gap-4 no-underline"
      >
        <span className="text-lg text-foreground">{title}</span>
        <span className="text-sm text-muted">{formatDate(date)}</span>
      </Link>
    </li>
  );
}
