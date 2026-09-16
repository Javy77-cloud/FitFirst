import { describe, expect, it } from "vitest";
import { CORE_FIELDS } from "./defaults";
import { CONTACT_MODULE_FIELDS } from "@/lib/contacts/contact-field-catalog";
import { defaultFieldsForModule } from "./modules";
import {
  canonicalFieldType,
  canonicalizeIdentityField,
  htmlAutoCompleteForField,
  htmlInputTypeForField,
  identityTypeNeedsRepair,
  isEmailField,
  isPersonNameField,
} from "./identity-field";

describe("identity field types", () => {
  it("keeps catalog first / middle / last name as single_line and email as email", () => {
    for (const catalog of [
      CORE_FIELDS,
      defaultFieldsForModule("leads"),
      defaultFieldsForModule("contacts"),
      CONTACT_MODULE_FIELDS,
    ]) {
      const byKey = Object.fromEntries(catalog.map((field) => [field.key, field]));
      expect(byKey.middle_name?.type).toBe("single_line");
      expect(byKey.first_name?.type).toBe("single_line");
      expect(byKey.last_name?.type).toBe("single_line");
      expect(byKey.email?.type).toBe("email");
      expect(isPersonNameField(byKey.middle_name!)).toBe(true);
      expect(isEmailField(byKey.email!)).toBe(true);
      expect(isEmailField(byKey.middle_name!)).toBe(false);
    }
  });

  it("coerces a live middle-name row stored as email back to text", () => {
    const broken = canonicalizeIdentityField({
      key: "middle_name",
      label: "Middle name",
      type: "email" as const,
    });
    expect(broken.type).toBe("single_line");
    expect(htmlInputTypeForField({ key: "middle_name", type: "email", label: "Middle name" })).toBe(
      "text",
    );
    expect(htmlAutoCompleteForField({ key: "middle_name", label: "Middle name" })).toBe(
      "additional-name",
    );
    expect(htmlAutoCompleteForField({ key: "middle_name", label: "Middle name" })).not.toBe("email");
    expect(identityTypeNeedsRepair("middle_name", "email", "Middle name")).toBe(true);
  });

  it("treats a duplicated email field relabeled Middle name as plain text", () => {
    expect(
      htmlInputTypeForField({ key: "email_copy", type: "email", label: "Middle name" }),
    ).toBe("text");
    expect(canonicalFieldType("email_copy", "email", "Middle name")).toBe("single_line");
    expect(isPersonNameField({ key: "email_copy", label: "Middle name" })).toBe(true);
    expect(isEmailField({ key: "email_copy", type: "email", label: "Middle name" })).toBe(false);
  });

  it("forces email keys to type=email even when the catalog row drifted to single_line", () => {
    expect(canonicalFieldType("email", "single_line", "Email")).toBe("email");
    expect(canonicalFieldType("co_applicant_email", "phone", "Email")).toBe("email");
    expect(htmlInputTypeForField({ key: "email", type: "single_line", label: "Email" })).toBe(
      "email",
    );
    expect(htmlAutoCompleteForField({ key: "email", label: "Email" })).toBe("email");
    expect(identityTypeNeedsRepair("email", "single_line", "Email")).toBe(true);
  });
});
