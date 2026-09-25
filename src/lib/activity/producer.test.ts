import { describe, expect, it } from "vitest";
import { ADMIN_USER_ID, AGENT_USER_ID, GARCIA_AGENT_USER_ID } from "@/lib/fixtures/ids";
import { isAgencyChannelProducer, liveDeskProducerName, type ProducerLogin } from "./producer";

describe("isAgencyChannelProducer", () => {
  it("treats empty as non-person", () => {
    expect(isAgencyChannelProducer(null)).toBe(true);
    expect(isAgencyChannelProducer("")).toBe(true);
    expect(isAgencyChannelProducer("   ")).toBe(true);
  });

  it("flags known channel codes including AFA", () => {
    expect(isAgencyChannelProducer("AFA")).toBe(true);
    expect(isAgencyChannelProducer("afa")).toBe(true);
    expect(isAgencyChannelProducer("BackNine")).toBe(true);
    expect(isAgencyChannelProducer("Back Nine")).toBe(true);
  });

  it("flags short all-caps acronyms", () => {
    expect(isAgencyChannelProducer("HOI")).toBe(true);
  });

  it("keeps human names", () => {
    expect(isAgencyChannelProducer("Javy Rivera")).toBe(false);
    expect(isAgencyChannelProducer("Francisco Javier Garcia")).toBe(false);
    expect(isAgencyChannelProducer("Maya Chen")).toBe(false);
  });
});

const javy: ProducerLogin = {
  id: ADMIN_USER_ID,
  name: "Javy Rivera",
  email: "javy@fitfirst.local",
  role: "admin",
  active: true,
  updatedAt: "2026-09-24T20:51:41.708Z",
};

const settingsLogin: ProducerLogin = {
  id: "75adb983-f43c-47fb-869c-0387ef27314c",
  name: "Javier Garcia",
  email: "javier@fitfirst.local",
  role: "admin",
  active: true,
  updatedAt: "2026-09-25T21:44:29.459Z",
  priorNames: ["Francisco Javier Garcia", "Javier Garcia"],
};

const demoJavier: ProducerLogin = {
  id: GARCIA_AGENT_USER_ID,
  name: "Javier Garcia",
  email: "javier@fitfirst.local",
  role: "agent",
  active: true,
  updatedAt: "2026-09-14T18:55:00.000Z",
};

const maya: ProducerLogin = {
  id: AGENT_USER_ID,
  name: "Maya Chen",
  email: "maya@fitfirst.local",
  role: "agent",
  active: true,
};

describe("liveDeskProducerName", () => {
  it("shows the Settings name when the book owner is the same person under an older spelling", () => {
    expect(
      liveDeskProducerName({
        owner: javy,
        logins: [javy, settingsLogin, maya],
        storedProducer: "AFA",
        sellingAgency: "AFA",
      }),
    ).toBe("Javier Garcia");
  });

  it("keeps the Settings name after the book-owner row is touched again", () => {
    expect(
      liveDeskProducerName({
        owner: { ...javy, updatedAt: "2026-09-26T12:00:00.000Z" },
        logins: [javy, { ...settingsLogin, updatedAt: "2026-09-25T21:44:29.459Z" }, maya],
        storedProducer: "Javy Rivera",
      }),
    ).toBe("Javier Garcia");
  });

  it("keeps a distinct producer and does not borrow the demo Javier login", () => {
    expect(
      liveDeskProducerName({
        owner: javy,
        logins: [javy, demoJavier, maya],
        storedProducer: "AFA",
      }),
    ).toBe("Javy Rivera");
    expect(
      liveDeskProducerName({
        owner: maya,
        logins: [javy, settingsLogin, maya],
      }),
    ).toBe("Maya Chen");
  });

  it("uses the owner profile when that login is the one Settings updated", () => {
    expect(
      liveDeskProducerName({
        owner: { ...settingsLogin, name: "Javier Garcia" },
        logins: [javy, settingsLogin],
      }),
    ).toBe("Javier Garcia");
  });

  it("does not surface a frozen channel code when nobody owns the policy", () => {
    expect(
      liveDeskProducerName({
        owner: null,
        logins: [javy, settingsLogin],
        storedProducer: "AFA",
        sellingAgency: "AFA",
      }),
    ).toBeNull();
  });

  it("still follows Settings when the only person string is the frozen producer column", () => {
    expect(
      liveDeskProducerName({
        owner: null,
        logins: [javy, settingsLogin],
        storedProducer: "Javy Rivera",
      }),
    ).toBe("Javier Garcia");
  });
});
