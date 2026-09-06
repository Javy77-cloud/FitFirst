import { describe, expect, it } from "vitest";
import { kindClass } from "@/lib/ops/calendar";
import {
  CONTACT_ACTION_BUTTONS,
  CONTACT_ACTION_COLORS,
  contactActionButtonClass,
  contactActionButtonStyle,
  contactActionHref,
  isContactActionKind,
} from "./contact-actions";

describe("contact action buttons", () => {
  it("locks the KEEP Call / SMS / E-mail fills for Leads and Calendar", () => {
    expect(CONTACT_ACTION_BUTTONS.map((row) => row.label)).toEqual(["Call", "SMS", "E-mail"]);
    expect(CONTACT_ACTION_COLORS).toEqual({
      call: "#7A5C18",
      sms: "#AC401C",
      email: "#101C34",
    });
    expect(CONTACT_ACTION_COLORS.call).not.toBe("#059669");
    expect(CONTACT_ACTION_COLORS.email).not.toBe("#d97706");
    expect(CONTACT_ACTION_COLORS.sms).not.toBe("#0d9488");
    expect(contactActionButtonClass("call")).toBe(kindClass("call"));
    expect(contactActionButtonClass("sms")).toBe(kindClass("sms"));
    expect(contactActionButtonClass("email")).toBe(kindClass("email"));
    expect(contactActionButtonClass("call")).toBe("ff-cal-call");
    expect(contactActionButtonClass("sms")).toBe("ff-cal-sms");
    expect(contactActionButtonClass("email")).toBe("ff-cal-email");
    expect(contactActionButtonStyle("call")).toEqual({ backgroundColor: "#7A5C18", color: "#ffffff" });
    expect(contactActionButtonStyle("sms")).toEqual({ backgroundColor: "#AC401C", color: "#ffffff" });
    expect(contactActionButtonStyle("email")).toEqual({ backgroundColor: "#101C34", color: "#ffffff" });
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
