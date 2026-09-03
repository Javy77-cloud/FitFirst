"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function writeClipboard(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  el.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(el);
  return ok;
}

export function CopyScheduleButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    setCopied(true);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        writeClipboard(text);
      }
    } catch {
      writeClipboard(text);
    }
    window.setTimeout(() => setCopied(false), 5000);
  }

  return (
    <button
      type="button"
      data-ff-copy-schedule
      data-ff-copied={copied ? "true" : "false"}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      onClick={onCopy}
    >
      {copied ? "Copied Auto schedule" : "Copy Auto schedule"}
    </button>
  );
}
