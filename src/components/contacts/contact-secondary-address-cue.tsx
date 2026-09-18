import Link from "next/link";

export function ContactSecondaryAddressCue({
  dealId,
  insuredAddress,
}: {
  dealId: string;
  insuredAddress: string;
}) {
  return (
    <div
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      data-ff-contact-secondary-address-cue=""
      role="status"
    >
      This Contact address matches a rental / secondary insured location
      {insuredAddress ? ` (${insuredAddress})` : ""}. Contact address should be the
      primary residence — not every property on a deal.{" "}
      <Link href={`/deals/${dealId}`} className="font-semibold underline">
        Open deal
      </Link>{" "}
      to confirm Property use. This notice does not change the saved address.
    </div>
  );
}
