"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBusinessPopup } from "@/app/actions/businesses-ops";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SourceSelect } from "@/components/crm/source-select";
import { AddressFieldset } from "@/components/address-autocomplete";
import {
  BUSINESS_ENTITY_TYPE_OPTIONS,
  BUSINESS_INDUSTRY_OPTIONS,
} from "@/lib/businesses/entity-industry";
import {
  businessMatchLabel,
  businessMatchReasonText,
  findExistingBusinessMatch,
  type ExistingBusinessRow,
} from "@/lib/businesses/existing-business-match";
import { cn } from "@/lib/utils";

export function AddBusinessDialog({
  businesses,
  defaultOpen = false,
}: {
  businesses: ExistingBusinessRow[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [dba, setDba] = useState("");
  const [ein, setEin] = useState("");
  const [entityType, setEntityType] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [referral, setReferral] = useState("");
  const [tags, setTags] = useState("");
  const [lifeNotes, setLifeNotes] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [pcNotes, setPcNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const match = useMemo(
    () =>
      findExistingBusinessMatch(businesses, {
        name: legalName || dba,
        legalName,
        dba,
        ein,
      }),
    [businesses, legalName, dba, ein],
  );

  function reset() {
    setLegalName("");
    setDba("");
    setEin("");
    setEntityType("");
    setIndustry("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setReferral("");
    setTags("");
    setLifeNotes("");
    setHealthNotes("");
    setPcNotes("");
    setError(null);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("legalName", legalName);
      fd.set("name", legalName || dba);
      fd.set("dba", dba);
      fd.set("ein", ein);
      fd.set("entityType", entityType);
      fd.set("industry", industry);
      fd.set("phone", phone);
      fd.set("email", email);
      fd.set("website", website);
      fd.set("referral", referral);
      fd.set("tags", tags);
      fd.set("lifeNotes", lifeNotes);
      fd.set("healthNotes", healthNotes);
      fd.set("pcNotes", pcNotes);
      const sourceEl = document.querySelector<HTMLSelectElement | HTMLInputElement>(
        '[data-ff-add-business-dialog] [name="source"]',
      );
      if (sourceEl?.value) fd.set("source", sourceEl.value);
      const mailingEl = document.querySelector<HTMLInputElement>(
        '[data-ff-add-business-dialog] [name="mailingAddress"]',
      );
      const cityEl = document.querySelector<HTMLInputElement>(
        '[data-ff-add-business-dialog] [name="city"]',
      );
      const stateEl = document.querySelector<HTMLInputElement>(
        '[data-ff-add-business-dialog] [name="state"]',
      );
      const zipEl = document.querySelector<HTMLInputElement>(
        '[data-ff-add-business-dialog] [name="zip"]',
      );
      if (mailingEl?.value) fd.set("mailingAddress", mailingEl.value);
      if (cityEl?.value) fd.set("city", cityEl.value);
      if (stateEl?.value) fd.set("state", stateEl.value);
      if (zipEl?.value) fd.set("zip", zipEl.value);

      const result = await createBusinessPopup(fd);
      if (!result.ok) {
        setError("error" in result ? result.error : "Could not save account.");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
      router.push(`/accounts/${result.id}`);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Soft warn only — never block save on duplicate EIN/name.
    void submit();
  }

  return (
    <>
      <Button
        type="button"
        className={cn("hover:!bg-fit-red hover:!text-white hover:!border-fit-red")}
        data-ff-new-business=""
        onClick={() => setOpen(true)}
      >
        New Account
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            reset();
            if (defaultOpen) router.replace("/accounts");
          }
        }}
      >
        <DialogContent
          className="w-[min(100%-2rem,520px)] max-h-[90vh] max-w-[520px] gap-3 overflow-y-auto p-5 sm:max-w-[520px]"
          data-ff-add-business-dialog=""
        >
          <DialogHeader>
            <DialogTitle>New Account</DialogTitle>

          </DialogHeader>

          {match ? (
            <div
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              data-ff-business-dup-banner=""
            >
              Possible duplicate ({businessMatchReasonText(match.reason)}):{" "}
              <Link
                href={`/accounts/${match.business.id}`}
                className="font-semibold underline"
                onClick={() => setOpen(false)}
              >
                {businessMatchLabel(match)}
              </Link>
              . You can still create.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950">
              {error}
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ff-biz-legal" className="text-xs">
                  Legal Name
                </Label>
                <Input
                  id="ff-biz-legal"
                  name="legalName"
                  required
                  className="mt-1 h-8"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-biz-dba" className="text-xs">
                  DBA
                </Label>
                <Input
                  id="ff-biz-dba"
                  name="dba"
                  className="mt-1 h-8"
                  value={dba}
                  onChange={(e) => setDba(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-biz-ein" className="text-xs">
                  EIN
                </Label>
                <Input
                  id="ff-biz-ein"
                  name="ein"
                  className="mt-1 h-8"
                  placeholder="XX-XXXXXXX"
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-biz-type" className="text-xs">
                  Business Type
                </Label>
                <select
                  id="ff-biz-type"
                  name="entityType"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                >
                  <option value="">None</option>
                  {BUSINESS_ENTITY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ff-biz-industry" className="text-xs">
                  Industry
                </Label>
                <select
                  id="ff-biz-industry"
                  name="industry"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="">None</option>
                  {BUSINESS_INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ff-biz-phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="ff-biz-phone"
                  name="phone"
                  className="mt-1 h-8"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-biz-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="ff-biz-email"
                  name="email"
                  type="email"
                  className="mt-1 h-8"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-biz-website" className="text-xs">
                  Website
                </Label>
                <Input
                  id="ff-biz-website"
                  name="website"
                  className="mt-1 h-8"
                  placeholder="https://"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            <AddressFieldset streetName="mailingAddress" streetLabel="Address" />

            <div className="grid gap-3 sm:grid-cols-2">
              <SourceSelect defaultValue="referral" />
              <div>
                <Label htmlFor="ff-biz-referral" className="text-xs">
                  Referral
                </Label>
                <Input
                  id="ff-biz-referral"
                  name="referral"
                  className="mt-1 h-8"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="ff-biz-tags" className="text-xs">
                  Tags
                </Label>
                <Input
                  id="ff-biz-tags"
                  name="tags"
                  className="mt-1 h-8"
                  placeholder="commercial, target (comma-separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="ff-biz-life-notes" className="text-xs">
                  Life Notes
                </Label>
                <Textarea
                  id="ff-biz-life-notes"
                  name="lifeNotes"
                  className="mt-1 min-h-[64px]"
                  value={lifeNotes}
                  onChange={(e) => setLifeNotes(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-biz-health-notes" className="text-xs">
                  Health Notes
                </Label>
                <Textarea
                  id="ff-biz-health-notes"
                  name="healthNotes"
                  className="mt-1 min-h-[64px]"
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-biz-pc-notes" className="text-xs">
                  P&C Notes
                </Label>
                <Textarea
                  id="ff-biz-pc-notes"
                  name="pcNotes"
                  className="mt-1 min-h-[64px]"
                  value={pcNotes}
                  onChange={(e) => setPcNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Link
                href="/accounts/new"
                className="text-sm text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Use Full Layout
              </Link>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={busy} data-ff-save-business-popup="">
                  Save Account
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
