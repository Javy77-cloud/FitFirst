"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCarrierPopup } from "@/app/actions/carriers-ops";
import { LINES } from "@/lib/domain";
import { commercialLineMenuOptions } from "@/lib/policy/eo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AddCarrierDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [agencyCode, setAgencyCode] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [status, setStatus] = useState("Active");
  const [lines, setLines] = useState<string[]>([]);

  function reset() {
    setName("");
    setAgencyCode("");
    setWebsite("");
    setPhone("");
    setEmail("");
    setMailingAddress("");
    setStatus("Active");
    setLines([]);
    setError(null);
  }

  function toggleLine(line: string) {
    setLines((prev) => (prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("agencyCode", agencyCode);
      fd.set("website", website);
      fd.set("phone", phone);
      fd.set("email", email);
      fd.set("mailingAddress", mailingAddress);
      fd.set("status", status);
      fd.set("writtenLines", lines.join(", "));
      const result = await createCarrierPopup(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.push(`/carriers/${result.id}`);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <>
      <Button
        type="button"
        className={cn("hover:!bg-fit-red hover:!text-white hover:!border-fit-red")}
        data-ff-new-carrier=""
        onClick={() => setOpen(true)}
      >
        New Carrier
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent
          className="w-[min(100%-2rem,520px)] max-h-[90vh] max-w-[520px] gap-3 overflow-y-auto p-5 sm:max-w-[520px]"
          data-ff-add-carrier-dialog=""
        >
          <DialogHeader>
            <DialogTitle>New Carrier</DialogTitle>
            <DialogDescription>
              Agency directory record. Portal credentials stay Admin-only after save.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950">
              {error}
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="ff-carrier-name" className="text-xs">
                  Carrier name
                </Label>
                <Input
                  id="ff-carrier-name"
                  required
                  className="mt-1 h-8"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-carrier-code" className="text-xs">
                  Agency code
                </Label>
                <Input
                  id="ff-carrier-code"
                  className="mt-1 h-8"
                  value={agencyCode}
                  onChange={(e) => setAgencyCode(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-carrier-status" className="text-xs">
                  Status
                </Label>
                <select
                  id="ff-carrier-status"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">None</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ff-carrier-website" className="text-xs">
                  Website
                </Label>
                <Input
                  id="ff-carrier-website"
                  className="mt-1 h-8"
                  placeholder="https://"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-carrier-phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="ff-carrier-phone"
                  className="mt-1 h-8"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ff-carrier-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="ff-carrier-email"
                  type="email"
                  className="mt-1 h-8"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="ff-carrier-mail" className="text-xs">
                  Mailing address
                </Label>
                <Input
                  id="ff-carrier-mail"
                  className="mt-1 h-8"
                  value={mailingAddress}
                  onChange={(e) => setMailingAddress(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Written lines</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {commercialLineMenuOptions(LINES, (line) => line).map((line) => {
                  const on = lines.includes(line.value);
                  return (
                    <button
                      key={line.value}
                      type="button"
                      title={line.title}
                      onClick={() => toggleLine(line.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        on
                          ? "border-[#002868] bg-[#002868] text-white"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {line.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy || !name.trim()} data-ff-save-carrier-popup="">
                Save Carrier
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
