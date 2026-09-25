import Link from "next/link";
import { Building2, FolderOpen } from "lucide-react";
import { libraryHref } from "@/lib/documents/library";
import type { TypeCarrierGroup } from "@/lib/documents/type-folders";

export function TypeCarrierBrowse({
  groups,
  library,
  counts,
}: {
  groups: TypeCarrierGroup[];
  library: string;
  counts: Map<string, number>;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No type folders yet.</p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-ff-type-carrier-browse="">
      {groups.map((group) => {
        const href = group.folder
          ? libraryHref({ library, folderId: group.folder.id })
          : libraryHref({ library });
        const n = group.folder ? (counts.get(group.folder.id) ?? 0) : 0;
        return (
          <article key={group.typeKey} className="ff-card flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
                <h3 className="text-sm font-semibold text-navy">{group.label}</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">{n} files</span>
            </div>
            {group.carriers.length > 0 ? (
              <ul className="space-y-1.5">
                {group.carriers.map((carrier) => (
                  <li key={carrier.id}>
                    <Link
                      href={libraryHref({ library, folderId: carrier.id })}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm text-navy hover:border-primary/40"
                    >
                      <Building2 className="size-3.5 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1 truncate">{carrier.carrierName}</span>
                      <span className="text-[11px] text-muted-foreground">{counts.get(carrier.id) ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No carrier folders yet.</p>
            )}
            <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <FolderOpen className="size-3.5" />
              Open {group.label}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
