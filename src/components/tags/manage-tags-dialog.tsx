"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  createModuleTag,
  deleteModuleTag,
  listModuleTags,
  mergeModuleTag,
  renameModuleTag,
  updateModuleTagColor,
} from "@/app/actions/record-tags";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { flashAction } from "@/lib/flash-client";
import { formatTagLabel, tagModuleLabel, type TagModule } from "@/lib/tags/module-tags";
import { TagRowColor } from "@/components/settings/tag-row-color";
import { DEFAULT_TAG_PICKER_COLOR } from "@/lib/tags/tag-colors";

export type TagCatalogRow = { name: string; color: string | null };

export function ManageTagsDialog({
  module,
  open,
  onOpenChange,
}: {
  module: TagModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mounted = useClientMounted();
  const [tags, setTags] = useState<TagCatalogRow[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(DEFAULT_TAG_PICKER_COLOR);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      void listModuleTags(module).then(setTags);
    });
  }, [module, open]);

  function refresh() {
    startTransition(() => {
      void listModuleTags(module).then(setTags);
    });
  }

  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" data-ff-manage-tags-dialog={module}>
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        aria-label="Close manage tags"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ff-manage-tags-title"
        className="absolute top-1/2 left-1/2 flex max-h-[min(88vh,40rem)] w-[min(40rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        data-ff-tag-manager={module}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 id="ff-manage-tags-title" className="text-base font-semibold text-navy">
              Manage {tagModuleLabel(module)} tags
            </h2>

          </div>
          <Button type="button" size="xs" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
          <form
            className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-2"
            data-ff-tag-create=""
            action={async (formData) => {
              await createModuleTag(formData);
              setDraftName("");
              refresh();
              flashAction("tag-created");
            }}
          >
            <input type="hidden" name="module" value={module} />
            <div>
              <label className="text-[11px] text-muted-foreground" htmlFor="ff-new-tag-name">
                New tag
              </label>
              <Input
                id="ff-new-tag-name"
                name="name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Name"
                className="h-8 w-40"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              Color
              <span
                className="inline-block size-6 rounded-sm border border-border"
                style={{ backgroundColor: draftColor }}
                data-ff-tag-color-live={draftColor}
                aria-hidden
              />
              <input
                type="color"
                name="color"
                value={draftColor}
                onChange={(event) => setDraftColor(event.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                aria-label="New tag color"
                data-ff-tag-color-picker=""
              />
            </label>
            <Button type="submit" size="xs">
              Create
            </Button>
          </form>

          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved tags for this module yet.</p>
          ) : (
            <ul className="space-y-3">
              {tags.map((tag) => (
                <li
                  key={tag.name}
                  className="ff-list-row sm:flex-nowrap"
                >
                  <form
                    action={async (formData) => {
                      await updateModuleTagColor(formData);
                      refresh();
                      flashAction("tag-color-saved");
                    }}
                    className="flex flex-wrap items-center gap-2"
                    data-ff-tag-color-edit={tag.name}
                  >
                    <input type="hidden" name="module" value={module} />
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
                  <form
                    action={async (formData) => {
                      await renameModuleTag(formData);
                      refresh();
                    }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="module" value={module} />
                    <input type="hidden" name="from" value={tag.name} />
                    <Input name="to" placeholder="New name" className="h-8 w-32" />
                    <Button type="submit" size="xs" variant="outline">
                      Rename
                    </Button>
                  </form>
                  <form
                    action={async (formData) => {
                      await mergeModuleTag(formData);
                      refresh();
                    }}
                    className="flex flex-wrap items-center gap-2"
                  >
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
                  <HardDeleteForm
                    action={async (formData) => {
                      await deleteModuleTag(formData);
                      refresh();
                    }}
                    subject={`tag ${formatTagLabel(tag.name)}`}
                  >
                    <input type="hidden" name="module" value={module} />
                    <input type="hidden" name="name" value={tag.name} />
                    <Button type="submit" size="xs" variant="ghost">
                      Delete
                    </Button>
                  </HardDeleteForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
