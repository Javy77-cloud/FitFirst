"use client";

import { assignOwner } from "@/app/actions/owners";
import type { OwnerEntityType } from "@/lib/domain";

type UserOption = { id: string; name: string };

export function OwnerSelect({
  entityType,
  entityId,
  ownerId,
  users,
  canAssign,
}: {
  entityType: OwnerEntityType;
  entityId: string;
  ownerId: string | null;
  users: UserOption[];
  canAssign: boolean;
}) {
  const label = users.find((u) => u.id === ownerId)?.name ?? "Unassigned";
  if (!canAssign) {
    return <span className="text-xs text-muted-foreground">{label}</span>;
  }
  return (
    <form action={assignOwner}>
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <select
        name="ownerId"
        defaultValue={ownerId ?? ""}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-7 rounded-md border border-input bg-card px-1.5 text-xs"
      >
        <option value="">Unassigned</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </form>
  );
}
