import { AppShell } from "@/components/app-shell";
import { FillDemoForm } from "@/components/fill-demo-form";

export const dynamic = "force-dynamic";

export default function FillDemoPage() {
  return (
    <AppShell title="Fill">

      <FillDemoForm />
    </AppShell>
  );
}
