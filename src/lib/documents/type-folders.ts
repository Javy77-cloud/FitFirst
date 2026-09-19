import { DOC_TYPE_LABELS, type DocType } from "@/lib/domain";
import { docTypeLabel, inferDocTypeFromName, type LibraryFolder } from "@/lib/documents/library";

export const DOCUMENT_TYPE_FOLDER_KEYS = [
  "acord",
  "cancellation",
  "aor",
  "agency_form",
  "flyer",
  "appetite_guide",
  "marketing",
  "other",
] as const;

export type DocumentTypeFolderKey = (typeof DOCUMENT_TYPE_FOLDER_KEYS)[number];

const TYPE_NAME_ALIASES: Record<string, DocumentTypeFolderKey> = {
  acord: "acord",
  "acord form": "acord",
  "acord forms": "acord",
  cancellation: "cancellation",
  cancel: "cancellation",
  aor: "aor",
  "agent of record": "aor",
  "agency forms": "agency_form",
  "agency form": "agency_form",
  flyer: "flyer",
  flyers: "flyer",
  "carrier flyers": "flyer",
  "carrier forms": "agency_form",
  appetite: "appetite_guide",
  "appetite guides": "appetite_guide",
  "appetite guide": "appetite_guide",
  marketing: "marketing",
};

export type TypeCarrierFolder = LibraryFolder & {
  typeKey: DocumentTypeFolderKey;
  carrierName: string | null;
};

export type TypeCarrierGroup = {
  typeKey: DocumentTypeFolderKey;
  label: string;
  folder: LibraryFolder | null;
  carriers: TypeCarrierFolder[];
  looseFiles: number;
};

export function normalizeFolderName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function typeKeyFromFolderName(name: string): DocumentTypeFolderKey | null {
  const key = normalizeFolderName(name);
  if (TYPE_NAME_ALIASES[key]) return TYPE_NAME_ALIASES[key];
  if (key.includes("acord")) return "acord";
  if (key.includes("cancel")) return "cancellation";
  if (key.includes("aor") || key.includes("agent of record")) return "aor";
  if (key.includes("appetite")) return "appetite_guide";
  if (key.includes("flyer")) return "flyer";
  if (key.includes("marketing")) return "marketing";
  if (key.includes("agency form") || key.includes("carrier form")) return "agency_form";
  return null;
}

export function typeFolderLabel(typeKey: DocumentTypeFolderKey): string {
  return DOC_TYPE_LABELS[typeKey as DocType] ?? typeKey.replaceAll("_", " ");
}

/** Nested folders under a type folder are carriers. Root folders that are not types stay loose. */
export function groupFoldersByTypeAndCarrier(folders: LibraryFolder[]): TypeCarrierGroup[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const typeFolders = new Map<DocumentTypeFolderKey, LibraryFolder>();
  const carriersByType = new Map<DocumentTypeFolderKey, TypeCarrierFolder[]>();

  for (const folder of folders) {
    const ownType = typeKeyFromFolderName(folder.name);
    if (ownType && !folder.parentId) {
      typeFolders.set(ownType, folder);
    }
  }

  for (const folder of folders) {
    if (!folder.parentId) continue;
    const parent = byId.get(folder.parentId);
    const parentType = parent ? typeKeyFromFolderName(parent.name) : null;
    const ownType = typeKeyFromFolderName(folder.name);
    if (ownType) {
      typeFolders.set(ownType, folder);
      continue;
    }
    const typeKey = parentType;
    if (!typeKey) continue;
    const list = carriersByType.get(typeKey) ?? [];
    list.push({
      ...folder,
      typeKey,
      carrierName: folder.name,
    });
    carriersByType.set(typeKey, list);
  }

  const keys = new Set<DocumentTypeFolderKey>([
    ...typeFolders.keys(),
    ...carriersByType.keys(),
  ]);

  return [...keys]
    .map((typeKey) => ({
      typeKey,
      label: typeFolderLabel(typeKey),
      folder: typeFolders.get(typeKey) ?? null,
      carriers: (carriersByType.get(typeKey) ?? []).filter((row) => row.carrierName),
      looseFiles: 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function fileTypeLabel(docType: string, filename: string, library: "forms" | "shared"): string {
  return docTypeLabel(docType || inferDocTypeFromName(filename, library));
}
