import Link from "next/link";
import { bookListHref } from "@/lib/book-lists/lenses";
import type { BookFamily, BookHeat, BookLensId } from "@/lib/book-lists/types";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

/** P&C / Life / Health chips. Hidden when the agency only writes P&C. */
export function CarrierLobFilter({
  path,
  lob,
  heat,
  lens,
  q,
  writeLife,
  writeHealth,
}: {
  path: string;
  lob: BookFamily | null;
  heat: BookHeat | null;
  lens: BookLensId | null;
  q?: string | null;
  writeLife: boolean;
  writeHealth: boolean;
}) {
  if (!writeLife && !writeHealth) return null;
  const books: Array<{ id: BookFamily | ""; label: string }> = [
    { id: "", label: "All lines" },
    { id: "pc", label: "P&C" },
  ];
  if (writeLife) books.push({ id: "life", label: "Life" });
  if (writeHealth) books.push({ id: "health", label: "Health" });
  return (
    <div className={FF_CHIP_TAB_GROUP} data-ff-carrier-lob="" aria-label="Line of business">
      {books.map((book) => (
        <Link
          key={book.id || "all"}
          href={bookListHref({
            path,
            q,
            heat,
            lens,
            extra: book.id ? { lob: book.id } : undefined,
          })}
          className={chipTabClass((lob ?? "") === book.id)}
          data-ff-carrier-lob-option={book.id || "all"}
        >
          {book.label}
        </Link>
      ))}
    </div>
  );
}
