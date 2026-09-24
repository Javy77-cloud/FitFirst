/** FitFirst production detection. Demo passwords and unsigned sessions must not pass these. */
export function isFitFirstProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}
