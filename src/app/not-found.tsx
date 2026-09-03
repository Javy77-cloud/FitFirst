import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">FitFirst desk</p>
      <h1 className="mt-1 text-lg font-semibold text-navy">Record not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That link is missing or is not a desk id. The page did not crash — go back to a real
        record.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
        Back to the owner desk
      </Link>
    </div>
  );
}
