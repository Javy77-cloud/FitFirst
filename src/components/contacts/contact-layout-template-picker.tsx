"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { contactCardLayout, contactClassicLayout } from "@/lib/contacts/contact-field-catalog";

const KEY = "ff.contacts.layoutTemplate";

export function readContactLayoutTemplate(): "card" | "classic" {
  if (typeof window === "undefined") return "card";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "classic" ? "classic" : "card";
  } catch {
    return "card";
  }
}

export function contactLayoutFromTemplate(kind: "card" | "classic") {
  return kind === "classic" ? contactClassicLayout() : contactCardLayout();
}

export function ContactLayoutTemplatePicker({
  contactId,
  onApplied,
}: {
  contactId: string;
  onApplied?: () => void;
}) {
  const router = useRouter();
  function apply(kind: "card" | "classic") {
    try {
      window.localStorage.setItem(KEY, kind);
      document.cookie = `ff_contacts_layout=${kind}; path=/; max-age=31536000`;
    } catch {
      /* ignore */
    }
    onApplied?.();
    router.refresh();
    void contactId;
  }
  return (
    <div className="flex flex-wrap gap-2" data-ff-contact-layout-templates="">
      <Button type="button" size="sm" variant="outline" onClick={() => apply("classic")}>
        Classic (Dense)
      </Button>
      <Button
        type="button"
        size="sm"
        className="hover:!bg-fit-red hover:!text-white"
        onClick={() => apply("card")}
      >
        Card (Two-Col)
      </Button>
    </div>
  );
}
