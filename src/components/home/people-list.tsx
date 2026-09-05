import Link from "next/link";
import type { BirthdayRow } from "@/lib/home/birthdays";

export function PeopleList({
  title,
  hint,
  rows,
  empty,
}: {
  title: string;
  hint?: string;
  rows: BirthdayRow[];
  empty: string;
}) {
  return (
    <div>
      <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {hint ? <p className="text-helper text-muted-foreground">{hint}</p> : null}
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {rows.map((row) => (
            <li key={`${title}-${row.id}`} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
              <Link href={row.href} className="truncate font-medium text-primary hover:underline">
                {row.name}
              </Link>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.on.slice(5)} · turns {row.turns}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
