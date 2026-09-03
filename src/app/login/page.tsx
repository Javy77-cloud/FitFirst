import { loginDesk } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form action={loginDesk} className="ff-card w-full max-w-md space-y-4 p-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">FitFirst desk</div>
          <h1 className="text-xl font-semibold text-navy">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Local demo credentials. Javy is Admin (whole book). Maya is Agent (own book). No SaaS
            billing and no live Zoho.
          </p>
        </div>
        {error ? (
          <p className="rounded-md bg-fit-red-bg px-3 py-2 text-sm text-fit-red">
            Email or password did not match a desk user.
          </p>
        ) : null}
        <div>
          <Label className="text-sm">Email</Label>
          <Input name="email" type="email" required defaultValue="javy@fitfirst.local" className="mt-1" />
        </div>
        <div>
          <Label className="text-sm">Password</Label>
          <Input name="password" type="password" required className="mt-1" />
        </div>
        <Button type="submit">Sign in</Button>
        <p className="text-xs text-muted-foreground">
          Admin: javy@fitfirst.local / javy · Agent: maya@fitfirst.local / maya
        </p>
      </form>
    </div>
  );
}
