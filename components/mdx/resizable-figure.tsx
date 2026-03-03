"use client";

import { useCallback, useRef, useState } from "react";

type ResizableFigureProps = {
  children: React.ReactNode;
  className?: string;
  as?: "figure" | "div";
};

export function ResizableFigure({
  children,
  className = "",
  as: Tag = "figure",
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

  // CSS-driven: 100% on mobile, 130% on desktop (pointer:fine)
  // JS-driven: once user drags, inline style takes over
  const jsMode = widthPct !== null;
  const overflow = jsMode && widthPct > 100;
  const marginInline = overflow
    ? `calc(-${(widthPct - 100) / 2}%)`
    : undefined;

  return (
    <Tag
      ref={figureRef as unknown as React.Ref<HTMLDivElement>}
      className={[
        "select-none [@media(pointer:fine)]:cursor-ew-resize",
        !jsMode &&
          "w-full [@media(pointer:fine)]:w-[130%] [@media(pointer:fine)]:ml-[-15%] [@media(pointer:fine)]:mr-[-15%]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        jsMode
          ? {
              width: `${widthPct}%`,
              marginLeft: marginInline,
              marginRight: marginInline,
            }
          : undefined
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {children}
    </Tag>
  );
}
