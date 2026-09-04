import Link from "next/link";

export function InsuredLink({
  href,
  name,
}: {
  href: string | null;
  name: string;
}) {
  if (!href) return <span>{name}</span>;
  return (
    <Link href={href} className="text-primary hover:underline">
      {name}
    </Link>
  );
}
