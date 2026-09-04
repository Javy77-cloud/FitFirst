import { pingClickToCall } from "@/app/actions/click-to-call";
import { Button } from "@/components/ui/button";

export function ClickToCall({
  entityType,
  entityId,
  name,
  phone,
}: {
  entityType: string;
  entityId: string;
  name: string;
  phone?: string | null;
}) {
  if (!phone) return null;
  return (
    <form action={pingClickToCall} className="inline">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="phone" value={phone} />
      <Button type="submit" size="xs" variant="outline">
        Click-to-call {phone}
      </Button>
    </form>
  );
}
