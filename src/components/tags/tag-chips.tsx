import { formatTagLabel, normalizeTags } from "@/lib/tags/module-tags";
import { tagChipStyle, type TagColorMap } from "@/lib/tags/tag-colors";

export function TagChips({
  tags,
  colors = {},
}: {
  tags: string[] | null | undefined;
  colors?: TagColorMap;
}) {
  const list = normalizeTags(tags);
  if (list.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="flex flex-wrap gap-1" data-ff-tag-chips="">
      {list.map((tag) => {
        const style = tagChipStyle(colors[tag]);
        return (
          <span
            key={tag}
            className={
              style
                ? "rounded-sm px-1.5 py-0.5 text-[11px] font-medium"
                : "rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-navy"
            }
            style={style}
            data-ff-tag-chip={tag}
            data-ff-tag-color={colors[tag] ?? ""}
          >
            {formatTagLabel(tag)}
          </span>
        );
      })}
    </span>
  );
}
