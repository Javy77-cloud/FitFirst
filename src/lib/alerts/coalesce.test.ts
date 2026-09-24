import { describe, expect, it, beforeEach } from "vitest";
import { coalesceAsync, resetCoalesceForTests } from "./coalesce";

describe("alert sync coalesce", () => {
  beforeEach(() => resetCoalesceForTests());

  it("serializes concurrent runs so the latest snapshot still executes", async () => {
    const order: number[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = coalesceAsync("k", async () => {
      order.push(1);
      await gate;
      order.push(2);
      return "a";
    });
    const second = coalesceAsync("k", async () => {
      order.push(3);
      return "b";
    });

    release();
    await expect(first).resolves.toBe("a");
    await expect(second).resolves.toBe("b");
    expect(order).toEqual([1, 2, 3]);
  });
});
