import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function StartShopForm({
  leadId,
  label = "Convert",
  size = "xs",
}: {
  leadId: string;
  label?: string;
  showLine?: boolean;
  size?: "xs" | "sm";
}) {
  return (
    <Link
      href={`/leads/${leadId}/convert`}
      className={buttonVariants({ size })}
      data-ff-convert-deal
    >
      {label}
    </Link>
  );
}
