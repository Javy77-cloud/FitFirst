import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConnectEmpty({
  title,
  href,
  cta,
  adminOnly,
  isAdmin,
}: {
  title: string;
  href: string;
  cta: string;
  adminOnly?: boolean;
  isAdmin: boolean;
}) {
  return (
    <section className="ff-card max-w-2xl p-5">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      {adminOnly && !isAdmin ? null : (
        <Link href={href} className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex")}>
          {cta}
        </Link>
      )}
    </section>
  );
}
