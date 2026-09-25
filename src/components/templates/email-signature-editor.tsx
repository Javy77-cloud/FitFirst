"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isAllowedSignatureImage,
  previewMergedSignature,
  SIGNATURE_MERGE_CHIPS,
  signatureToPreviewHtml,
} from "@/lib/templates/signature-html";

export function EmailSignatureEditor({
  id,
  name,
  bodyEn,
  bodyEs,
  isExampleCopy,
  agencyName,
  disabled = false,
  saveAction,
  testSendAction,
}: {
  id?: string;
  name: string;
  bodyEn: string;
  bodyEs: string;
  isExampleCopy: boolean;
  agencyName?: string;
  disabled?: boolean;
  saveAction: (formData: FormData) => void | Promise<void>;
  testSendAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [locale, setLocale] = useState<"en" | "es">("en");
  const [en, setEn] = useState(bodyEn);
  const [es, setEs] = useState(bodyEs);
  const [imageError, setImageError] = useState<string | null>(null);
  const enRef = useRef<HTMLTextAreaElement>(null);
  const esRef = useRef<HTMLTextAreaElement>(null);
  const body = locale === "en" ? en : es;
  const preview = useMemo(
    () => previewMergedSignature(body, { agencyName }),
    [agencyName, body],
  );

  function insertAtCursor(token: string) {
    const ref = locale === "en" ? enRef : esRef;
    const el = ref.current;
    const current = locale === "en" ? en : es;
    if (!el) {
      if (locale === "en") setEn(`${current}${token}`);
      else setEs(`${current}${token}`);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    if (locale === "en") setEn(next);
    else setEs(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  function wrapSelection(before: string, after: string) {
    const ref = locale === "en" ? enRef : esRef;
    const el = ref.current;
    const current = locale === "en" ? en : es;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = current.slice(start, end) || "text";
    const next = `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`;
    if (locale === "en") setEn(next);
    else setEs(next);
  }

  async function onPickImage(file: File | undefined) {
    setImageError(null);
    if (!file) return;
    const guard = isAllowedSignatureImage(file);
    if (!guard.ok) {
      setImageError(guard.reason);
      return;
    }
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    insertAtCursor(`<img src="${src}" alt="signature image" width="96" />`);
  }

  return (
    <form action={saveAction} className="space-y-4" data-ff-signature-editor="">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input type="hidden" name="bodyEn" value={en} />
      <input type="hidden" name="bodyEs" value={es} />
      <fieldset disabled={disabled} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" defaultValue={name} className="mt-1 h-8 max-w-md" />
          </div>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="isExampleCopy" value="true" defaultChecked={isExampleCopy} />
            Mark as example copy
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
              className={`rounded px-3 py-1 text-xs font-medium ${
                locale === "en" ? "bg-primary text-primary-foreground" : "text-navy hover:bg-muted"
              }`}
            >
              English
            </button>
            <button
              type="button"
              aria-pressed={locale === "es"}
              onClick={() => setLocale("es")}
              className={`rounded px-3 py-1 text-xs font-medium ${
                locale === "es" ? "bg-primary text-primary-foreground" : "text-navy hover:bg-muted"
              }`}
            >
              Español
            </button>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={() => wrapSelection("<strong>", "</strong>")}>
            Bold
          </Button>
          <Button type="button" size="xs" variant="outline" onClick={() => wrapSelection("<em>", "</em>")}>
            Italic
          </Button>
          <Button type="button" size="xs" variant="outline" onClick={() => insertAtCursor("<br />\n")}>
            Line
          </Button>
          <label className="text-xs text-primary hover:underline">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                void onPickImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            Add logo / headshot
          </label>
        </div>
        {imageError ? <p className="text-xs text-destructive">{imageError}</p> : null}

        <div className="flex flex-wrap gap-1.5">
          {SIGNATURE_MERGE_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => insertAtCursor(`{{${chip.key}}}`)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-navy hover:border-primary/40"
            >
              {`{{${chip.key}}}`}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="ff-card space-y-2 p-4">
            <h2 className="text-sm font-semibold text-navy">{locale === "en" ? "English" : "Español"}</h2>
            <Textarea
              ref={locale === "en" ? enRef : esRef}
              rows={10}
              value={body}
              onChange={(event) => (locale === "en" ? setEn(event.target.value) : setEs(event.target.value))}
              className="font-mono text-sm"
            />

          </div>
          <div className="ff-card space-y-2 p-4" data-ff-signature-preview="">
            <h2 className="text-sm font-semibold text-navy">Live preview</h2>

            <div
              className="min-h-40 rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 text-navy"
              dangerouslySetInnerHTML={{
                __html: signatureToPreviewHtml(preview) || "<span class='text-muted-foreground'>Empty close.</span>",
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Save signature
          </Button>
          {testSendAction ? (
            <Button formAction={testSendAction} type="submit" size="sm" variant="outline" name="locale" value={locale}>
              Test-send to me
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
