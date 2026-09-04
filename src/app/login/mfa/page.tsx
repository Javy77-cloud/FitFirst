import { beginTotpEnroll, confirmMfa, sendMfaStub } from "@/app/actions/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { latestStubChallenge } from "@/lib/auth/mfa-store";
import { MFA_METHOD_LABEL, needsMfaEnroll, normalizeMfaMethod } from "@/lib/auth/mfa";
import { pendingMfaUser } from "@/lib/auth/session";
import { otpauthUri, totpAt } from "@/lib/auth/totp";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ enroll?: string; method?: string; sent?: string; error?: string }>;
}) {
  const q = await searchParams;
  const user = await pendingMfaUser();
  if (!user) redirect("/login?error=mfa");

  const enroll = q.enroll === "1" || needsMfaEnroll(user);
  const method = normalizeMfaMethod(q.method ?? user.mfaMethod) ?? (enroll ? null : "totp");
  const stub = await latestStubChallenge(user.id);
  const totpUri = user.totpSecret ? otpauthUri({ secret: user.totpSecret, account: user.email }) : null;
  const demoCode = user.totpSecret && user.email === "javy@fitfirst.local" ? totpAt(user.totpSecret) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="ff-card w-full max-w-lg space-y-4 p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">FitFirst desk</div>
        <h1 className="text-xl font-semibold text-navy">
          {enroll ? "Set up 2-step authentication" : "2-step verification"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.name} · {user.email}. Every Admin and Agent needs a password and a second
          step — SMS, email, or an authenticator app. SMS and email are stub senders that log
          the code here. Nothing leaves this desk.
        </p>

        {q.error === "code" ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
            That code did not match. Request a new stub or try the next authenticator tick.
          </p>
        ) : null}
        {q.sent ? (
          <p className="rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green">
            Stub {q.sent} code logged below. Enter it to continue.
          </p>
        ) : null}

        {enroll && !method ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <form action={beginTotpEnroll}>
              <Button type="submit" className="w-full" variant="outline">
                Authenticator
              </Button>
            </form>
            <form action={sendMfaStub}>
              <input type="hidden" name="method" value="email" />
              <Button type="submit" className="w-full" variant="outline">
                Email stub
              </Button>
            </form>
            <form action={sendMfaStub}>
              <input type="hidden" name="method" value="sms" />
              <Button type="submit" className="w-full" variant="outline">
                SMS stub
              </Button>
            </form>
          </div>
        ) : null}

        {method === "totp" && totpUri ? (
          <div className="rounded-md border border-dashed border-border bg-[color:var(--ff-wash)] px-3 py-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Authenticator QR stub
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Scan or paste this otpauth URI into Google Authenticator / Authy. Secret stays on
              this desk.
            </p>
            <code className="mt-2 block break-all text-[11px] text-navy">{totpUri}</code>
            {demoCode ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Local Javy demo code right now:{" "}
                <span className="font-semibold text-navy">{demoCode}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {method && method !== "totp" ? (
          <div className="rounded-md border border-border px-3 py-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {MFA_METHOD_LABEL[method]} stub log
            </div>
            {stub ? (
              <p className="mt-1">
                Sent to {stub.destination}. Code{" "}
                <span className="font-semibold text-navy">{stub.code}</span> (expires in 10 min).
              </p>
            ) : (
              <form action={sendMfaStub} className="mt-2">
                <input type="hidden" name="method" value={method} />
                <Button type="submit" size="sm" variant="outline">
                  Send stub code
                </Button>
              </form>
            )}
          </div>
        ) : null}

        {method ? (
          <form action={confirmMfa} className="space-y-3">
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="enroll" value={enroll ? "1" : "0"} />
            {method === "sms" ? (
              <div>
                <Label className="text-xs">Mobile for SMS stub</Label>
                <Input name="mfaPhone" defaultValue={user.mfaPhone ?? "321-555-0140"} className="mt-1" />
              </div>
            ) : null}
            <div>
              <Label className="text-xs">6-digit code</Label>
              <Input name="code" required inputMode="numeric" pattern="[0-9]{6}" className="mt-1" />
            </div>
            <Button type="submit">{enroll ? "Enroll and open desk" : "Verify and open desk"}</Button>
          </form>
        ) : null}

        {!enroll && method === "totp" ? (
          <form action={sendMfaStub} className="text-xs text-muted-foreground">
            Lost the authenticator? Ask an Admin for an MFA recovery stub, or use email:{" "}
            <input type="hidden" name="method" value="email" />
            <button type="submit" className="text-primary hover:underline">
              send an email stub
            </button>
            .
          </form>
        ) : null}
      </div>
    </div>
  );
}
