import { AppShell } from "@/components/app-shell";
import { FillDemoForm } from "@/components/fill-demo-form";

export const dynamic = "force-dynamic";

export default function FillDemoPage() {
  return (
    <AppShell title="Fill demo">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Chrome Fill add-on target. Send to Fill writes the Deal Quote Sheet record into
        localStorage. This page reads that same JSON — never a raw PDF.
      </p>
      <FillDemoForm />
    </AppShell>
  );
}
