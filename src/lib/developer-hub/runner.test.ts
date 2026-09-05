import { describe, expect, it } from "vitest";
import { parseJsonInput, runFunctionBody } from "./runner";

describe("runFunctionBody", () => {
  it("applies identity and pick transforms", () => {
    const input = { id: "c1", name: "Elena", extra: true };
    expect(runFunctionBody('{"op":"identity"}', input)).toEqual({
      ok: true,
      stub: false,
      output: input,
    });
    expect(runFunctionBody('{"op":"pick","keys":["id","name"]}', input).output).toEqual({
      id: "c1",
      name: "Elena",
    });
  });

  it("wraps and sets without evaluating host code", () => {
    expect(runFunctionBody('{"op":"wrap","as":"result"}', { a: 1 }).output).toEqual({
      result: { a: 1 },
    });
    expect(runFunctionBody('{"op":"set","key":"flag","value":true}', { a: 1 }).output).toEqual({
      a: 1,
      flag: true,
    });
  });

  it("returns a logged-args stub for non-JSON or unknown shape", () => {
    const empty = runFunctionBody("", { hello: "desk" });
    expect(empty.ok).toBe(true);
    expect(empty.stub).toBe(true);
    const js = runFunctionBody("return process.exit(1)", { hello: "desk" });
    expect(js.ok).toBe(true);
    expect(js.stub).toBe(true);
    expect(String((js.output as { message?: string }).message)).toContain("allowlisted");
    const badOp = runFunctionBody('{"op":"eval"}', {});
    expect(badOp.ok).toBe(false);
  });
});

describe("parseJsonInput", () => {
  it("parses JSON or wraps raw text", () => {
    expect(parseJsonInput('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonInput("plain")).toEqual({ text: "plain" });
    expect(parseJsonInput("")).toEqual({});
  });
});
