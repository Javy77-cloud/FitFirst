"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDocumentTermRoleInline } from "@/app/actions/documents";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { formatDay } from "@/lib/domain";
import {
  DOCUMENT_TERM_ROLES,
  formatTermLengthMonths,
  termMonthsFromTags,
  termRoleFromTags,
  type DocumentTermRole,
} from "@/lib/documents/document-labels";
import { autoTagDocType, docExpiryWarning } from "@/lib/policy/document-depth";
import { flashAction } from "@/lib/flash-client";

export type PolicyDocRow = {
  id: string;
  filename: string;
  docType: string;
  slot?: string | null;
  tags?: string[] | null;
  createdAt?: Date | string | null;
  expiresAt?: Date | string | null;
  versionCount?: number;
};

const SHORT_TERM_ROLE_LABEL: Record<DocumentTermRole, string> = {
  prior: "Prior",
  current: "Current",
  renewal: "Renewal",
};

function TermRoleSelect({
  documentId,
  policyId,
  dealId,
  termRole,
}: {
  documentId: string;
  policyId: string;
  dealId?: string | null;
  termRole: DocumentTermRole | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    startTransition(async () => {
      const result = await setDocumentTermRoleInline({
        documentId,
        termRole: value || "clear",
        policyId,
        dealId,
      });
      if (!result.ok) {
        flashAction(result.error, "error");
        return;
      }
      flashAction("document-term-role-updated");
      router.refresh();
    });
  }

  return (
    <select
      className="h-8 max-w-[9.5rem] rounded-md border border-input bg-card px-1.5 text-xs"
      value={termRole ?? ""}
      disabled={pending}
      aria-label="Term role"
      data-ff-doc-term-role-select={documentId}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Not set —</option>
      {DOCUMENT_TERM_ROLES.map((option) => (
        <option key={option.value} value={option.value}>
          {SHORT_TERM_ROLE_LABEL[option.value]}
        </option>
      ))}
    </select>
  );
}

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
            <th>Term role</th>
            <th>Length</th>
            <th>Uploaded</th>
            <th>DEC expires</th>
            <th>Versions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((file) => {
            const warn = docExpiryWarning(file.docType, file.expiresAt);
            const termRole = termRoleFromTags(file.tags);
            const lengthLabel = formatTermLengthMonths(termMonthsFromTags(file.tags));
            return (
              <tr key={file.id}>
                <td className="font-medium">
                  <FileActionMenu
                    documentId={file.id}
                    filename={file.filename}
                    slot={file.slot ?? undefined}
                    docType={file.docType}
                    tags={file.tags}
                    dealId={dealId ?? null}
                    policyId={policyId}
                    returnTo={`/policies/${policyId}?tab=documents`}
                  >
                    {file.filename}
                  </FileActionMenu>
                </td>
                <td>
                  <span className="rounded-sm border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium uppercase text-navy">
                    {autoTagDocType(file.docType)}
                  </span>
                </td>
                <td>
                  <div className="flex flex-col gap-1" data-ff-doc-term-role={termRole ?? undefined}>
                    <TermRoleSelect
                      documentId={file.id}
                      policyId={policyId}
                      dealId={dealId}
                      termRole={termRole}
                    />
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">
                  {lengthLabel ? (
                    <span
                      className="rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-navy"
                      data-ff-doc-term-length=""
                    >
                      {lengthLabel}
                    </span>
                  ) : (
                    "—"
                  )}
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
