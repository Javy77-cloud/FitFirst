import { describe, expect, it } from "vitest";
import { COV_A_EMPTY_SCRIPT, parseClientScript, runClientScript } from "./client-scripts";
import { clampMacroActions, macroIsManualOnly, parseMacroActions, validateMacroActions } from "./macros";
import { mergeTokens } from "./merge";
import { isProtectedAnaRecord } from "./protected";
import { DEAL_ID, LEAD_ID } from "@/lib/fixtures/ids";
import { MACRO_CREATE_TASK_CAP, MACRO_FIELD_UPDATE_CAP } from "./types";

describe("developer hub macros", () => {
  it("caps field updates and create-task actions like Zoho", () => {
    const actions = parseMacroActions({
      email: { subject: "Hi", body: "Body" },
      fieldUpdates: [
        { field: "status", value: "contacted" },
        { field: "notes", value: "a" },
        { field: "source", value: "book" },
        { field: "notes", value: "dropped" },
      ],
      createTasks: [
        { title: "One" },
        { title: "Two" },
        { title: "Three" },
        { title: "Four" },
      ],
    });
    expect(actions.fieldUpdates).toHaveLength(MACRO_FIELD_UPDATE_CAP);
    expect(actions.createTasks).toHaveLength(MACRO_CREATE_TASK_CAP);
    expect(actions.email?.subject).toBe("Hi");
    expect(clampMacroActions(actions).createTasks).toHaveLength(3);
  });

  it("rejects unknown fields and stays manual-only", () => {
    expect(macroIsManualOnly()).toBe(true);
    const bad = validateMacroActions("leads", {
      email: null,
      fieldUpdates: [{ field: "coverageA", value: "1" }],
      createTasks: [],
    });
    expect(bad.ok).toBe(false);
    const good = validateMacroActions("leads", {
      email: null,
      fieldUpdates: [{ field: "status", value: "contacted" }],
      createTasks: [{ title: "Follow up" }],
    });
    expect(good.ok).toBe(true);
  });

  it("merges record tokens for URL and email stubs", () => {
    const out = mergeTokens("Hi {{record.firstName}} at {{record.city}}", {
      id: "x",
      module: "leads",
      firstName: "Elena",
      city: "Melbourne",
    });
    expect(out).toBe("Hi Elena at Melbourne");
  });

  it("never treats Ana ids as runnable records", () => {
    expect(isProtectedAnaRecord(LEAD_ID)).toBe(true);
    expect(isProtectedAnaRecord(DEAL_ID)).toBe(true);
    expect(isProtectedAnaRecord("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(false);
  });
});

describe("client script runner", () => {
  it("parses the seeded Cov A empty warning without eval", () => {
    const statements = parseClientScript(COV_A_EMPTY_SCRIPT);
    expect(statements).toEqual([
      {
        kind: "ifEmpty",
        field: "coverageA",
        errorField: "coverageA",
        message: "Coverage A is empty. Enter a dwelling limit before you save.",
      },
    ]);
  });

  it("shows an error only when the field is empty", () => {
    const errors: string[] = [];
    const values = { coverageA: "" };
    runClientScript(COV_A_EMPTY_SCRIPT, {
      getValue: (field) => values[field as keyof typeof values] ?? "",
      setValue: (field, value) => {
        values[field as keyof typeof values] = value;
      },
      showError: (_field, message) => errors.push(message),
    });
    expect(errors).toHaveLength(1);
    values.coverageA = "321000";
    errors.length = 0;
    runClientScript(COV_A_EMPTY_SCRIPT, {
      getValue: (field) => values[field as keyof typeof values] ?? "",
      setValue: () => undefined,
      showError: (_field, message) => errors.push(message),
    });
    expect(errors).toHaveLength(0);
  });
});
