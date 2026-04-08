import type { ReactNode } from "react";

type CalloutType = "info" | "warning" | "danger" | "tip" | "quote";

type CalloutProps = {
  type?: CalloutType;
  cite?: string;
  hyperlink?: string;
  children: ReactNode;
};

const config: Record<CalloutType, { bg: string; border: string; label: string }> = {
  info: {
    bg: "var(--callout-info-bg)",
    border: "var(--callout-info-border)",
    label: "Note",
  },
  tip: {
    bg: "var(--callout-tip-bg)",
    border: "var(--callout-tip-border)",
    label: "Tip",
  },
  warning: {
    bg: "var(--callout-warning-bg)",
    border: "var(--callout-warning-border)",
    label: "Warning",
  },
  danger: {
    bg: "var(--callout-danger-bg)",
    border: "var(--callout-danger-border)",
    label: "Danger",
  },
  quote: {
    bg: "var(--callout-quote-bg)",
    border: "var(--callout-quote-border)",
    label: "Quote",
  },
};

export function Callout({ type = "info", cite, hyperlink, children }: CalloutProps) {
  const c = config[type];
  const showCitation = type === "quote" && cite;

  return (
    <aside
      className="my-6 rounded-md border px-4 py-3 text-sm text-foreground"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <p className="mb-1 text-xs font-medium tracking-wide text-muted">
        <span className="uppercase">{c.label}</span>
        {showCitation ? (
          <>
            {" - "}
            {hyperlink ? (
              <a className="underline decoration-current underline-offset-2" href={hyperlink}>
                {cite}
              </a>
            ) : (
              <span>{cite}</span>
            )}
          </>
        ) : null}
      </p>
      <div className="[&>p]:my-1">{children}</div>
    </aside>
  );
}
