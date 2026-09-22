import {
  CREATE_POLICY_SUCCESS_COPY,
  CREATE_POLICY_SUCCESS_TITLE,
} from "@/lib/policy/dec-prompt";

/** Center congratulations + CSS fireworks after a successful DEC mint. */
export function PolicyMintSuccessPanel() {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-emerald-700/25 bg-emerald-50 px-4 py-6 text-center"
      data-ff-create-policy-success=""
      aria-live="polite"
    >
      <div className="ff-mint-fireworks" aria-hidden="true" data-ff-mint-fireworks="">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className="ff-mint-firework" style={{ ["--i" as string]: String(i) }} />
        ))}
      </div>
      <p className="relative text-base font-semibold text-emerald-950">{CREATE_POLICY_SUCCESS_TITLE}</p>
      <p className="relative mt-1 text-sm text-emerald-900/80">{CREATE_POLICY_SUCCESS_COPY}</p>
    </div>
  );
}
