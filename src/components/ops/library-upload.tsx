import { uploadDocument } from "@/app/actions/documents";
import { ChooseFiles } from "@/components/choose-files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOC_TYPE_LABELS, DOC_TYPES } from "@/lib/domain";

export function LibraryUpload({
  related,
}: {
  related: {
    contacts: { id: string; firstName: string; lastName: string }[];
    deals: { id: string; title: string }[];
    policies: { id: string; policyNumber: string }[];
  };
}) {
  return (
    <form action={uploadDocument} className="space-y-2">
      <div>
        <Label className="text-xs">Deal</Label>
        <select name="dealId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
          <option value="">None</option>
          {related.deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Contact</Label>
        <select name="contactId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
          <option value="">None</option>
          {related.contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.lastName}, {c.firstName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Policy</Label>
        <select name="policyId" className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
          <option value="">None</option>
          {related.policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.policyNumber}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Type</Label>
        <select
          name="docType"
          defaultValue="dec"
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOC_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-xs">Tags</Label>
        <Input name="tags" className="mt-1 h-8" placeholder="dec, wind-mit, photos" />
      </div>
      <div>
        <Label className="text-xs">File</Label>
        <ChooseFiles name="file" required className="mt-1" />
      </div>
      <Button type="submit" size="sm">
        Upload
      </Button>
    </form>
  );
}
