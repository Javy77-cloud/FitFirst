import { logQuoteOpen } from "@/lib/comms/quote-delivery-store";
import { TRACKING_PIXEL_GIF } from "@/lib/comms/quote-delivery";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  await logQuoteOpen(token).catch(() => false);
  return new Response(new Uint8Array(TRACKING_PIXEL_GIF), {
    status: 200,
    headers: {
      "content-type": "image/gif",
      "cache-control": "no-store, private",
    },
  });
}
