export function HubNotice({ notice }: { notice?: string }) {
  if (!notice) return null;
  const copy =
    notice === "saved"
      ? "Saved."
      : notice === "deleted"
        ? "Deleted."
        : notice;
  return (
    <p className="mb-3 rounded-md border border-border bg-card px-3 py-2 text-sm text-navy">{copy}</p>
  );
}
