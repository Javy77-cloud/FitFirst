import {
  SERVICING_DOC_LABELS,
  servicingDocKeyFromTaskKind,
  servicingTaskKind,
  type ServicingDocKey,
} from "@/lib/domain-ams";

export type PacketTask = {
  id: string;
  kind: string;
  title: string;
  status: string;
};

export function packetTaskTitle(key: ServicingDocKey, policyNumber: string): string {
  return `Collect ${SERVICING_DOC_LABELS[key]} · ${policyNumber}`;
}

export function openPacketTask(
  tasks: PacketTask[],
  key: ServicingDocKey,
): PacketTask | null {
  const want = servicingTaskKind(key);
  return (
    tasks.find((task) => task.kind === want && task.status === "open") ?? null
  );
}

export function packetTasksByKey(tasks: PacketTask[]): Partial<Record<ServicingDocKey, PacketTask>> {
  const map: Partial<Record<ServicingDocKey, PacketTask>> = {};
  for (const task of tasks) {
    if (task.status !== "open") continue;
    const key = servicingDocKeyFromTaskKind(task.kind);
    if (key && !map[key]) map[key] = task;
  }
  return map;
}

export function canCreatePacketTask(
  missing: ServicingDocKey[],
  tasks: PacketTask[],
  key: ServicingDocKey,
): boolean {
  if (!missing.includes(key)) return false;
  return openPacketTask(tasks, key) == null;
}
