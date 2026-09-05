import { policyStatusClass } from "@/lib/desk/policy-family";

export function PolicyStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-sm px-1.5 py-0.5 text-caption font-semibold uppercase tracking-wide ${policyStatusClass(status)}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
