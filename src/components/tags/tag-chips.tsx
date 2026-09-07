import { formatTagLabel, normalizeTags } from "@/lib/tags/module-tags";

export function TagChips({ tags }: { tags: string[] | null | undefined }) {
  const list = normalizeTags(tags);
  if (list.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="flex flex-wrap gap-1" data-ff-tag-chips="">
      {list.map((tag) => (
        <span
          key={tag}
          className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-navy"
        >
          {formatTagLabel(tag)}
        </span>
      ))}
    </span>
  );
}
