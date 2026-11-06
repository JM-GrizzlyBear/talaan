// A titled block of free text (the X-ray reading, notes), keeping line breaks
export function TextSection({
  id,
  title,
  text,
}: {
  id: string;
  title: string;
  text: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      <p className="rounded-xl border border-edge bg-white p-4 whitespace-pre-wrap">
        {text}
      </p>
    </section>
  );
}
