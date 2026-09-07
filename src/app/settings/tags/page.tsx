import { deleteModuleTag, listModuleTagSuggestions, mergeModuleTag, renameModuleTag } from "@/app/actions/record-tags";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTagLabel, isTagModule, TAG_MODULES, type TagModule } from "@/lib/tags/module-tags";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ManageTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const { module: raw } = await searchParams;
  const module: TagModule = isTagModule(raw ?? "") ? (raw as TagModule) : "deals";
  const tags = await listModuleTagSuggestions(module);

  return (
    <SettingsShell title="Manage tags" current="tags">
      <p className="mb-4 text-sm text-muted-foreground">
        Rename, merge, or delete tags for this module. Changes apply to every record that uses the
        chip — not just one deal.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {TAG_MODULES.map((item) => (
          <Link
            key={item}
            href={`/settings/tags?module=${item}`}
            className={`rounded-sm px-2.5 py-1 text-sm capitalize ${
              item === module ? "bg-navy text-white" : "bg-muted text-navy hover:bg-secondary"
            }`}
          >
            {item}
          </Link>
        ))}
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved tags for {module} yet.</p>
      ) : (
        <ul className="space-y-3" data-ff-tag-manager={module}>
          {tags.map((tag) => (
            <li key={tag} className="ff-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <p className="min-w-28 text-sm font-medium text-navy">{formatTagLabel(tag)}</p>
              <form action={renameModuleTag} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="module" value={module} />
                <input type="hidden" name="from" value={tag} />
                <Input name="to" placeholder="New name" className="h-8 w-36" />
                <Button type="submit" size="xs" variant="outline">
                  Rename
                </Button>
              </form>
              <form action={mergeModuleTag} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="module" value={module} />
                <input type="hidden" name="from" value={tag} />
                <select name="into" className="h-8 rounded-md border border-border bg-background px-2 text-sm">
                  {tags
                    .filter((item) => item !== tag)
                    .map((item) => (
                      <option key={item} value={item}>
                        Merge into {formatTagLabel(item)}
                      </option>
                    ))}
                </select>
                <Button type="submit" size="xs" variant="outline" disabled={tags.length < 2}>
                  Merge
                </Button>
              </form>
              <HardDeleteForm action={deleteModuleTag} subject={`tag ${formatTagLabel(tag)}`}>
                <input type="hidden" name="module" value={module} />
                <input type="hidden" name="name" value={tag} />
                <Button type="submit" size="xs" variant="ghost">
                  Delete
                </Button>
              </HardDeleteForm>
            </li>
          ))}
        </ul>
      )}
    </SettingsShell>
  );
}
