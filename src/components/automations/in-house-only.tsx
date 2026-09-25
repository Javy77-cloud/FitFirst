import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InHouseOnly({ title }: { title: string }) {
  return (
    <section className="ff-card max-w-2xl p-5">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      <Link
        href="/automations/playbooks"
        className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex")}
      >
        Open playbooks
      </Link>
    </section>
  );
}
