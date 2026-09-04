import { describe, expect, it } from "vitest";
import { sendCampaignEmail } from "./email";
import { sendEnvelope } from "./esign";
import {
  completeGoogleOAuthStub,
  startGoogleOAuth,
  syncGoogleCalendarIn,
  syncGoogleCalendarOut,
} from "./google-calendar";
import { connectSmsProvider, sendSms } from "./sms";
import { connectTelephonyProvider, placeDeskCall } from "./telephony";

describe("agency connector stubs", () => {
  it("Google Calendar OAuth and sync return not_implemented", () => {
    expect(startGoogleOAuth().status).toBe("not_implemented");
    expect(syncGoogleCalendarIn().status).toBe("not_implemented");
    expect(syncGoogleCalendarOut().status).toBe("not_implemented");
    const stub = completeGoogleOAuthStub("desk@agency.test");
    expect(stub.connected).toBe(true);
    expect(stub.displayEmail).toBe("desk@agency.test");
    expect(stub.oauth.status).toBe("not_implemented");
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
    expect(connectTelephonyProvider("twilio").status).toBe("not_implemented");
    expect(placeDeskCall().status).toBe("not_implemented");
  });
});
