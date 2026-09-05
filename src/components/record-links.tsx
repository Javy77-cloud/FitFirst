import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { clientStatusColor, displayStatusLabel } from "@/lib/desk/status-colors";

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
  return (
    <StatusBadge color={clientStatusColor(status)} uppercase={false}>
      {displayStatusLabel(status)}
    </StatusBadge>
  );
}
