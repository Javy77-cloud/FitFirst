import Link from "next/link";
import { DOCUMENT_LIBRARIES, DOCUMENT_LIBRARY_LABELS } from "@/lib/domain";
import { libraryHref } from "@/lib/documents/library";
import type { DocumentLibrary } from "@/lib/domain";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LibraryTabs({ library }: { library: DocumentLibrary }) {
  return (
    <div className="flex flex-wrap gap-1">
      {DOCUMENT_LIBRARIES.map((value) => (
        <Link
          key={value}
          href={libraryHref({ library: value })}
          className={cn(buttonVariants({ size: "sm", variant: library === value ? "default" : "outline" }))}
        >
          {DOCUMENT_LIBRARY_LABELS[value]}
        </Link>
      ))}
    </div>
  );
}
