"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  linkContactBusiness,
  searchBusinessesForLink,
  unlinkContactBusiness,
} from "@/app/actions/contacts-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LinkedBusinessLine({
  contactId,
  businesses,
}: {
  contactId: string;
  businesses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void searchBusinessesForLink(q).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open, q]);

  const primary = businesses[0];
  return (
    <div
      className="flex flex-wrap items-center gap-2 text-sm"
      data-ff-linked-business-line=""
    >
      <span className="text-muted-foreground">Business</span>
      {primary ? (
        <>
          <Link href={`/accounts/${primary.id}`} className="font-medium text-[#002868] hover:underline">
            {primary.name}
          </Link>
          <form
            action={async () => {
              const fd = new FormData();
              fd.set("contactId", contactId);
              fd.set("accountId", primary.id);
              await unlinkContactBusiness(fd);
              router.refresh();
            }}
          >
            <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#BF0A30]">
              Unlink
            </Button>
          </form>
          {businesses.length > 1 ? (
            <span className="text-xs text-muted-foreground">+{businesses.length - 1} more</span>
          ) : null}
        </>
      ) : open ? (
        <div className="flex w-full flex-col gap-2 sm:max-w-sm">
          <Input
            className="h-8"
            placeholder="Search Business…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {hits.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                  onClick={async () => {
                    const fd = new FormData();
                    fd.set("contactId", contactId);
                    fd.set("accountId", row.id);
                    await linkContactBusiness(fd);
                    setOpen(false);
                    router.refresh();
                  }}
                >
                  {row.name}
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setOpen(true)}>
          Link Business
        </Button>
      )}
    </div>
  );
}
