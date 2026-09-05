"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HOME_LINE_KEYS, HOME_LINE_LABEL, type HomeLineKey } from "@/lib/home/lines";

export type CrossSellRow = {
  contactId: string;
  name: string;
  href: string;
  has: HomeLineKey[];
};

export function CrossSellPanel({ rows, embedded = false }: { rows: CrossSellRow[]; embedded?: boolean }) {
  const [line, setLine] = useState<HomeLineKey | "">("");
  const matches = useMemo(() => {
    if (!line) return [];
    return rows.filter((row) => row.has.length > 0 && !row.has.includes(line));
  }, [line, rows]);

  return (
    <section className={embedded ? "overflow-hidden" : "ff-card overflow-hidden"}>
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-navy">Cross-sell</h3>
        <p className="text-helper text-muted-foreground">
          Pick a sellable line, then see who already has in-force coverage but not that product.
          Quotes do not count. No scores.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {HOME_LINE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLine((cur) => (cur === key ? "" : key))}
              className={
                line === key
                  ? "rounded-md bg-primary px-2 py-1 text-sm text-primary-foreground"
                  : "rounded-md border border-border bg-card px-2 py-1 text-sm text-navy hover:border-primary"
              }
            >
              {HOME_LINE_LABEL[key]}
            </button>
          ))}
        </div>
      </div>
      {!line ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">Choose a line to list households that need it.</p>
      ) : matches.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          Nobody on the in-force book is missing {HOME_LINE_LABEL[line]}.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {matches.map((row) => (
            <li key={row.contactId} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <Link href={row.href} className="font-medium text-primary hover:underline">
                {row.name}
              </Link>
              <span className="text-helper text-muted-foreground">
                Has {row.has.map((k) => HOME_LINE_LABEL[k]).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
