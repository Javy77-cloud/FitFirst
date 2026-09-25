"use client";

import { useMemo, useRef, useState } from "react";
import { uploadLeadLineDocument } from "@/app/actions/documents";
import { ChooseFileButton } from "@/components/choose-file-button";
import { FileActionMenu } from "@/components/documents/file-action-menu";
import { FileDeleteIcon } from "@/components/ui/file-delete-icon";
import { Button } from "@/components/ui/button";
import { fileViewHref } from "@/lib/files/urls";
import { productMenuTitle } from "@/lib/policy/eo";
import {
  FORM_TAG_PREFIX,
  desiredDocFormId,
  docCardKeyFromTags,
  documentFormKeysFromDocs,
  formTag,
  isImageDoc,
  labelForDocCardKey,
  leadDocFormById,
  leadDocumentCardKeys,
  remainingLeadDocFormKeys,
  shopLineForDocCardKey,
} from "@/lib/leads/line-documents";

export type LeadLineDoc = {
  id: string;
  filename: string;
  mimeType: string;
  tags: string[] | null;
  slot: string;
  docType: string;
};

export function LeadLineDocuments({
  leadId,
  dealId,
  insuranceTypeDesired,
  docs,
  extraKeys,
  onExtraKeys,
  hiddenKeys,
  onHiddenKeys,
}: {
  leadId: string;
  dealId?: string | null;
  insuranceTypeDesired?: string | null;
  docs: LeadLineDoc[];
  extraKeys: string[];
  onExtraKeys: (keys: string[]) => void;
  hiddenKeys: string[];
  onHiddenKeys: (keys: string[]) => void;
}) {
  const documentKeys = documentFormKeysFromDocs(docs);
  const hidden = new Set(hiddenKeys);
  const keys = leadDocumentCardKeys({
    insuranceTypeDesired,
    documentKeys,
    extraKeys,
  }).filter((key) => !hidden.has(key));
  const leftover = remainingLeadDocFormKeys(keys);
  const openFormId = desiredDocFormId(insuranceTypeDesired);
  const openKey = openFormId ? formTag(openFormId) : null;

  return (
    <aside className="ff-card min-w-0 p-4" data-ff-lead-line-docs>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-navy">Documents by line</h2>
          <p className="text-xs text-muted-foreground">
            Each policy subtype has its own files. Convert carries them onto the deal in the same
            groups.
          </p>
        </div>
        {leftover.length > 0 ? (
          <label className="text-xs font-medium text-navy">
            Add line
            <select
              className="mt-1 h-8 w-40 rounded-md border border-input bg-card px-2 text-sm"
              defaultValue=""
              aria-label="Add line"
              data-ff-add-line=""
              onChange={(event) => {
                const next = event.target.value;
                if (!next) return;
                onExtraKeys(extraKeys.includes(next) ? extraKeys : [...extraKeys, next]);
                onHiddenKeys(hiddenKeys.filter((key) => key !== next));
                event.target.value = "";
              }}
            >
              <option value="">Choose a line</option>
              {leftover.map((key) => (
                <option key={key} value={key} title={productMenuTitle(labelForDocCardKey(key))}>
                  {labelForDocCardKey(key)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="space-y-2">
        {keys.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-sm text-muted-foreground" data-ff-add-line-empty="">
            Add a line of interest.
          </p>
        ) : (
          keys.map((key) => (
            <LineCard
              key={key}
              cardKey={key}
              leadId={leadId}
              dealId={dealId}
              docs={docs.filter((doc) => docCardKeyFromTags(doc.tags) === key)}
              defaultOpen={key === openKey}
              onRemove={() => {
                onExtraKeys(extraKeys.filter((item) => item !== key));
                onHiddenKeys(hidden.has(key) ? hiddenKeys : [...hiddenKeys, key]);
              }}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function LineCard({
  cardKey,
  leadId,
  dealId,
  docs,
  defaultOpen,
  onRemove,
}: {
  cardKey: string;
  leadId: string;
  dealId?: string | null;
  docs: LeadLineDoc[];
  defaultOpen: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [slots, setSlots] = useState([0]);
  const [nextSlot, setNextSlot] = useState(1);
  const [pendingNames, setPendingNames] = useState<Record<number, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const label = labelForDocCardKey(cardKey);
  const formId = cardKey.startsWith(FORM_TAG_PREFIX)
    ? cardKey.slice(FORM_TAG_PREFIX.length)
    : leadDocFormById(cardKey)?.id ?? null;
  const shopLine = shopLineForDocCardKey(cardKey);
  const cardAttr = formId ?? shopLine ?? cardKey;

  const countLabel = useMemo(() => {
    if (docs.length === 1) return "1 file";
    return `${docs.length} files`;
  }, [docs.length]);

  const pendingCount = Object.values(pendingNames).filter(Boolean).length;

  return (
    <article className="min-w-0 rounded-md border border-border" data-ff-line-card={cardAttr}>
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left hover:bg-secondary/60"
          aria-expanded={open}
        >
          <span className="truncate text-sm font-semibold text-navy">{label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {countLabel} · {open ? "Collapse" : "Expand"}
          </span>
        </button>
        <span className="shrink-0" data-ff-line-card-delete={cardAttr}>
          <FileDeleteIcon type="button" label={`Remove ${label}`} onClick={onRemove} />
        </span>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <form ref={formRef} action={uploadLeadLineDocument} className="space-y-2">
            <input type="hidden" name="leadId" value={leadId} />
            {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
            {formId ? <input type="hidden" name="quotingForm" value={formId} /> : null}
            {shopLine ? <input type="hidden" name="line" value={shopLine} /> : null}
            <input type="hidden" name="rowCount" value={slots.length} />
            <div
              data-ff-line-dropzone={cardAttr}
              className="rounded-md border border-dashed border-border bg-secondary/30 px-3 py-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const files = Array.from(event.dataTransfer.files);
                if (files.length === 0 || !formRef.current) return;
                // Fill empty slots first, then append slots for leftovers — do not auto-submit.
                const names: Record<number, string> = { ...pendingNames };
                const needed = Math.max(0, files.length - slots.length);
                if (needed > 0) {
                  const add: number[] = [];
                  let n = nextSlot;
                  for (let i = 0; i < needed; i += 1) {
                    add.push(n);
                    n += 1;
                  }
                  setSlots((current) => [...current, ...add]);
                  setNextSlot(n);
                }
                window.setTimeout(() => {
                  const inputs = formRef.current?.querySelectorAll<HTMLInputElement>('input[type="file"]');
                  if (!inputs) return;
                  files.forEach((file, i) => {
                    const input = inputs[i];
                    if (!input) return;
                    const transfer = new DataTransfer();
                    transfer.items.add(file);
                    input.files = transfer.files;
                    names[i] = file.name;
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                  });
                  setPendingNames({ ...names });
                }, 0);
              }}
            >
              <p className="mb-2 text-xs text-muted-foreground">
                Drop files here or choose below. Add as many as you need, then Upload.
              </p>
              <div className="space-y-2">
                {slots.map((id, index) => (
                  <div key={id} className="min-w-0 space-y-1" data-ff-file-slot={index}>
                    <ChooseFileButton
                      name={`files_${index}`}
                      accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*"
                      className="max-w-full min-w-0"
                      onFile={(file) => {
                        setPendingNames((current) => {
                          const next = { ...current };
                          if (file) next[index] = file.name;
                          else delete next[index];
                          return next;
                        });
                      }}
                    />
                    {pendingNames[index] ? (
                      <p
                        className="truncate text-xs font-medium text-navy"
                        title={pendingNames[index]}
                        data-ff-pending-filename={index}
                      >
                        {pendingNames[index]}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-ff-add-another-file=""
                  onClick={() => {
                    setSlots((current) => [...current, nextSlot]);
                    setNextSlot((value) => value + 1);
                  }}
                >
                  + Add another file
                </Button>
                <Button type="submit" size="sm" disabled={pendingCount === 0} data-ff-upload-line-files="">
                  Upload {pendingCount > 0 ? `(${pendingCount})` : ""}
                </Button>
              </div>
            </div>
          </form>
          {docs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No files on {label} yet.</p>
          ) : (
            <ul className="min-w-0 space-y-1.5" data-ff-line-file-list="">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="ff-file-row min-w-0 overflow-hidden rounded-md border border-border/70 px-2 py-1.5"
                  data-ff-line-file={doc.id}
                >
                  <FileActionMenu
                    documentId={doc.id}
                    filename={doc.filename}
                    mimeType={doc.mimeType}
                    slot={doc.slot}
                    docType={doc.docType}
                    tags={doc.tags}
                    leadId={leadId}
                    dealId={dealId}
                    returnTo={`/leads/${leadId}`}
                    className="min-w-0 flex-1"
                  >
                    {isImageDoc(doc) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fileViewHref(doc.id)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-semibold uppercase text-muted-foreground">
                        {doc.filename.split(".").pop()?.slice(0, 4) || "file"}
                      </span>
                    )}
                    <span
                      title={doc.filename}
                      className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-medium text-navy"
                      data-ff-line-filename=""
                    >
                      {doc.filename}
                    </span>
                  </FileActionMenu>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  );
}
