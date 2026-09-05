import { ALLOWED_TRANSFORM_OPS, type AllowedTransformOp } from "./types";

export type FunctionRunResult = {
  ok: boolean;
  stub: boolean;
  output: unknown;
  error?: string;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickKeys(input: unknown, keys: string[]): JsonObject {
  const source = isObject(input) ? input : {};
  const out: JsonObject = {};
  for (const key of keys) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

function applyTransform(spec: JsonObject, input: unknown): unknown {
  const op = String(spec.op ?? "") as AllowedTransformOp;
  if (op === "identity") return input;
  if (op === "pick") {
    const keys = Array.isArray(spec.keys) ? spec.keys.filter((k): k is string => typeof k === "string") : [];
    return pickKeys(input, keys);
  }
  if (op === "wrap") {
    const as = typeof spec.as === "string" && spec.as ? spec.as : "result";
    return { [as]: input };
  }
  if (op === "set") {
    const key = typeof spec.key === "string" ? spec.key : "";
    const base: Record<string, unknown> = isObject(input) ? { ...input } : { value: input };
    if (key) base[key] = spec.value;
    return base;
  }
  return input;
}

/** Safe sandbox: allowlisted JSON transform only. Never eval, never spawn. */
export function runFunctionBody(body: string, input: unknown): FunctionRunResult {
  const trimmed = body.trim();
  if (!trimmed) {
    return {
      ok: true,
      stub: true,
      output: { ok: true, stub: true, message: "Empty body. Logged args only.", args: input },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: true,
      stub: true,
      output: {
        ok: true,
        stub: true,
        message:
          "Body is not an allowlisted JSON transform. Logged args only. Use {\"op\":\"identity\"}, {\"op\":\"pick\",\"keys\":[\"id\"]}, {\"op\":\"wrap\"}, or {\"op\":\"set\",\"key\":\"flag\",\"value\":true}.",
        args: input,
      },
    };
  }

  if (!isObject(parsed) || typeof parsed.op !== "string") {
    return {
      ok: true,
      stub: true,
      output: {
        ok: true,
        stub: true,
        message: "JSON body needs an allowlisted \"op\". Logged args only.",
        args: input,
        parsed,
      },
    };
  }

  if (!(ALLOWED_TRANSFORM_OPS as readonly string[]).includes(parsed.op)) {
    return {
      ok: false,
      stub: true,
      error: `Unknown op "${parsed.op}". Allowlist: ${ALLOWED_TRANSFORM_OPS.join(", ")}.`,
      output: { ok: false, stub: true, args: input },
    };
  }

  try {
    return { ok: true, stub: false, output: applyTransform(parsed, input) };
  } catch (err) {
    return {
      ok: false,
      stub: false,
      error: err instanceof Error ? err.message : "Transform failed.",
      output: { ok: false, args: input },
    };
  }
}

export function parseJsonInput(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return { text: trimmed };
  }
}
