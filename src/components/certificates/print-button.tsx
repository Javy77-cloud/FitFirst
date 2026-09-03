"use client";

import { Button } from "@/components/ui/button";

export function PrintCertificateButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      Print preview
    </Button>
  );
}
