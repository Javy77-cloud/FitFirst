"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { saveByoOauthCredentials } from "@/app/actions/byo-oauth";
import { readListFormData } from "@/components/settings/stay-on-save-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { flashAction } from "@/lib/flash-client";
import { persistFlashScroll } from "@/lib/flash-scroll";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import type { ByoOauthReturnPath, ByoOauthSpec } from "@/lib/integrations/oauth-specs";

export function ByoOauthCredentialsForm({
  item,
  spec,
  returnTo,
}: {
  item: CatalogItem;
  spec: ByoOauthSpec;
  returnTo: ByoOauthReturnPath;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const savedSecret = item.hasCredentials && !item.hasEnvCredentials;

  return (
    <form
      ref={formRef}
      className="space-y-2"
      data-ff-byo-credentials-form={item.id}
      action={async (submitted) => {
        persistFlashScroll({ pathname, anchor: item.id });
        const payload = formRef.current ? readListFormData(formRef.current) : submitted;
        const result = await saveByoOauthCredentials(payload);
        if (!result.ok) {
          flashAction(result.message, "error");
          return;
        }
        flashAction(result.message, "success");
        router.refresh();
      }}
    >
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
          defaultValue={savedSecret ? "••••••••••••" : ""}
          className="mt-1"
          autoComplete="new-password"
          placeholder={savedSecret ? "Saved · leave to keep" : "Agency secret only"}
          data-ff-byo-client-secret={item.id}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" variant="outline">
          Save credentials
        </Button>
        <a
          href={spec.developerUrl}
          target="_blank"
          rel="noopener"
          className="text-helper text-primary hover:underline"
        >
          Create free {spec.vendor} app
        </a>
      </div>
    </form>
  );
}
