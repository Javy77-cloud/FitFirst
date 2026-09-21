/**
 * Settle when the budget expires even if `work` never resolves.
 * The original promise is left running; late failures are swallowed so a
 * timed-out server action can still return to the client.
 */
export async function withDeadline<T>(
  work: Promise<T>,
  ms: number,
  onTimeout: () => T,
): Promise<T> {
  const budget = Number.isFinite(ms) && ms > 0 ? ms : 1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  void work.catch(() => undefined);
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          resolve(onTimeout());
        } catch (error) {
          reject(error);
        }
      }, budget);
      work.then(
        (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          reject(error);
        },
      );
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
