import { AppShell } from "@/components/app-shell";
import { FillDemoForm } from "@/components/fill-demo-form";

export const dynamic = "force-dynamic";

export default function FillDemoPage() {
  return (
    <AppShell title="Fill demo">
      <p className="mb-4 max-w-3xl text-base text-muted-foreground">
        Chrome Fill target. Send to Fill writes the approved Deal Quote Sheet into localStorage.
        This page and the unpacked add-on in <code>extensions/fill</code> read that same JSON —
        never a raw PDF. Load the add-on from chrome://extensions → Developer mode → Load
        unpacked.
      </p>
      <FillDemoForm />
    </AppShell>
  );
}
