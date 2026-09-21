/** One calm center line. Two cues at most — silence, then the next chase. */
export function stackMidLine(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");
}
