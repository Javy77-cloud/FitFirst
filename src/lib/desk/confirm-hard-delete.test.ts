import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmHardDelete } from "./confirm-hard-delete";

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
    expect(confirm.mock.calls[1]?.[0]).toMatch(/permanently/);
  });

  it("returns true only after both confirms", () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);
    expect(confirmHardDelete("this lead")).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
