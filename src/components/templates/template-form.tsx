import { saveEmailTemplate } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EMAIL_TEMPLATE_KINDS, MERGE_FIELDS, type EmailTemplateKind } from "@/lib/domain";
import type { EmailTemplate } from "@/lib/db/schema";

const KIND_LABEL: Record<EmailTemplateKind, string> = {
  google_review: "Google review",
  checkin_4mo: "Four-month check-in",
  renewal_awareness: "Renewal awareness",
  custom: "Custom",
};

export function TemplateForm({
  template,
  readOnly = false,
}: {
  template?: EmailTemplate;
  readOnly?: boolean;
}) {
  return (
    <form action={saveEmailTemplate} className="space-y-4">
      {template ? <input type="hidden" name="id" value={template.id} /> : null}
      <fieldset disabled={readOnly} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name" className="text-xs">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={template?.name ?? ""}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="kind" className="text-xs">
            Kind
          </Label>
          <select
            id="kind"
            name="kind"
            defaultValue={
              template && "kind" in template && typeof template.kind === "string"
                ? template.kind
                : "custom"
            }
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {EMAIL_TEMPLATE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <input type="hidden" name="slug" value={template?.slug ?? ""} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isExampleCopy"
          value="true"
          defaultChecked={
            template && "isExampleCopy" in template ? Boolean(template.isExampleCopy) : true
          }
        />
        Mark as example copy Javy can edit
      </label>
      <p className="text-xs text-muted-foreground">
        Merge fields:{" "}
        {MERGE_FIELDS.map((field) => (
          <code key={field.key} className="mr-2 rounded bg-muted px-1">
            {`{{${field.key}}}`}
          </code>
        ))}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="ff-card space-y-3 p-4">
          <legend className="px-1 text-sm font-semibold text-navy">English</legend>
          <div>
            <Label htmlFor="subjectEn" className="text-xs">
              Subject
            </Label>
            <Input
              id="subjectEn"
              name="subjectEn"
              required
              defaultValue={
                (template && "subjectEn" in template && typeof template.subjectEn === "string"
                  ? template.subjectEn
                  : template?.subject) ?? ""
              }
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label htmlFor="bodyEn" className="text-xs">
              Body
            </Label>
            <Textarea
              id="bodyEn"
              name="bodyEn"
              required
              rows={12}
              defaultValue={
                (template && "bodyEn" in template && typeof template.bodyEn === "string"
                  ? template.bodyEn
                  : template?.body) ?? ""
              }
              className="mt-1 font-mono text-sm"
            />
          </div>
        </fieldset>
        <fieldset className="ff-card space-y-3 p-4">
          <legend className="px-1 text-sm font-semibold text-navy">Español</legend>
          <div>
            <Label htmlFor="subjectEs" className="text-xs">
              Asunto
            </Label>
            <Input
              id="subjectEs"
              name="subjectEs"
              required
              defaultValue={
                template && "subjectEs" in template && typeof template.subjectEs === "string"
                  ? template.subjectEs
                  : ""
              }
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label htmlFor="bodyEs" className="text-xs">
              Cuerpo
            </Label>
            <Textarea
              id="bodyEs"
              name="bodyEs"
              required
              rows={12}
              defaultValue={
                template && "bodyEs" in template && typeof template.bodyEs === "string"
                  ? template.bodyEs
                  : ""
              }
              className="mt-1 font-mono text-sm"
            />
          </div>
        </fieldset>
      </div>
      {readOnly ? null : (
        <Button type="submit" size="sm">
          {template ? "Save template" : "Create template"}
        </Button>
      )}
      </fieldset>
    </form>
  );
}
