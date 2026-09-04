import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConnectEmpty({
  title,
  body,
  href,
  cta,
  adminOnly,
  isAdmin,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  adminOnly?: boolean;
  isAdmin: boolean;
}) {
  return (
    <section className="ff-card max-w-2xl p-5">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {adminOnly && !isAdmin ? (
        <p className="mt-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Ask Admin (Javy) to connect this from Settings → Integrations. Agents cannot flip a
          vendor stub.
        </p>
      ) : (
        <Link href={href} className={cn(buttonVariants({ size: "sm" }), "mt-4 inline-flex")}>
          {cta}
        </Link>
      )}
    </section>
  );
}
