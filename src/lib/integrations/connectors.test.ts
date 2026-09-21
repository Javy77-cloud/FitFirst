import { describe, expect, it } from "vitest";
import { sendCampaignEmail } from "./email";
import { sendEnvelope } from "./esign";
import { readFileSync } from "node:fs";
import {
  completeGoogleOAuthStub,
  startGoogleOAuth,
} from "./google-calendar";
import { connectSmsProvider, sendSms } from "./sms";
import { connectTelephonyProvider, placeDeskCall } from "./telephony";

describe("agency connector stubs", () => {
  it("Google Calendar OAuth points at BYO Connect and two-way event push is wired", () => {
    expect(startGoogleOAuth().status).toBe("use_byo");
    expect(startGoogleOAuth().href).toBe("/settings/integrations#google_calendar");
    expect(readFileSync("src/lib/integrations/google-calendar.ts", "utf8")).toMatch(/syncConnectedCalendarsBothWays/);
    expect(readFileSync("src/app/actions/activities-desk.ts", "utf8")).toMatch(/pushDeskActivityToCalendars/);
    const stub = completeGoogleOAuthStub("desk@agency.test");
    expect(stub.connected).toBe(false);
    expect(stub.displayEmail).toBe("desk@agency.test");
    expect(stub.oauth.status).toBe("use_byo");
  });

  it("campaign send logs would_send and never claims SMTP", () => {
    const result = sendCampaignEmail({
      campaignName: "Wind mit reminder",
      subject: "Need your 4-point",
      recipientEmail: "ana@example.com",
      recipientName: "Ana Dib",
    });
    expect(result.status).toBe("would_send");
    expect(result.message).toContain("would send");
  });

  it("SMS and e-sign providers stay not_implemented", () => {
    expect(connectSmsProvider("twilio").status).toBe("not_implemented");
    expect(sendSms().status).toBe("not_implemented");
    expect(sendEnvelope("docusign", { documentId: "doc-1" }).status).toBe(
      "not_implemented",
    );
    expect(sendEnvelope("dropbox_sign", { documentId: "doc-1" }).status).toBe(
      "not_implemented",
    );
    expect(sendEnvelope("zoho_sign", { documentId: "doc-1" }).status).toBe(
      "not_implemented",
    );
    expect(sendEnvelope("docusign", { documentId: "doc-1" }).message).not.toMatch(
      /sent|envelope created/i,
    );
    expect(connectTelephonyProvider("twilio").status).toBe("not_implemented");
    expect(placeDeskCall().status).toBe("not_implemented");
  });
});
