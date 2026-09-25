import { createFolder, moveFolder, renameFolder } from "@/app/actions/folders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DocumentFolder } from "@/lib/db/schema";
import type { DocumentLibrary } from "@/lib/domain";
import { folderRole, typeFolderOptions } from "@/lib/documents/folder-taxonomy";

export function FolderTools({
  library,
  folder,
  siblings,
}: {
  library: DocumentLibrary;
  folder: DocumentFolder | null;
  siblings: DocumentFolder[];
}) {
  const moveTargets = siblings.filter((row) => row.id !== folder?.id);
  const role = folderRole(folder?.id);
  const typeOptions = typeFolderOptions(library);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <form action={createFolder} className="ff-card space-y-2 p-3">
        <div className="text-sm font-semibold text-navy">
          {role === "type" ? "New type folder" : "New carrier folder"}
        </div>

        <input type="hidden" name="library" value={library} />
        {folder ? <input type="hidden" name="parentId" value={folder.id} /> : null}
        {role === "type" ? (
          <div>
            <Label className="text-xs">Type</Label>
            <select
              name="name"
              required
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Choose a type
              </option>
              {typeOptions.map((option) => (
                <option key={option.docType} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <Label className="text-xs">Carrier</Label>
            <Input name="name" required className="mt-1 h-8" placeholder="Citizens" />
          </div>
        )}
        <Button type="submit" size="sm">
          {role === "carrier" ? "Add carrier folder" : "Create type folder"}
        </Button>
      </form>

      <form action={renameFolder} className="ff-card space-y-2 p-3">
        <div className="text-sm font-semibold text-navy">Rename</div>
        {folder ? <input type="hidden" name="folderId" value={folder.id} /> : null}
        <input type="hidden" name="library" value={library} />
        <div>
          <Label className="text-xs">New name</Label>
          <Input
            name="name"
            required
            disabled={!folder}
            defaultValue={folder?.name ?? ""}
            className="mt-1 h-8"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={!folder}>
          {folder ? "Rename folder" : "Open a folder first"}
        </Button>
      </form>

      <form action={moveFolder} className="ff-card space-y-2 p-3">
        <div className="text-sm font-semibold text-navy">Move</div>
        {folder ? <input type="hidden" name="folderId" value={folder.id} /> : null}
        <input type="hidden" name="library" value={library} />
        <div>
          <Label className="text-xs">Destination</Label>
          <select
            name="parentId"
            disabled={!folder}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue=""
          >
            <option value="">Library root</option>
            {moveTargets.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={!folder}>
          Move folder
        </Button>
      </form>
    </div>
  );
}
