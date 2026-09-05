import {
  SUSPENSE_DOC_KEYS,
  type ServicingDocKey,
  type SuspenseDocKey,
} from "@/lib/domain-ams";
import { hasServicingDoc, type ServicingFile } from "./checklist";
import { openPacketTask, type PacketTask } from "./packet-tasks";

export function isSuspenseDocKey(value: string): value is SuspenseDocKey {
  return (SUSPENSE_DOC_KEYS as readonly string[]).includes(value);
}

export function suspenseKeysFromFiles(files: ServicingFile[]): SuspenseDocKey[] {
  return SUSPENSE_DOC_KEYS.filter((key) => !hasServicingDoc(files, key));
}

export function pendingSuspenseKeys(
  files: ServicingFile[],
  tasks: PacketTask[],
): SuspenseDocKey[] {
  return suspenseKeysFromFiles(files).filter((key) => openPacketTask(tasks, key) == null);
}

export function suspenseTitle(key: ServicingDocKey, policyNumber: string): string {
  if (key === "id_card") return `Suspense · ID cards missing · ${policyNumber}`;
  if (key === "aor") return `Suspense · AOR packet missing · ${policyNumber}`;
  return `Suspense · ${key.replaceAll("_", " ")} · ${policyNumber}`;
}
