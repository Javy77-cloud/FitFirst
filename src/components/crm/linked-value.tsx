import Link from "next/link";
import { CopyButton } from "@/components/crm/copy-button";
import { mailtoHref, telHref } from "@/lib/crm/lists";

export function LinkedValue({
  value,
  kind = "text",
  href,
}: {
  value?: string | null;
  kind?: "tel" | "email" | "text";
  href?: string | null;
}) {
  if (!value?.trim()) return <span>—</span>;
  const resolved =
    href ?? (kind === "tel" ? telHref(value) : kind === "email" ? mailtoHref(value) : null);
  const isInternal = Boolean(resolved?.startsWith("/"));
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {resolved ? (
        isInternal ? (
          <Link href={resolved} className="text-primary hover:underline">
            {value}
          </Link>
        ) : (
          <a href={resolved} className="text-primary hover:underline">
            {value}
          </a>
        )
      ) : (
        <span>{value}</span>
      )}
      <CopyButton text={value} />
    </span>
  );
}
