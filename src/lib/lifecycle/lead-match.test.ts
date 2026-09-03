import { describe, expect, it } from "vitest";
import {
  isSameLead,
  normalizePhone,
  parseLeadFromPacket,
  splitNamedInsured,
} from "./lead-match";

describe("lead matching", () => {
  it("matches name + phone even when punctuation differs", () => {
    expect(
      isSameLead(
        { firstName: "Elena", lastName: "Ruiz", phone: "(321) 555-0188" },
        { firstName: "elena", lastName: "ruiz", phone: "3215550188" },
      ),
    ).toBe(true);
  });

  it("matches name + email case-insensitively", () => {
    expect(
      isSameLead(
        { firstName: "Elena", lastName: "Ruiz", email: "Elena.Ruiz@example.com" },
        { firstName: "Elena", lastName: "Ruiz", email: "elena.ruiz@example.com" },
      ),
    ).toBe(true);
  });

  it("does not match name-only", () => {
    expect(
      isSameLead(
        { firstName: "Elena", lastName: "Ruiz" },
        { firstName: "Elena", lastName: "Ruiz" },
      ),
    ).toBe(false);
  });

  it("does not match a different person with the same phone", () => {
    expect(
      isSameLead(
        { firstName: "Elena", lastName: "Ruiz", phone: "3215550188" },
        { firstName: "Ana", lastName: "Dib", phone: "3215550188" },
      ),
    ).toBe(false);
  });

  it("does not match Elena to Ana", () => {
    expect(
      isSameLead(
        { firstName: "Ana", lastName: "Dib", email: "ana@example.com" },
        { firstName: "Elena", lastName: "Ruiz", email: "elena.ruiz@example.com" },
      ),
    ).toBe(false);
  });

  it("normalizes a leading country code to 10 digits", () => {
    expect(normalizePhone("+1 321 555 0188")).toBe("3215550188");
  });
});

describe("packet parse", () => {
  it("reads named insured, phone, and email from a dec-like packet", () => {
    const parsed = parseLeadFromPacket(`HOMEOWNERS DECLARATIONS
Named Insured: Elena Ruiz
Phone: (321) 555-0188
Email: elena.ruiz@example.com
Location: 412 Harbor Isle Dr, Melbourne, FL 32935
`);
    expect(parsed).toMatchObject({
      firstName: "Elena",
      lastName: "Ruiz",
      phone: "(321) 555-0188",
      email: "elena.ruiz@example.com",
    });
  });

  it("splits a two-word named insured", () => {
    expect(splitNamedInsured("George Dib")).toEqual({
      firstName: "George",
      lastName: "Dib",
    });
  });
});
