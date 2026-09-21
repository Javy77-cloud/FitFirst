export function StubBanner({ children }: { children: React.ReactNode }) {
  return <div className="ff-stub mb-3 rounded-md px-3 py-2 text-xs">{children}</div>;
}

export function Notice({ code }: { code?: string }) {
  if (!code) return null;
  const copy: Record<string, string> = {
    "google-connected":
      "Connect Google Calendar under Settings → Integrations. Busy blocks sync onto this desk.",
    "google-disconnected": "Google Calendar marked not connected.",
    "google-sync-later":
      "Calendar events synced. Use Sync now on Calendar to refresh Google or Outlook.",
    "busy-synced": "External busy is on the desk calendar.",
    "would-send":
      "Campaign send is stubbed. FitFirst logged “would send” for each audience member. No SMTP.",
    "esign-not-implemented":
      "Finish-line DocuSign / Dropbox Sign stay parked (not_implemented). Use the in-desk stub on a Deal or Policy.",
    "esign-fill-sent": "DocuSign sandbox envelope created from the filled form.",
    "esign-fill-stub":
      "Fill confirmed. DocuSign sandbox is not connected — local envelope recorded. Use in-desk sign or connect Settings → E-sign.",
    "esign-fill-error":
      "DocuSign sandbox is connected but envelope send failed. Local envelope kept. Use the in-desk test path.",
    "marked-signed": "Vendor envelope marked signed in FitFirst only. Prefer the in-desk stub on Deal or Policy.",
    "esign-requested": "In-desk signature requested. Open the client link or agent demo — not DocuSign.",
    "esign-signed": "Signed in the in-desk stub. Status and timestamp are on the record.",
    "esign-need-packet": "Choose or upload a PDF packet before requesting a signature.",
    "esign-invalid": "Type the legal name. A drawn mark is optional unless you chose draw.",
    "sms-not-implemented":
      "SMS provider connect returned not_implemented. No number purchased. Twilio was not called.",
    "sms-disconnected": "SMS provider marked not connected.",
  };
  const text = copy[code];
  if (!text) return null;
  return <StubBanner>{text}</StubBanner>;
}
