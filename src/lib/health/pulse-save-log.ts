export type PulseSaveStage =
  | "ensure-table"
  | "insert"
  | "insert-without-optional-fks"
  | "action";

export type PulseSaveLogContext = {
  stage: PulseSaveStage;
  code: string | null;
  message: string;
  detail: string | null;
  constraint: string | null;
  moment: string | null;
  promptId: string | null;
  skipped: boolean | null;
  hasContact: boolean | null;
  hasPolicy: boolean | null;
  hasDeal: boolean | null;
  hasActivity: boolean | null;
};

function asPgError(error: unknown): {
  message?: string;
  code?: string;
  detail?: string;
  constraint?: string;
} {
  if (error && typeof error === "object") return error as {
    message?: string;
    code?: string;
    detail?: string;
    constraint?: string;
  };
  return { message: String(error) };
}

export function pulseSaveLogContext(input: {
  stage: PulseSaveStage;
  error: unknown;
  moment?: string;
  promptId?: string;
  skipped?: boolean;
  hasContact?: boolean;
  hasPolicy?: boolean;
  hasDeal?: boolean;
  hasActivity?: boolean;
}): PulseSaveLogContext {
  const err = asPgError(input.error);
  return {
    stage: input.stage,
    code: err.code ?? null,
    message: err.message ?? String(input.error),
    detail: err.detail ?? null,
    constraint: err.constraint ?? null,
    moment: input.moment ?? null,
    promptId: input.promptId ?? null,
    skipped: input.skipped ?? null,
    hasContact: input.hasContact ?? null,
    hasPolicy: input.hasPolicy ?? null,
    hasDeal: input.hasDeal ?? null,
    hasActivity: input.hasActivity ?? null,
  };
}

export function logPulseSaveFailure(input: {
  stage: PulseSaveStage;
  error: unknown;
  moment?: string;
  promptId?: string;
  skipped?: boolean;
  hasContact?: boolean;
  hasPolicy?: boolean;
  hasDeal?: boolean;
  hasActivity?: boolean;
}) {
  console.error("[pulse] could not save experience review", pulseSaveLogContext(input));
}
