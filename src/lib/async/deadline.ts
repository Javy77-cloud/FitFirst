/** Race a promise against a hard wall-clock deadline. Does not cancel the loser. */

export class DeadlineError extends Error {
  readonly timedOut = true as const;
  constructor(message: string) {
    super(message);
    this.name = "DeadlineError";
  }
}

export function isDeadlineError(error: unknown): error is DeadlineError {
  return (
    error instanceof DeadlineError ||
    (Boolean(error) &&
      typeof error === "object" &&
      (error as { timedOut?: unknown }).timedOut === true)
  );
}

export async function withDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new DeadlineError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
