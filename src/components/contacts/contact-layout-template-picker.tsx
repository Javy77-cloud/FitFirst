"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyContactLayoutTemplate,
  readContactLayoutTemplate,
} from "@/app/actions/contacts-ops";
import { Button } from "@/components/ui/button";
import type { LayoutTemplateKind } from "@/lib/custom-fields/layout-template";

/** Classic (Dense, one column) + Card (Two column) — persist per agency via contacts layout. */
export function ContactLayoutTemplatePicker({
  contactId,
  onApplied,
}: {
  contactId: string;
  onApplied?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"classic" | "card" | null>(null);
  const [active, setActive] = useState<LayoutTemplateKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readContactLayoutTemplate().then((kind) => {
      if (!cancelled) setActive(kind);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply(kind: "card" | "classic") {
    setBusy(kind);
    try {
      const fd = new FormData();
      fd.set("template", kind);
      await applyContactLayoutTemplate(fd);
      setActive(kind);
      onApplied?.();
      router.refresh();
      void contactId;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" data-ff-contact-layout-templates="">
      <Button
        type="button"
        size="sm"
        variant={active === "classic" ? "default" : "outline"}
        disabled={busy != null}
        aria-pressed={active === "classic"}
        data-ff-layout-template="classic"
        data-ff-layout-template-active={active === "classic" ? "1" : undefined}
        className={
          active === "classic"
            ? "!border-[#002868] !bg-[#002868] !text-white hover:!bg-[#002868] hover:!text-white"
            : undefined
        }
        onClick={() => void apply("classic")}
      >
        {busy === "classic" ? <ProcessingLabel>Saving…</ProcessingLabel> : "Classic (Dense)"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={active === "card" ? "default" : "outline"}
        disabled={busy != null}
        aria-pressed={active === "card"}
        data-ff-layout-template="card"
        data-ff-layout-template-active={active === "card" ? "1" : undefined}
        className={
          active === "card"
            ? "!border-[#002868] !bg-[#002868] !text-white hover:!bg-[#002868] hover:!text-white"
            : undefined
        }
        onClick={() => void apply("card")}
      >
        {busy === "card" ? <ProcessingLabel>Saving…</ProcessingLabel> : "Card (Two column)"}
      </Button>
    </div>
  );
}
