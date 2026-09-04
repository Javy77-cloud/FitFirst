import { confirmMfaEnroll, startEmailEnroll, startSmsEnroll, startTotpEnroll } from "@/app/actions/mfa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MFA_METHOD_LABEL, type MfaMethod } from "@/lib/auth/mfa";
import { otpauthUri } from "@/lib/auth/totp";

export function MfaEnrollPanel({
  next,
  method,
  email,
  phone,
  totpSecret,
  stubCode,
  stubDestination,
  error,
}: {
  next: string;
  method: MfaMethod | null;
  email: string;
  phone: string | null;
  totpSecret: string | null;
  stubCode: string | null;
  stubDestination: string | null;
  error?: string | null;
}) {
  return (
    <div className="space-y-4">
      {error === "code" ? (
        <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">That code did not match.</p>
      ) : error === "phone" ? (
        <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">Enter a mobile number for the SMS stub.</p>
      ) : error === "email" ? (
        <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">Enter an email for the email stub.</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <form action={startSmsEnroll} className="ff-card space-y-2 p-4">
          <input type="hidden" name="next" value={next} />
          <h3 className="text-sm font-semibold text-navy">{MFA_METHOD_LABEL.sms}</h3>
          <p className="text-xs text-muted-foreground">Desk shows the code. Nothing texts a carrier.</p>
          <Label className="text-xs">Mobile</Label>
          <Input name="phone" defaultValue={phone ?? ""} placeholder="(321) 555-0100" className="h-8" />
          <Button type="submit" size="sm" variant={method === "sms" ? "default" : "outline"}>
            Send SMS stub
          </Button>
        </form>
        <form action={startEmailEnroll} className="ff-card space-y-2 p-4">
          <input type="hidden" name="next" value={next} />
          <h3 className="text-sm font-semibold text-navy">{MFA_METHOD_LABEL.email}</h3>
          <p className="text-xs text-muted-foreground">Desk shows the code. Nothing hits SendGrid.</p>
          <Label className="text-xs">Email</Label>
          <Input name="mfaEmail" type="email" defaultValue={email} className="h-8" />
          <Button type="submit" size="sm" variant={method === "email" ? "default" : "outline"}>
            Send email stub
          </Button>
        </form>
        <form action={startTotpEnroll} className="ff-card space-y-2 p-4">
          <input type="hidden" name="next" value={next} />
          <h3 className="text-sm font-semibold text-navy">{MFA_METHOD_LABEL.totp}</h3>
          <p className="text-xs text-muted-foreground">Add the secret in Authy / Google Authenticator.</p>
          <Button type="submit" size="sm" variant={method === "totp" ? "default" : "outline"}>
            Generate authenticator secret
          </Button>
        </form>
      </div>

      {method === "totp" && totpSecret ? (
        <div className="ff-card space-y-2 p-4">
          <h3 className="text-sm font-semibold text-navy">Add this authenticator</h3>
          <p className="break-all font-mono text-sm text-navy">{totpSecret}</p>
          <p className="break-all text-[11px] text-muted-foreground">{otpauthUri(totpSecret, email)}</p>
        </div>
      ) : null}

      {stubCode && (method === "sms" || method === "email") ? (
        <div className="ff-card space-y-1 p-4">
          <h3 className="text-sm font-semibold text-navy">Stub code (not delivered)</h3>
          <p className="text-2xl font-semibold tracking-widest text-navy">{stubCode}</p>
          <p className="text-xs text-muted-foreground">Would have gone to {stubDestination}.</p>
        </div>
      ) : null}

      {method ? (
        <form action={confirmMfaEnroll} className="ff-card space-y-3 p-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <h3 className="text-sm font-semibold text-navy">Confirm {MFA_METHOD_LABEL[method]}</h3>
            <p className="text-xs text-muted-foreground">Enter the 6-digit code to finish enrollment.</p>
          </div>
          <div>
            <Label className="text-xs">Code</Label>
            <Input name="code" inputMode="numeric" autoComplete="one-time-code" required className="mt-1 h-8 max-w-40" />
          </div>
          <Button type="submit">Enroll 2FA</Button>
        </form>
      ) : null}
    </div>
  );
}
