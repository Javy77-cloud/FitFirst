import { AppShell } from "@/components/app-shell";
import { SUPPORT_COPY } from "@/lib/desk/quick-actions";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <AppShell title="Support" eyebrow="Desk chrome">
      <section className="ff-card max-w-xl space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Support</h2>
        <p className="text-sm text-muted-foreground">{SUPPORT_COPY}</p>
        <p className="text-xs text-muted-foreground">
          Visible to Admin and Agent. Kept in the left nav so this stub is not dropped on a later
          pass.
        </p>
      </section>
    </AppShell>
  );
}
