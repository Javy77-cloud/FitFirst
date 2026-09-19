import { redirect } from "next/navigation";

export default async function DocumentsSignedAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" && value) next.set(key, value);
  }
  const suffix = next.size ? `?${next.toString()}` : "";
  redirect(`/esign${suffix}`);
}
