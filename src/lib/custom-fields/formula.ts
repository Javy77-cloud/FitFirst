/** Zoho-like formula: numbers, + − * /, parentheses, and field references. */

export function extractFormulaFields(expression: string): string[] {
  const keys = new Set<string>();
  for (const match of expression.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}|[A-Za-z_][A-Za-z0-9_]*/g)) {
    const key = (match[1] ?? match[0]).trim();
    if (key) keys.add(key);
  }
  return [...keys];
}

function toNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const text = String(raw ?? "").replace(/[$,%\s]/g, "");
  const value = Number(text);
  return Number.isFinite(value) ? value : 0;
}

export function evaluateFormula(
  expression: string,
  values: Record<string, string | number | null | undefined>,
): { ok: true; value: number } | { ok: false; error: string } {
  const source = expression.trim();
  if (!source) return { ok: false, error: "Enter a formula." };

  const substituted = source
    .replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key: string) => String(toNumber(values[key])))
    .replace(/[A-Za-z_][A-Za-z0-9_]*/g, (key) => String(toNumber(values[key])));

  if (!/^[\d.\s+\-*/()]+$/.test(substituted)) {
    return { ok: false, error: "Use numbers, field names, and + − * / only." };
  }

  try {
    const tokens = tokenize(substituted);
    const value = evalTokens(tokens);
    if (!Number.isFinite(value)) return { ok: false, error: "Formula did not resolve to a number." };
    return { ok: true, value: Math.round(value * 10000) / 10000 };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid formula." };
  }
}

function tokenize(source: string): Array<{ kind: "num" | "op"; value: string }> {
  const tokens: Array<{ kind: "num" | "op"; value: string }> = [];
  const matcher = /\d+(?:\.\d+)?|[+\-*/()]/g;
  let match = matcher.exec(source);
  while (match) {
    tokens.push(/[+\-*/()]/.test(match[0]) ? { kind: "op", value: match[0] } : { kind: "num", value: match[0] });
    match = matcher.exec(source);
  }
  return tokens;
}

function evalTokens(tokens: Array<{ kind: "num" | "op"; value: string }>): number {
  const output: number[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

  const apply = () => {
    const op = ops.pop();
    const b = output.pop();
    const a = output.pop();
    if (op == null || a == null || b == null) throw new Error("Formula is incomplete.");
    if (op === "+") output.push(a + b);
    else if (op === "-") output.push(a - b);
    else if (op === "*") output.push(a * b);
    else if (op === "/") {
      if (b === 0) throw new Error("Cannot divide by zero.");
      output.push(a / b);
    }
  };

  let expectValue = true;
  for (const token of tokens) {
    if (token.kind === "num") {
      output.push(Number(token.value));
      expectValue = false;
      continue;
    }
    if (token.value === "(") {
      ops.push("(");
      expectValue = true;
      continue;
    }
    if (token.value === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") apply();
      if (ops.pop() !== "(") throw new Error("Mismatched parentheses.");
      expectValue = false;
      continue;
    }
    if (token.value === "-" && expectValue) {
      output.push(0);
      ops.push("-");
      continue;
    }
    while (ops.length && ops[ops.length - 1] !== "(" && prec[ops[ops.length - 1]] >= prec[token.value]) {
      apply();
    }
    ops.push(token.value);
    expectValue = true;
  }
  while (ops.length) {
    if (ops[ops.length - 1] === "(") throw new Error("Mismatched parentheses.");
    apply();
  }
  if (output.length !== 1) throw new Error("Formula is incomplete.");
  return output[0];
}

export function formatFormulaValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}
