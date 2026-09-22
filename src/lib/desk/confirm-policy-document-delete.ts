/**
 * Policy document trash: two confirms + mandatory reason.
 * First: Delete this document? Second: Are you sure? + reason.
 */

export function confirmPolicyDocumentDelete(subject: string): string | null {
  const ask = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
  if (!ask || !promptFn) return null;
  if (!ask(`Delete this document?\n\n${subject}`)) return null;
  if (!ask(`Are you sure you want to delete ${subject}?`)) return null;
  const reason = promptFn("Reason for deleting this policy document (required):", "")?.trim() ?? "";
  if (!reason) {
    if (typeof globalThis.alert === "function") {
      globalThis.alert("A reason is required to delete a policy document.");
    }
    return null;
  }
  return reason;
}
