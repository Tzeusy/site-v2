import { withBasePath } from "@/lib/base-path";

type ExcalidrawDiagramProps = {
  light: string;
  dark?: string;
  alt?: string;
};

export function ExcalidrawDiagram({
  light,
  dark,
  alt,
}: ExcalidrawDiagramProps) {
  const lightSrc = withBasePath(light);
  const darkSrc = dark ? withBasePath(dark) : lightSrc;

  return (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="excalidraw-light mx-auto h-auto w-full"
        src={lightSrc}
        alt={alt ?? ""}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="excalidraw-dark mx-auto h-auto w-full"
        src={darkSrc}
        alt={alt ?? ""}
      />
      {alt && (
        <figcaption className="mt-2 text-center text-sm text-muted">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}
