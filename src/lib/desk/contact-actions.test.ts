import { describe, expect, it } from "vitest";
import { kindClass } from "@/lib/ops/calendar";
import {
  CONTACT_ACTION_BUTTONS,
  contactActionButtonClass,
  contactActionHref,
  isContactActionKind,
} from "./contact-actions";

describe("contact action buttons", () => {
  it("uses Calendar kindClass colors for Call / SMS / E-mail", () => {
    expect(CONTACT_ACTION_BUTTONS.map((row) => row.label)).toEqual(["Call", "SMS", "E-mail"]);
    expect(contactActionButtonClass("call")).toBe(kindClass("call"));
    expect(contactActionButtonClass("sms")).toBe(kindClass("sms"));
    expect(contactActionButtonClass("email")).toBe(kindClass("email"));
    expect(contactActionButtonClass("call")).toBe("ff-cal-call");
    expect(contactActionButtonClass("sms")).toBe("ff-cal-sms");
    expect(contactActionButtonClass("email")).toBe("ff-cal-email");
    expect(isContactActionKind("call")).toBe(true);
    expect(isContactActionKind("task")).toBe(false);
  });

  it("builds tel / sms / mailto and hides missing destinations", () => {
    expect(contactActionHref("call", { phone: "(321) 555-0144" })).toBe("tel:3215550144");
    expect(contactActionHref("sms", { phone: "+1 321 555 0144" })).toBe("sms:+13215550144");
    expect(contactActionHref("email", { email: "ana@example.com" })).toBe("mailto:ana@example.com");
    expect(contactActionHref("call", { phone: null })).toBeNull();
    expect(contactActionHref("sms", {})).toBeNull();
    expect(contactActionHref("email", { email: "  " })).toBeNull();
  });
});
