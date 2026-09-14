import { describe, expect, it } from "vitest";
import {
  customFieldKeyFor,
  isContactSystemColumn,
  systemColumnForFieldKey,
} from "./contact-field-patch";

describe("contact-field-patch", () => {
  it("maps catalog keys to system columns", () => {
    expect(systemColumnForFieldKey("first_name")).toBe("firstName");
    expect(systemColumnForFieldKey("dateOfBirth")).toBe("dateOfBirth");
    expect(systemColumnForFieldKey("occupation")).toBeNull();
    expect(systemColumnForFieldKey("preferred_contact_method")).toBeNull();
  });

  it("normalizes custom storage keys", () => {
    expect(customFieldKeyFor("firstName")).toBe("first_name");
    expect(customFieldKeyFor("occupation")).toBe("occupation");
    expect(customFieldKeyFor("marital_status")).toBe("marital_status");
  });

  it("detects system columns", () => {
    expect(isContactSystemColumn("email")).toBe(true);
    expect(isContactSystemColumn("occupation")).toBe(false);
  });
});
