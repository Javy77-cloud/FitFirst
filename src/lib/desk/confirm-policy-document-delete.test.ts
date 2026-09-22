import { describe, expect, it, vi, afterEach } from "vitest";
import { confirmPolicyDocumentDelete } from "./confirm-policy-document-delete";

describe("policy document delete gate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires two confirms and a non-empty reason", () => {
    const confirm = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(true);
    const prompt = vi.fn().mockReturnValue("Wrong scan");
    vi.stubGlobal("confirm", confirm);
    vi.stubGlobal("prompt", prompt);
    expect(confirmPolicyDocumentDelete("the file “dec.pdf”")).toBe("Wrong scan");
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("stops when the first confirm is cancelled", () => {
    const confirm = vi.fn().mockReturnValue(false);
    const prompt = vi.fn();
    vi.stubGlobal("confirm", confirm);
    vi.stubGlobal("prompt", prompt);
    expect(confirmPolicyDocumentDelete("dec.pdf")).toBeNull();
    expect(prompt).not.toHaveBeenCalled();
  });
});
