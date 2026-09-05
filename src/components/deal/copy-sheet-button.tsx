"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COPY_SHEET_LABEL } from "@/lib/quote-sheet/toolbar";

export function CopySheetButton({
  text,
  size = "sm",
}: {
  text: string;
  size?: "xs" | "sm" | "default";
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <Button type="button" size={size} onClick={copy}>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : COPY_SHEET_LABEL}
    </Button>
  );
}
