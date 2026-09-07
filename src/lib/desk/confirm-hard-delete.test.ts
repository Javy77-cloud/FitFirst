import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmDeleteOnce, confirmHardDelete } from "./confirm-hard-delete";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("confirmHardDelete", () => {
  it("stops on the first cancel", () => {
    const confirm = vi.fn().mockReturnValueOnce(false);
    vi.stubGlobal("confirm", confirm);
    expect(confirmHardDelete("this lead")).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0]?.[0]).toMatch(/Are you sure you want to delete this lead/);
  });

  it("asks a second time and stops if that is cancelled", () => {
    const confirm = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    vi.stubGlobal("confirm", confirm);
    expect(confirmHardDelete("2 selected tasks")).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls[1]?.[0]).toBe("Are you sure you want to delete 2 selected tasks?");
  });

  it("returns true only after both confirms", () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);
    expect(confirmHardDelete("this lead")).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls[0]?.[0]).toBe(confirm.mock.calls[1]?.[0]);
  });

  it("asks Are you sure you want to delete … twice for a file", () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);
    expect(confirmHardDelete('the file “wind-mit.pdf”')).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls[0]?.[0]).toBe('Are you sure you want to delete the file “wind-mit.pdf”?');
    expect(confirm.mock.calls[1]?.[0]).toBe('Are you sure you want to delete the file “wind-mit.pdf”?');
  });
});

describe("confirmDeleteOnce", () => {
  it("asks Are you sure you want to delete … exactly once for leads", () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);
    expect(confirmDeleteOnce("this lead")).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0]?.[0]).toBe("Are you sure you want to delete this lead?");
    expect(confirmDeleteOnce("3 selected leads")).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls[1]?.[0]).toBe("Are you sure you want to delete 3 selected leads?");
  });
});
