"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One browser-history step back (`router.back()`). Optional Link only when there is no history. */
export function HistoryBackButton({
  label = "Back",
  fallbackHref,
  className,
  variant = "link",
}: {
  label?: string;
  /** Used only when `window.history.length <= 1` (no history to pop). */
  fallbackHref?: string;
  className?: string;
  /** Quiet FF navy text link (default) or outline sm. */
  variant?: "link" | "outline";
}) {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(true);

  useEffect(() => {
    setHasHistory(window.history.length > 1);
  }, []);

  const styles =
    variant === "outline"
      ? cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "border-[#002868]/40 text-[#002868] hover:bg-[#002868]/5 hover:text-[#002868]",
          className,
        )
      : cn(
          "inline-flex items-center text-sm font-medium text-[#002868] underline-offset-4 hover:underline",
          className,
        );

  if (!hasHistory && fallbackHref) {
    return (
      <Link href={fallbackHref} className={styles} data-ff-history-back="">
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={styles}
      data-ff-history-back=""
      onClick={() => router.back()}
    >
      {label}
    </button>
  );
}
