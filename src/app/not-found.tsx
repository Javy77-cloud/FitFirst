import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f3ec] px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5c6b7a]">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#111827]">Page not found</h1>
      <p className="mt-2 max-w-md text-base text-[#5c6b7a]">
        That record is not on this desk.
      </p>
      <Link href="/" className="mt-4 text-sm font-medium text-[#1d6fb8] hover:underline">
        Back to Home
      </Link>
    </div>
  );
}
