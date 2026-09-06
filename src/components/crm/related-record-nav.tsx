import Link from "next/link";

export function RelatedRecordNav({
  href,
  label,
  testId,
}: {
  href: string;
  label: string;
  testId: string;
}) {
  return (
    <Link
      href={href}
      data-ff-related-record={testId}
      className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-navy hover:bg-secondary"
    >
      {label}
    </Link>
  );
}
