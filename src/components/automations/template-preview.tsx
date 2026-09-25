"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplateLocaleReady } from "@/lib/templates/library";

export function TemplateLocalePreview({
  name,
  ready,
}: {
  name: string;
  ready: TemplateLocaleReady;
}) {
  const [locale, setLocale] = useState<"en" | "es">(ready.enReady ? "en" : "es");
  const subject = locale === "en" ? ready.subjectEn : ready.subjectEs;
  const body = locale === "en" ? ready.bodyEn : ready.bodyEs;
  const missing = locale === "en" ? !ready.enReady : !ready.esReady;

  return (
    <article className="ff-card flex flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-navy">{name}</h2>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{ready.enReady ? "EN" : "EN missing"}</Badge>
          <Badge variant="outline">{ready.esReady ? "ES" : "ES missing"}</Badge>
          <Badge variant="secondary">Does not send</Badge>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        <button
          type="button"
          className={cn(
            "rounded-md px-2.5 py-1 text-xs",
            locale === "en" ? "bg-navy font-semibold text-white" : "border border-border bg-card",
          )}
          onClick={() => setLocale("en")}
        >
          English
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-2.5 py-1 text-xs",
            locale === "es" ? "bg-navy font-semibold text-white" : "border border-border bg-card",
          )}
          onClick={() => setLocale("es")}
        >
          Español
        </button>
      </div>
      {missing ? null : (
        <>
          <p className="mt-3 text-sm font-medium">{subject}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{body}</pre>
        </>
      )}
    </article>
  );
}
