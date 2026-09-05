import { executeDeveloperFunction, getDeveloperFunctionByApiName } from "./store";

export type FunctionExecuteResult =
  | { ok: true; detail: string }
  | { ok: false; reason: "missing_api_name" | "not_found" | "failed"; detail: string };

/** Custom Button → Function by apiName. Uses the same developer_functions table as Settings. */
export async function executeFunctionByApiName(
  apiName: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<FunctionExecuteResult> {
  const name = (apiName ?? "").trim();
  if (!name) {
    return { ok: false, reason: "missing_api_name", detail: "No function apiName on this button." };
  }
  const fn = await getDeveloperFunctionByApiName(name);
  if (!fn) {
    return { ok: false, reason: "not_found", detail: `No function named ${name}.` };
  }
  const { result } = await executeDeveloperFunction({ fn, input: payload, source: "test" });
  if (!result.ok) {
    return { ok: false, reason: "failed", detail: result.error ?? "Function failed." };
  }
  return { ok: true, detail: JSON.stringify(result.output) };
}
