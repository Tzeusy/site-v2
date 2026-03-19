import { withBasePath } from "@/lib/base-path";
import { ResizableFigure } from "@/components/mdx/resizable-figure";

type ExcalidrawDiagramProps = {
  light: string;
  dark?: string;
  alt?: string;
  /** Initial width percentage on pointer:fine devices (default 130). */
  size?: number;
};

export function ExcalidrawDiagram({
  light,
  dark,
  alt,
  size = 160,
}: ExcalidrawDiagramProps) {
  const lightSrc = withBasePath(light);
  const darkSrc = dark ? withBasePath(dark) : lightSrc;

  return (
    <ResizableFigure className="my-8" initialWidthPct={size}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="excalidraw-light pointer-events-none mx-auto h-auto w-full"
        src={lightSrc}
        alt={alt ?? ""}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="excalidraw-dark pointer-events-none mx-auto h-auto w-full"
        src={darkSrc}
        alt={alt ?? ""}
        draggable={false}
      />
      {alt && (
        <figcaption className="mt-2 text-center text-sm text-muted">
          {alt}
        </figcaption>
      )}
    </ResizableFigure>
  );
}
