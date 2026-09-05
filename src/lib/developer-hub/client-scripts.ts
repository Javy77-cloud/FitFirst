/**
 * Constrained client-script runner. No eval / new Function.
 * Seeded bodies use showError / setValue / getValue only.
 */

export type ClientScriptApi = {
  getValue: (field: string) => string;
  setValue: (field: string, value: string) => void;
  showError: (field: string, message: string) => void;
};

export type ScriptStatement =
  | { kind: "ifEmpty"; field: string; errorField: string; message: string }
  | { kind: "setIfEmpty"; field: string; value: string };

const IF_EMPTY =
  /if\s*\(\s*!getValue\(\s*["']([A-Za-z0-9_]+)["']\s*\)\s*\)\s*\{\s*showError\(\s*["']([A-Za-z0-9_]+)["']\s*,\s*["']([^"']+)["']\s*\)\s*;?\s*\}/g;

const SET_IF_EMPTY =
  /if\s*\(\s*!getValue\(\s*["']([A-Za-z0-9_]+)["']\s*\)\s*\)\s*\{\s*setValue\(\s*["']([A-Za-z0-9_]+)["']\s*,\s*["']([^"']*)["']\s*\)\s*;?\s*\}/g;

export function parseClientScript(body: string): ScriptStatement[] {
  const statements: ScriptStatement[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(IF_EMPTY)) {
    const key = `empty:${match[1]}:${match[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    statements.push({
      kind: "ifEmpty",
      field: match[1],
      errorField: match[2],
      message: match[3],
    });
  }
  for (const match of body.matchAll(SET_IF_EMPTY)) {
    const key = `set:${match[1]}:${match[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    statements.push({ kind: "setIfEmpty", field: match[1], value: match[3] });
  }
  return statements;
}

export function runClientScript(body: string, api: ClientScriptApi) {
  for (const statement of parseClientScript(body)) {
    if (statement.kind === "ifEmpty") {
      if (!api.getValue(statement.field).trim()) {
        api.showError(statement.errorField, statement.message);
      }
    } else if (statement.kind === "setIfEmpty") {
      if (!api.getValue(statement.field).trim()) {
        api.setValue(statement.field, statement.value);
      }
    }
  }
}

export const COV_A_EMPTY_SCRIPT = `if (!getValue("coverageA")) { showError("coverageA", "Coverage A is empty. Enter a dwelling limit before you save."); }`;
