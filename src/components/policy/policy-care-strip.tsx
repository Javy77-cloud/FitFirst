import Link from "next/link";
import type { PolicyCareItem } from "@/lib/policy/care-strip";

export function PolicyCareStrip({
  policyId,
  items,
}: {
  policyId: string;
  items: PolicyCareItem[];
}) {
  if (items.length === 0) return null;
  const lead = items[0]!;
  return (
    <section className="ff-policy-care" data-ff-policy-care-strip="">
      <div className="ff-policy-care-copy">
        <p className="ff-policy-care-kicker">Needs care now</p>
        <p className="ff-policy-care-line">{lead.why}</p>
      </div>
      <div className="ff-policy-care-jumps">
        {items.map((item) => (
          <Link
            key={item.key}
            href={`/policies/${policyId}?tab=${item.tab}`}
            scroll={false}
            className="ff-policy-care-jump"
            data-ff-policy-care-jump={item.tab}
          >
            {item.label}
            <em>{item.count}</em>
          </Link>
        ))}
      </div>
    </section>
  );
}
