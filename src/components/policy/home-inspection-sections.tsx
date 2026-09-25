"use client";

import { Eye } from "lucide-react";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { DocumentViewButton } from "@/components/documents/document-preview-dialog";
import type { HomeInspectionDocumentLink, HomeInspectionSection } from "@/lib/policy/home-overview-inspections";

function InspectionDocEye({
  document,
  label,
}: {
  document: HomeInspectionDocumentLink;
  label: string;
}) {
  return (
    <span data-ff-home-inspection-eye={document.id} className="inline-flex">
      <DocumentViewButton
        documentId={document.id}
        filename={document.filename}
        mimeType={document.mimeType}
        className="inline-flex size-8 items-center justify-center rounded-md text-navy no-underline hover:bg-muted hover:no-underline"
      >
        <Eye className="size-4" aria-hidden />
        <span className="sr-only">{label}</span>
      </DocumentViewButton>
    </span>
  );
}

const EYE_LABEL: Record<HomeInspectionSection["id"], string> = {
  roof: "View wind mitigation",
  four_point: "View four-point inspection",
  roof_and_four_point: "View inspection",
};

/**
 * Collapsed roof / four-point blocks. The eye opens the deal document popup.
 * The PDF stays on the deal Documents library.
 */
export function HomeInspectionSections({ sections }: { sections: HomeInspectionSection[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="space-y-4" data-ff-home-inspections="">
      {sections.map((section) => (
        <CollapsibleSection
          key={section.id}
          id={`home-inspection-${section.id}`}
          title={section.title}
          defaultOpen={false}
          data-ff={`home-inspection-${section.id}`}
          badge={
            section.note ? <span data-ff-home-inspection-note="">{section.note}</span> : undefined
          }
          trailing={
            section.document ? (
              <InspectionDocEye document={section.document} label={EYE_LABEL[section.id]} />
            ) : null
          }
        >
          {section.fields.length > 0 ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {section.fields.map((row) => (
                <div key={row.key} data-ff-home-inspection-field={row.key}>
                  <dt className="text-helper text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium text-navy">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </CollapsibleSection>
      ))}
    </div>
  );
}
