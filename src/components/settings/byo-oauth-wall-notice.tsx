import { byoOauthWallCopy } from "@/lib/integrations/byo-credentials";

export function ByoOauthWallNotice({
  lastOauthError,
}: {
  lastOauthError?: string | null;
}) {
  return (
    <p
      className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm"
      data-ff-oauth-wall=""
    >
      {byoOauthWallCopy(lastOauthError)}
    </p>
  );
}
