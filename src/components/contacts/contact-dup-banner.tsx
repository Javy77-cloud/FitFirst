"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  contactMatchLabel,
  findExistingContactMatch,
  type ExistingContactRow,
} from "@/lib/crm/existing-contact-match";

/** Soft warn — never blocks Save. */
export function ContactDupBanner({
  contacts,
  firstName,
  lastName,
  email,
  phone,
  excludeId,
}: {
  contacts: ExistingContactRow[];
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  excludeId?: string;
}) {
  const match = useMemo(() => {
    const hit = findExistingContactMatch(
      contacts.filter((c) => c.id !== excludeId),
      { firstName, lastName, email: email || null, phone: phone || null },
    );
    return hit;
  }, [contacts, firstName, lastName, email, phone, excludeId]);

  if (!match) return null;
  return (
    <div
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      data-ff-contact-dup-banner=""
      role="status"
    >
      Possible duplicate:{" "}
      <Link href={`/contacts/${match.contact.id}`} className="font-semibold underline">
        {contactMatchLabel(match)}
      </Link>
      . You can still save.
    </div>
  );
}
