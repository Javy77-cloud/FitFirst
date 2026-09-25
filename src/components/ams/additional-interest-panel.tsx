import {
  deleteAdditionalInterest,
  saveAdditionalInterest,
} from "@/app/actions/ams";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatInterestLine,
  INTEREST_KINDS,
  interestKindLabel,
} from "@/lib/ams/additional-interests";
import type { InterestKind } from "@/lib/domain-ams";
import type { PolicyAdditionalInterest } from "@/lib/db/schema";

export function AdditionalInterestPanel({
  policyId,
  interests,
  kinds = INTEREST_KINDS,
  variant = "personal",
}: {
  policyId: string;
  interests: PolicyAdditionalInterest[];
  kinds?: readonly InterestKind[];
  variant?: "personal" | "commercial";
}) {
  const commercial = variant === "commercial";
  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">
        {commercial ? "Certificate holder / additional insured" : "Mortgagee / additional interest"}
      </h2>

      {interests.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No mortgagee or additional interest on file.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {interests.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium text-navy">{formatInterestLine(row)}</div>
                {row.address ? (
                  <p className="text-sm text-muted-foreground">
                    {row.address}
                    {row.zip ? ` ${row.zip}` : ""}
                  </p>
                ) : null}
                {row.clause || row.notes ? (
                  <p className="text-sm text-muted-foreground">
                    {[row.clause, row.notes].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              <HardDeleteForm action={deleteAdditionalInterest} subject="this additional interest">
                <input type="hidden" name="policyId" value={policyId} />
                <input type="hidden" name="interestId" value={row.id} />
                <Button type="submit" size="sm" variant="secondary">
                  Remove
                </Button>
              </HardDeleteForm>
            </li>
          ))}
        </ul>
      )}

      <form action={saveAdditionalInterest} className="mt-4 grid gap-3 border-t border-border pt-4">
        <input type="hidden" name="policyId" value={policyId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Type</Label>
            <select
              name="kind"
              required
              defaultValue="mortgagee"
              className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {interestKindLabel(kind)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" required className="mt-1" placeholder="First Community Bank ISAOA" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Mailing address</Label>
          <AddressAutocomplete name="address" className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">City</Label>
            <Input name="city" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input name="state" className="mt-1" maxLength={2} />
          </div>
          <div>
            <Label className="text-xs">ZIP</Label>
            <Input name="zip" className="mt-1" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Loan number</Label>
            <Input name="loanNumber" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Clause</Label>
            <Input name="clause" className="mt-1" placeholder="ISAOA/ATIMA" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea name="notes" rows={2} className="mt-1" />
        </div>
        <Button type="submit" size="sm">
          Add interest
        </Button>
      </form>
    </section>
  );
}
