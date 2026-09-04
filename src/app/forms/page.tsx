import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Old Forms nav now lands on Documents → Forms. Quote Sheet fill stays at /forms/[slug]. */
export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>;
}) {
  const { dealId } = await searchParams;
  const q = new URLSearchParams({ library: "forms" });
  if (dealId) q.set("dealId", dealId);
  redirect(`/documents?${q.toString()}`);
}
