import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("quick comms email upgrade", () => {
  const board = source("src/components/comms/quick-comms-board.tsx");
  const compose = source("src/components/comms/quick-comms-email-compose.tsx");
  const css = source("src/app/globals.css");
  const actions = source("src/app/actions/comms.ts");

  it("makes the recipient name prominent with a soft Activity heartbeat", () => {
    expect(board).toMatch(/data-ff-quick-comms-recipient/);
    expect(board).toMatch(/data-ff-quick-comms-recipient-name/);
    expect(board).toMatch(/data-ff-qc-recipient-heartbeat/);
    expect(board).toMatch(/from "lucide-react"/);
    expect(board).toMatch(/<Activity[\s\S]*ff-qc-recipient-heartbeat/);
    expect(css).toMatch(/ff-qc-recipient-heartbeat/);
    expect(css).toMatch(/@keyframes ff-qc-heartbeat/);
  });

  it("opens Email into three choices before the panel form", () => {
    expect(board).toMatch(/data-ff-qc-email-menu/);
    expect(board).toMatch(/data-ff-qc-email-choice="here"/);
    expect(board).toMatch(/data-ff-qc-email-choice="templates"/);
    expect(board).toMatch(/data-ff-qc-email-choice="compose"/);
    expect(board).toMatch(/Send from here/);
    expect(board).toMatch(/Choose a template/);
    expect(board).toMatch(/Open compose/);
  });

  it("lists agency templates then returns to send-from-here", () => {
    expect(board).toMatch(/data-ff-qc-email-templates/);
    expect(board).toMatch(/loadQuickCommsEmailTemplates/);
    expect(board).toMatch(/setEmailGate\("here"\)/);
  });

  it("ships a compact same-page compose with formatting, attach, paste, signature", () => {
    expect(board).toMatch(/QuickCommsEmailCompose/);
    expect(compose).toMatch(/max-h-\[50vh\]/);
    expect(compose).toMatch(/contentEditable/);
    expect(compose).toMatch(/insertImage/);
    expect(compose).toMatch(/composeFile/);
    expect(compose).toMatch(/loadQuickCommsEmailSignature/);
    expect(compose).toMatch(/sendDeskEmail/);
    expect(compose).not.toMatch(/href=\{\"\/inbox/);
    expect(compose).not.toMatch(/window\.open/);
  });

  it("keeps send-from-here on the shared outbound path with assignee = sender", () => {
    expect(actions).toMatch(/resolveOutboundEmailSignature/);
    expect(actions).toMatch(/assignee:/);
    expect(actions).toMatch(/sendGmailMessage/);
    expect(actions).toMatch(/composeFile/);
  });
});
