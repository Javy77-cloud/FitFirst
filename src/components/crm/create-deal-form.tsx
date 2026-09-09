"use client";

import { useState } from "react";
import Link from "next/link";
import { createDeal } from "@/app/actions/crm";
import { PartyTypeahead } from "@/components/crm/party-typeahead";
import { SourceSelect } from "@/components/crm/source-select";
import { LinePicker } from "@/components/deal/line-picker";
import { FormPrimaryActions } from "@/components/desk/form-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartyHit, PartyRecord } from "@/lib/crm/party-typeahead";

export function CreateDealForm({ parties }: { parties: PartyRecord[] }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function onPick(hit: PartyHit | null) {
    setPhone(hit?.phone ?? "");
    setEmail(hit?.email ?? "");
  }

  return (
    <form action={createDeal} className="ff-card max-w-xl space-y-3 p-4">
      <p className="text-base text-muted-foreground">
        Type a Contact or Business as you go — name, email, or phone. Creates a shopping deal with
        an empty master risk. Policy still waits until bind.
      </p>
      <PartyTypeahead parties={parties} required onPick={onPick} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone" className="text-xs">
            Phone
          </Label>
          <Input
            id="phone"
            name="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-xs">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="city" className="text-xs">
            City
          </Label>
          <Input id="city" name="city" className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="county" className="text-xs">
            County
          </Label>
          <Input id="county" name="county" className="mt-1 h-8" />
        </div>
      </div>
      <SourceSelect defaultValue="referral" />
      <LinePicker defaultCode="HO3" />
      <FormPrimaryActions
        submitLabel="Create deal"
        secondary={<Link href="/deals">Back to deals</Link>}
      />
    </form>
  );
}
