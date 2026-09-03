import Link from "next/link";

export function RecordLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

export function ClientStatusPill({ status }: { status: string }) {
  const label =
    status === "client" ? "Client" : status === "former_client" ? "Former Client" : "Not a client";
  const cls =
    status === "client"
      ? "bg-fit-green-bg text-fit-green"
      : status === "former_client"
        ? "bg-fit-yellow-bg text-fit-yellow"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
