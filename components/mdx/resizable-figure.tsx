"use client";

import { useCallback, useRef, useState } from "react";

type ResizableFigureProps = {
  children: React.ReactNode;
  className?: string;
  as?: "figure" | "div";
  /** Initial width percentage on pointer:fine devices (default 130). */
  initialWidthPct?: number;
};

const DEFAULT_INITIAL_WIDTH_PCT = 100;

export function ResizableFigure({
  children,
  className = "",
  as: Tag = "figure",
  initialWidthPct = DEFAULT_INITIAL_WIDTH_PCT,
}: ResizableFigureProps) {
  const figureRef = useRef<HTMLElement>(null);
  // null = CSS-driven width; number = user has dragged, JS-driven
  const [widthPct, setWidthPct] = useState<number | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startPct = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    // Read current computed width as a percentage of parent
    const figure = figureRef.current;
    const parent = figure?.parentElement;
    if (figure && parent) {
      startPct.current = (figure.offsetWidth / parent.clientWidth) * 100;
    }
    figureRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const parent = figureRef.current?.parentElement;
    if (!parent) return;
    const deltaPx = e.clientX - startX.current;
    const deltaPct = (deltaPx / parent.clientWidth) * 200;
    const next = Math.max(100, Math.min(200, startPct.current + deltaPct));
    setWidthPct(next);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Compute the active width: user-dragged value takes priority, then prop
  const activeWidth = widthPct ?? initialWidthPct;
  // Positive margin centers narrow images, negative margin overflows wide ones
  const figMargin = `${(100 - activeWidth) / 2}%`;

  return (
    <Tag
      ref={figureRef as unknown as React.Ref<HTMLDivElement>}
      className={`resizable-figure select-none ${className}`}
      style={
        {
          "--fig-w": `${activeWidth}%`,
          "--fig-mx": figMargin,
        } as React.CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {children}
    </Tag>
  );
}
