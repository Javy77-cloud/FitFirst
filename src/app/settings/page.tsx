import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <section className="ff-card max-w-xl p-4">
        <h2 className="text-sm font-semibold text-navy">Phone line</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The in-desk softphone uses this computer&apos;s microphone (optional webcam) and stores
          call duration on hangup. There is no Twilio, Vonage, or other PSTN vendor in this repo.
        </p>
        <div className="mt-4 rounded-md border border-dashed border-border px-3 py-4 text-sm">
          <div className="font-medium text-navy">Connect your phone line later</div>
          <p className="mt-1 text-muted-foreground">
            Bring-your-own trunk. Click-to-call already opens the softphone shell and a{" "}
            <code className="text-xs">tel:</code> fallback. Plug a carrier SIP/WebRTC endpoint
            here when you have one — do not paste vendor keys into the app.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 h-8 rounded-md border border-input bg-muted px-3 text-xs text-muted-foreground"
          >
            Connect phone line (not configured)
          </button>
        </div>
      </section>
    </AppShell>
  );
}
