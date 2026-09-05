"use client";

import { useState } from "react";
import { saveFillLearningCorrection } from "@/app/actions/fill-learning";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FILL_LEARNING_DOC_TYPES, fillLearningDocTypeLabel } from "@/lib/fill-learning/doc-types";
import { DEAL_ID } from "@/lib/fixtures/ids";

export function MarkMappingWrong({
  dealId,
  line,
  fieldKey,
  fieldLabel,
  extractedValue,
  carriers = [],
}: {
  dealId: string;
  line: string;
  fieldKey: string;
  fieldLabel: string;
  extractedValue: string;
  carriers?: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const locked = dealId === DEAL_ID && fieldKey === "coverage_a";

  if (locked) {
    return <span className="text-helper text-muted-foreground">Ana Cov A locked</span>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)}>
        Mark mapping wrong
      </Button>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Save fill correction</DialogTitle>
          <DialogDescription>
            Writes a Fill Learning row for {fieldLabel}, then updates this master-sheet cell.
            Next ingest for the same document type + field uses the latest safe agency correction.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await saveFillLearningCorrection(formData);
            setOpen(false);
          }}
          className="grid gap-3"
        >
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="line" value={line} />
          <input type="hidden" name="fieldKey" value={fieldKey} />
          <div>
            <Label className="text-xs">Source document</Label>
            <select
              name="docType"
              required
              defaultValue="dec"
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {FILL_LEARNING_DOC_TYPES.map((docType) => (
                <option key={docType} value={docType}>
                  {fillLearningDocTypeLabel(docType)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Extracted value</Label>
            <Input name="extractedValue" defaultValue={extractedValue} className="mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs">Corrected value</Label>
            <Input
              name="correctedValue"
              required
              defaultValue={extractedValue}
              className="mt-1 h-8"
              placeholder="What this cell should be"
            />
          </div>
          <div>
            <Label className="text-xs">Note</Label>
            <Input
              name="note"
              className="mt-1 h-8"
              placeholder="Dec CBS is masonry · wind mit year was roof"
            />
          </div>
          <div>
            <Label className="text-xs">Carrier if paste failed (optional)</Label>
            <select
              name="carrierId"
              defaultValue=""
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="">None</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" size="sm">
              Save correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
