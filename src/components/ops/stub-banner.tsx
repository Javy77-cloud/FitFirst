export function StubBanner({ children }: { children: React.ReactNode }) {
  return <div className="ff-stub mb-3 rounded-md px-3 py-2 text-xs">{children}</div>;
}

export function Notice({ code }: { code?: string }) {
  if (!code) return null;
  const copy: Record<string, string> = {
    "google-connected":
      "Google Calendar is stub-connected. FitFirst tasks, calls, and meetings still display. OAuth is not implemented — no tokens stored.",
    "google-disconnected": "Google Calendar marked not connected.",
    "google-sync-not_implemented":
      "Google Calendar sync returned not_implemented. FitFirst activities are unchanged.",
    "would-send":
      "Campaign send is stubbed. FitFirst logged “would send” for each audience member. No SMTP.",
    "esign-not-implemented":
      "Envelope created as sent in-app. The e-sign provider interface returned not_implemented. No DocuSign / Dropbox Sign / Zoho Sign call.",
    "marked-signed": "Envelope marked signed in FitFirst only.",
    "sms-not-implemented":
      "SMS provider connect returned not_implemented. No number purchased. Twilio was not called.",
    "sms-disconnected": "SMS provider marked not connected.",
  };
  const text = copy[code];
  if (!text) return null;
  return <StubBanner>{text}</StubBanner>;
}
