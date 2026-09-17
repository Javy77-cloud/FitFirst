import {
  createModuleTag,
  deleteModuleTag,
  listModuleTags,
  mergeModuleTag,
  renameModuleTag,
  updateModuleTagColor,
} from "@/app/actions/record-tags";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { SettingsShell } from "@/components/settings/settings-shell";
import { TagLiveColorField } from "@/components/settings/tag-live-color-field";
import { TagRowColor } from "@/components/settings/tag-row-color";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatTagLabel,
  isTagModule,
  TAG_MODULES,
  tagModuleLabel,
  type TagModule,
} from "@/lib/tags/module-tags";
import { DEFAULT_TAG_PICKER_COLOR } from "@/lib/tags/tag-colors";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ManageTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const { module: raw } = await searchParams;
  const module: TagModule = isTagModule(raw ?? "") ? (raw as TagModule) : "deals";
  const tags = await listModuleTags(module);

  return (
    <SettingsShell title="Manage Tags" current="tags">
      <p className="mb-4 text-sm text-muted-foreground">
        Each module has its own catalog. Create, rename, color, merge, or delete here — assigning a
        tag on a row never creates a new one.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {TAG_MODULES.map((item) => (
          <Link
            key={item}
            href={`/settings/tags?module=${item}`}
            className={`rounded-sm px-2.5 py-1 text-sm ${
              item === module ? "bg-navy text-white" : "bg-muted text-navy hover:bg-secondary"
            }`}
          >
            {tagModuleLabel(item)}
          </Link>
        ))}
      </div>

      <form action={createModuleTag} className="mb-4 flex flex-wrap items-end gap-2" data-ff-tag-create="">
        <input type="hidden" name="module" value={module} />
        <div>
          <label className="text-[11px] text-muted-foreground" htmlFor="settings-new-tag">
            New {tagModuleLabel(module).toLowerCase()} tag
          </label>
          <Input id="settings-new-tag" name="name" placeholder="Name" className="h-8 w-40" />
        </div>
        <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground" data-ff-tag-color-picker="">
          Color
          <TagLiveColorField ariaLabel="New tag color" defaultValue={DEFAULT_TAG_PICKER_COLOR} />
        </label>
        <Button type="submit" size="xs">
          Create
        </Button>
      </form>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved tags for {tagModuleLabel(module)} yet.</p>
      ) : (
        <ul className="space-y-3" data-ff-tag-manager={module}>
          {tags.map((tag) => (
            <li key={tag.name} className="ff-list-card">
              <div className="ff-list-card-body flex flex-col gap-3 sm:flex-row sm:items-center">
              <form action={updateModuleTagColor} className="flex flex-wrap items-center gap-2" data-ff-tag-color-edit={tag.name}>
                <input type="hidden" name="module" value={module} />
                <input type="hidden" name="returnTo" value={`/settings/tags?module=${module}`} />
                <input type="hidden" name="name" value={tag.name} />
                <TagRowColor
                  name="color"
                  savedColor={tag.color}
                  chipLabel={formatTagLabel(tag.name)}
                  ariaLabel={`Edit color for ${formatTagLabel(tag.name)}`}
                />
                <Button type="submit" size="xs" variant="outline">
                  Save color
                </Button>
              </form>
              <form action={renameModuleTag} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="module" value={module} />
                <input type="hidden" name="from" value={tag.name} />
                <Input name="to" placeholder="New name" className="h-8 w-36" />
                <Button type="submit" size="xs" variant="outline">
                  Rename
                </Button>
              </form>
              <form action={mergeModuleTag} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="module" value={module} />
                <input type="hidden" name="from" value={tag.name} />
                <select name="into" className="h-8 rounded-md border border-border bg-background px-2 text-sm">
                  {tags
                    .filter((item) => item.name !== tag.name)
                    .map((item) => (
                      <option key={item.name} value={item.name}>
                        Merge into {formatTagLabel(item.name)}
                      </option>
                    ))}
                </select>
                <Button type="submit" size="xs" variant="outline" disabled={tags.length < 2}>
                  Merge
                </Button>
              </form>
              <HardDeleteForm action={deleteModuleTag} subject={`tag ${formatTagLabel(tag.name)}`}>
                <input type="hidden" name="module" value={module} />
                <input type="hidden" name="name" value={tag.name} />
                <FileDeleteIcon label={`Delete ${formatTagLabel(tag.name)}`} className="text-destructive" />
              </HardDeleteForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsShell>
  );
}
