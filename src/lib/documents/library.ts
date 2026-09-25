import {
  DOCUMENT_LIBRARIES,
  DOCUMENT_LIBRARY_LABELS,
  DOC_TYPE_LABELS,
  FORMS_LIBRARY_DOC_TYPES,
  SHARED_LIBRARY_DOC_TYPES,
  type DocumentLibrary,
  type DocType,
} from "@/lib/domain";

export type LibraryFolder = {
  id: string;
  name: string;
  parentId: string | null;
  library?: string | null;
  kind?: string | null;
};

export type FolderTreeNode = LibraryFolder & { children: FolderTreeNode[] };

export function isDocumentLibrary(value: string): value is DocumentLibrary {
  return (DOCUMENT_LIBRARIES as readonly string[]).includes(value);
}

export function parseLibrary(value: string | null | undefined): DocumentLibrary {
  if (value === "shared" || value === "library") return "shared";
  if (value === "forms") return "forms";
  return "forms";
}

export function libraryLabel(library: string): string {
  return DOCUMENT_LIBRARY_LABELS[parseLibrary(library)];
}

export function libraryKind(library: DocumentLibrary): "shared_library" | "forms_library" {
  return library === "forms" ? "forms_library" : "shared_library";
}

export function libraryHref(input: {
  library?: string | null;
  folderId?: string | null;
  notice?: string | null;
  dealId?: string | null;
}): string {
  const q = new URLSearchParams();
  q.set("library", parseLibrary(input.library));
  if (input.folderId) q.set("folder", input.folderId);
  if (input.dealId) q.set("deal", input.dealId);
  if (input.notice) q.set("notice", input.notice);
  return `/documents?${q.toString()}`;
}

export function fillHref(slug: string, extra?: { folderId?: string | null; library?: string }) {
  const q = new URLSearchParams();
  if (extra?.library) q.set("library", extra.library);
  if (extra?.folderId) q.set("folder", extra.folderId);
  const qs = q.toString();
  return qs ? `/documents/fill/${slug}?${qs}` : `/documents/fill/${slug}`;
}

export function libraryDocTypes(library: DocumentLibrary): readonly DocType[] {
  return library === "forms" ? FORMS_LIBRARY_DOC_TYPES : SHARED_LIBRARY_DOC_TYPES;
}

export function docTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType as DocType] ?? docType.replaceAll("_", " ");
}

export function inferDocTypeFromName(filename: string, library: DocumentLibrary): DocType {
  const name = filename.toLowerCase();
  if (name.includes("aor") || name.includes("agent of record")) return "aor";
  if (name.includes("cancel")) return "cancellation";
  if (name.includes("acord")) return "acord";
  if (name.includes("appetite")) return "appetite_guide";
  if (name.includes("flyer")) return "flyer";
  if (name.includes("market")) return "marketing";
  return library === "forms" ? "agency_form" : "other";
}

export function buildFolderTree(folders: LibraryFolder[]): FolderTreeNode[] {
  const byParent = new Map<string | null, LibraryFolder[]>();
  for (const folder of folders) {
    const key = folder.parentId;
    const list = byParent.get(key) ?? [];
    list.push(folder);
    byParent.set(key, list);
  }
  const walk = (parentId: string | null): FolderTreeNode[] =>
    (byParent.get(parentId) ?? []).map((folder) => ({
      ...folder,
      children: walk(folder.id),
    }));
  return walk(null);
}

export function descendantIds(folders: LibraryFolder[], folderId: string): Set<string> {
  const kids = new Map<string | null, string[]>();
  for (const folder of folders) {
    const list = kids.get(folder.parentId) ?? [];
    list.push(folder.id);
    kids.set(folder.parentId, list);
  }
  const out = new Set<string>();
  const stack = [...(kids.get(folderId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(kids.get(id) ?? []));
  }
  return out;
}

export function canMoveFolder(
  folders: LibraryFolder[],
  folderId: string,
  newParentId: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (newParentId === folderId) {
    return { ok: false, reason: "A folder cannot be moved into itself." };
  }
  if (newParentId && descendantIds(folders, folderId).has(newParentId)) {
    return { ok: false, reason: "A folder cannot be moved into one of its subfolders." };
  }
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return { ok: false, reason: "Folder not found." };
  if (newParentId) {
    const parent = folders.find((f) => f.id === newParentId);
    if (!parent) return { ok: false, reason: "Destination folder not found." };
    if (folder.library && parent.library && folder.library !== parent.library) {
      return { ok: false, reason: "Keep Forms and Library separate." };
    }
  }
  return { ok: true };
}

export function foldersInLibrary(folders: LibraryFolder[], library: DocumentLibrary): LibraryFolder[] {
  return folders.filter((folder) => parseLibrary(folder.library) === library);
}

export function rootFolders(folders: LibraryFolder[], library: DocumentLibrary): LibraryFolder[] {
  return foldersInLibrary(folders, library).filter((folder) => !folder.parentId);
}
