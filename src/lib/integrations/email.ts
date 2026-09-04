export type WouldSendResult = {
  status: "would_send";
  message: string;
  recipientEmail: string | null;
  recipientName: string | null;
};

/** In-app only. Never opens SMTP or a provider API. */
export function sendCampaignEmail(input: {
  campaignName: string;
  subject: string;
  recipientEmail: string | null;
  recipientName: string | null;
}): WouldSendResult {
  const who = input.recipientEmail ?? input.recipientName ?? "unknown recipient";
  return {
    status: "would_send",
    message: `would send "${input.subject}" for campaign "${input.campaignName}" to ${who}`,
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
  };
}
