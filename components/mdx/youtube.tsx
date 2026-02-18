export function YouTube({ id, title = "YouTube video" }: { id: string; title?: string }) {
  return (
    <div className="my-6 overflow-hidden rounded-md border border-rule">
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
