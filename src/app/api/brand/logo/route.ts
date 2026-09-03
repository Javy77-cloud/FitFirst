import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAgencyBrand } from "@/lib/db/brand-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const brand = await getAgencyBrand();
  if (!brand?.logoStoragePath) {
    return new Response("No logo", { status: 404 });
  }
  const abs = path.join(
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"),
    brand.logoStoragePath,
  );
  try {
    const buf = await readFile(abs);
    return new Response(buf, {
      headers: {
        "Content-Type": brand.logoMime || "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Missing file", { status: 404 });
  }
}
