import Link from "next/link";
import { File, FileSpreadsheet, FileText, ImageIcon, Megaphone, Newspaper } from "lucide-react";
import type { Document } from "@/lib/db/schema";
import { docTypeLabel, fillHref } from "@/lib/documents/library";
import { fileGlyph } from "@/lib/ops/documents";

const ICONS = {
  folder: File,
  pdf: FileText,
  image: ImageIcon,
  form: FileSpreadsheet,
  flyer: Megaphone,
  note: Newspaper,
  file: File,
};

export function FileList({
  docs,
  templates,
  empty,
}: {
  docs: Document[];
  templates?: { slug: string; name: string; family: string | null; fillable?: boolean | null }[];
  empty: string;
}) {
  const hasTemplates = (templates ?? []).length > 0;
  if (docs.length === 0 && !hasTemplates) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      {hasTemplates ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates!.map((template) => (
            <li key={template.slug} className="ff-doc-tile">
              <span className="ff-doc-icon ff-doc-accent">
                <FileSpreadsheet className="size-4" />
              </span>
              <div>
                <div className="text-[11px] uppercase text-muted-foreground">
                  Fillable · {template.family ?? "Form"}
                </div>
                <div className="text-sm font-semibold text-navy">{template.name}</div>
              </div>
              <Link href={fillHref(template.slug)} className="text-sm text-primary hover:underline">
                Open fill workspace
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {docs.length > 0 ? (
        <table className="ff-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Fillable</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => {
              const glyph = fileGlyph(doc.docType, doc.mimeType);
              const Icon = ICONS[glyph.icon];
              return (
                <tr key={doc.id}>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span className={`ff-doc-icon ff-doc-${glyph.tone} !size-7`}>
                        <Icon className="size-3.5" />
                      </span>
                      <a href={`/api/documents/${doc.id}`} className="font-medium text-navy hover:underline">
                        {doc.filename}
                      </a>
                    </span>
                  </td>
                  <td>{docTypeLabel(doc.docType)}</td>
                  <td>
                    {doc.fillable && doc.formTemplateId ? (
                      <Link
                        href={fillHref(slugFromDoc(doc))}
                        className="text-sm text-primary hover:underline"
                      >
                        Fill
                      </Link>
                    ) : doc.fillable ? (
                      "Yes"
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function slugFromDoc(doc: Document): string {
  if (doc.docType === "cancellation") return "agency-cancellation";
  if (doc.docType === "aor") return "agency-aor";
  if (doc.docType === "acord") return "fl-ho3";
  return "fl-ho3";
}
