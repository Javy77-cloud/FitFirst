import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("inbox compose shared upgrade", () => {
  const desk = source("src/components/inbox/inbox-desk.tsx");
  const inboxCompose = source("src/components/inbox/inbox-compose.tsx");
  const compose = source("src/components/comms/quick-comms-email-compose.tsx");
  const actions = source("src/app/actions/quick-comms-email.ts");
  const board = source("src/components/comms/quick-comms-board.tsx");
  const chrome = source("src/app/globals.css");

  it("elevates Inbox New message into Compose opening the shared popup", () => {
    expect(desk).toMatch(/InboxCompose/);
    expect(desk).not.toMatch(/sendInboxMessage/);
    expect(desk).not.toMatch(/client@email\.com/);
    expect(inboxCompose).toMatch(/data-ff-inbox-compose-open/);
    expect(inboxCompose).toMatch(/QuickCommsEmailCompose/);
    expect(inboxCompose).toMatch(/toMode=\"search\"/);
    expect(inboxCompose).toMatch(/router\.refresh\(\)/);
    expect(inboxCompose).toMatch(/Stays in Inbox/);
  });

  it("places Compose top-left in the toolbar, not a bottom New message strip", () => {
    expect(desk).toMatch(/ff-inbox-toolbar-start/);
    expect(desk).toMatch(/<InboxCompose \/>/);
    const toolbarIdx = desk.indexOf("ff-inbox-toolbar");
    const composeIdx = desk.indexOf("<InboxCompose");
    const splitIdx = desk.indexOf("<InboxSplit");
    expect(toolbarIdx).toBeGreaterThan(-1);
    expect(composeIdx).toBeGreaterThan(toolbarIdx);
    expect(composeIdx).toBeLessThan(splitIdx);
    expect(inboxCompose).not.toMatch(/New message/);
    expect(inboxCompose).toMatch(/ff-inbox-compose-trigger/);
    expect(chrome).not.toMatch(/\.ff-inbox-new \{/);
  });

  it("lets the reading pane use freed vertical space after removing the bottom strip", () => {
    expect(chrome).toMatch(/max-height: min\(56rem, calc\(100dvh - 8\.5rem\)\)/);
    expect(chrome).not.toMatch(/max-height: min\(46rem, calc\(100dvh - 13rem\)\)/);
  });

  it("reuses one compose editor — does not fork a second body editor for Inbox", () => {
    expect(inboxCompose).toMatch(/from \"@\/components\/comms\/quick-comms-email-compose\"/);
    expect(board).toMatch(/QuickCommsEmailCompose/);
    expect(compose).toMatch(/max-h-\[56vh\]/);
    expect(compose).toMatch(/w-\[min\(90vw,42rem\)\]/);
    expect(compose).toMatch(/sm:max-w-\[42rem\]/);
    expect(compose).not.toMatch(/sm:max-w-md/);
    expect(compose).not.toMatch(/28rem/);
    expect(compose).toMatch(/contentEditable/);
    expect(compose).toMatch(/sendDeskEmail/);
    expect(compose).toMatch(/loadQuickCommsEmailSignature/);
    expect(compose).toMatch(/composeFile/);
    expect(compose).toMatch(/insertImage/);
    expect(inboxCompose).not.toMatch(/contentEditable/);
  });

  it("searches contacts and accounts live for To and still allows raw email", () => {
    expect(compose).toMatch(/toMode/);
    expect(compose).toMatch(/searchComposeRecipients/);
    expect(compose).toMatch(/data-ff-compose-to-search/);
    expect(compose).toMatch(/data-ff-compose-recipient-hits/);
    expect(compose).toMatch(/looksLikeEmail/);
    expect(actions).toMatch(/export async function searchComposeRecipients/);
    expect(actions).toMatch(/kind: \"contact\" \| \"account\"/);
    expect(actions).toMatch(/from\(contacts\)/);
    expect(actions).toMatch(/from\(accounts\)/);
  });

  it("leaves Log to activity and Assign to agent alone", () => {
    expect(desk).toMatch(/Log to activity/);
    expect(desk).toMatch(/InboxAssignDialog/);
    expect(desk).toMatch(/logInboxThread/);
  });
});
