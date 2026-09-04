import { createFolder, moveFolder, renameFolder } from "@/app/actions/folders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DocumentFolder } from "@/lib/db/schema";
import type { DocumentLibrary } from "@/lib/domain";

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
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <form action={createFolder} className="ff-card space-y-2 p-3">
        <div className="text-sm font-semibold text-navy">New folder</div>
        <input type="hidden" name="library" value={library} />
        {folder ? <input type="hidden" name="parentId" value={folder.id} /> : null}
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            name="name"
            required
            className="mt-1 h-8"
            placeholder={library === "forms" ? "HO applications" : "Hurricane season"}
          />
        </div>
        <Button type="submit" size="sm">
          {folder ? "Add subfolder" : "Create folder"}
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
