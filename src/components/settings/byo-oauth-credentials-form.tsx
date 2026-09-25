import { saveByoOauthCredentials, startByoOauth } from "@/app/actions/byo-oauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import type { ByoOauthReturnPath, ByoOauthSpec } from "@/lib/integrations/oauth-specs";

export function ByoOauthCredentialsForm({
  item,
  spec,
  returnTo,
  showConnect = false,
  connectLabel = "Connect",
}: {
  item: CatalogItem;
  spec: ByoOauthSpec;
  returnTo: ByoOauthReturnPath;
  showConnect?: boolean;
  connectLabel?: string;
}) {
  const savedSecret = item.hasStoredCredentials;

  return (
    <form className="space-y-2" data-ff-byo-credentials-form={item.id} action={saveByoOauthCredentials}>
      <input type="hidden" name="provider" value={item.id} />
      <input type="hidden" name="next" value={returnTo} />
      <div>
        <Label className="text-xs">{spec.clientIdLabel}</Label>
        <Input
          name="clientId"
          defaultValue={item.clientId ?? ""}
          className="mt-1"
          autoComplete="off"
          placeholder={spec.developerAppName}
          data-ff-byo-client-id={item.id}
        />
      </div>
      <div>
        <Label className="text-xs">{spec.clientSecretLabel}</Label>
        <Input
          name="clientSecret"
          type="password"
          defaultValue=""
          className="mt-1"
          autoComplete="new-password"
          placeholder={
            savedSecret
              ? "Saved · paste a new secret to replace, or leave blank to keep"
              : "Agency secret only"
          }
          data-ff-byo-client-secret={item.id}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" variant="outline" data-ff-byo-save={item.id}>
          Replace / Save credentials
        </Button>
        {showConnect ? (
          <Button formAction={startByoOauth} type="submit" size="sm" data-ff-byo-connect={item.id}>
            {connectLabel}
          </Button>
        ) : null}
        <a
          href={spec.developerUrl}
          target="_blank"
          rel="noopener"
          className="text-helper text-primary hover:underline"
        >
          Create free {spec.vendor} app
        </a>
      </div>
      {showConnect ? null : null}
    </form>
  );
}
