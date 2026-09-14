"use client";

import { useMemo, useState } from "react";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { formatDay } from "@/lib/domain";
import { autoTagDocType, docExpiryWarning } from "@/lib/policy/document-depth";

export type PolicyDocRow = {
  id: string;
  filename: string;
  docType: string;
  slot?: string | null;
  createdAt?: Date | string | null;
  expiresAt?: Date | string | null;
  versionCount?: number;
};

export function PolicyDocumentsTable({
  files,
  policyId,
  dealId,
}: {
  files: PolicyDocRow[];
  policyId: string;
  dealId?: string | null;
}) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "type">("newest");

  const tags = useMemo(() => {
    const set = new Set(files.map((f) => autoTagDocType(f.docType)));
    return ["all", ...[...set].sort()];
  }, [files]);

  const rows = useMemo(() => {
    let list = [...files];
    if (filter !== "all") {
      list = list.filter((f) => autoTagDocType(f.docType) === filter);
    }
    list.sort((a, b) => {
      if (sort === "name") return a.filename.localeCompare(b.filename);
      if (sort === "type") return autoTagDocType(a.docType).localeCompare(autoTagDocType(b.docType));
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sort === "oldest" ? at - bt : bt - at;
    });
    return list;
  }, [files, filter, sort]);

  if (files.length === 0) {
    return <p className="text-base text-muted-foreground">No policy files yet.</p>;
  }

  return (
    <div className="space-y-3" data-ff-policy-docs-table="">
      <div className="flex flex-wrap gap-2">
        <label className="text-xs text-muted-foreground">
          Filter
          <select
            className="ml-1 h-8 rounded-md border border-input bg-card px-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag === "all" ? "All types" : tag}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Sort
          <select
            className="ml-1 h-8 rounded-md border border-input bg-card px-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
        </label>
      </div>
      <table className="ff-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Type</th>
            <th>Uploaded</th>
            <th>Expires</th>
            <th>Versions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((file) => {
            const warn = docExpiryWarning(file.docType, file.expiresAt);
            return (
              <tr key={file.id}>
                <td className="font-medium">
                  <FileActionMenu
                    documentId={file.id}
                    filename={file.filename}
                    slot={file.slot ?? undefined}
                    docType={file.docType}
                    dealId={dealId ?? null}
                    policyId={policyId}
                  >
                    {file.filename}
                  </FileActionMenu>
                </td>
                <td>
                  <span className="rounded-sm border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium uppercase text-navy">
                    {autoTagDocType(file.docType)}
                  </span>
                </td>
                <td className="text-sm text-muted-foreground">
                  {file.createdAt ? formatDay(file.createdAt) : "—"}
                </td>
                <td className="text-sm">
                  {file.expiresAt ? formatDay(file.expiresAt) : "—"}
                  {warn.warn ? (
                    <span className="ml-2 text-xs font-medium text-destructive">{warn.label}</span>
                  ) : null}
                </td>
                <td className="text-sm text-muted-foreground">
                  {file.versionCount && file.versionCount > 1
                    ? `${file.versionCount} versions`
                    : "1"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
