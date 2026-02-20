import type { ReactNode } from "react";

type CollapsibleProps = {
  title: string;
  children: ReactNode;
};

export function Collapsible({ title, children }: CollapsibleProps) {
  return (
    <details className="group my-6 border-b border-rule">
      <summary className="cursor-pointer select-none py-3 text-lg text-foreground marker:text-muted">
        {title}
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}
