"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  linkContactCoapplicant,
  searchContactsForLink,
  unlinkContactCoapplicant,
} from "@/app/actions/contacts-ops";
import { CollapsibleSection } from "@/components/contacts/collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CoRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
};

export function CoApplicantSection({
  contactId,
  coApplicants,
}: {
  contactId: string;
  coApplicants: CoRow[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CoRow[]>([]);
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => {
    if (!openSearch) return;
    let cancelled = false;
    void searchContactsForLink(q, contactId).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [q, contactId, openSearch]);

  return (
    <CollapsibleSection
      title="Co-Applicants"
      badge={coApplicants.length || undefined}
      defaultOpen={false}
      data-ff="contact-coapplicants"
    >
      {coApplicants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No co-applicant linked.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {coApplicants.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/contacts/${row.id}`}
                className="font-medium text-[#002868] hover:underline"
                data-ff-coapplicant-name=""
              >
                {row.lastName}, {row.firstName}
              </Link>
              <form
                action={async () => {
                  const fd = new FormData();
                  fd.set("contactId", contactId);
                  fd.set("linkedContactId", row.id);
                  await unlinkContactCoapplicant(fd);
                  router.refresh();
                }}
              >
                <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs text-[#BF0A30]">
                  Unlink
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        {openSearch ? (
          <div className="space-y-2">
            <Input
              className="h-8"
              placeholder="Search Contact…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {hits.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.set("contactId", contactId);
                      fd.set("linkedContactId", row.id);
                      await linkContactCoapplicant(fd);
                      setOpenSearch(false);
                      setQ("");
                      router.refresh();
                    }}
                  >
                    {row.lastName}, {row.firstName}
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpenSearch(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpenSearch(true)}>
            Link Co-Applicant
          </Button>
        )}
      </div>
    </CollapsibleSection>
  );
}
