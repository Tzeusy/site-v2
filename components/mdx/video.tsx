import { withBasePath } from "@/lib/base-path";
import { ResizableFigure } from "@/components/mdx/resizable-figure";

type VideoProps = {
  src: string;
  caption?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  size?: number;
};

export function Video({
  src,
  caption,
  autoPlay = true,
  loop = true,
  muted = true,
  size,
}: VideoProps) {
  const resolvedSrc = withBasePath(src);

  return (
    <ResizableFigure className="my-6" initialWidthPct={size}>
      <video
        className="h-auto w-full rounded-md border border-rule"
        src={resolvedSrc}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        controls
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm italic text-muted">
          {caption}
        </figcaption>
      )}
    </ResizableFigure>
  );
}
