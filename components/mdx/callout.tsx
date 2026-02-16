import type { ReactNode } from "react";

type CalloutType = "info" | "warning" | "danger" | "tip";

type CalloutProps = {
  type?: CalloutType;
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
};

export function Callout({ type = "info", children }: CalloutProps) {
  const c = config[type];

  return (
    <aside
      className="my-6 rounded-md border px-4 py-3 text-sm text-foreground"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
        {c.label}
      </p>
      <div className="[&>p]:my-1">{children}</div>
    </aside>
  );
}
