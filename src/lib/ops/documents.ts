import type { DocType, FolderKind } from "@/lib/domain";
import { DOC_TYPES, FOLDER_KINDS } from "@/lib/domain";

export function isDocType(value: string): value is DocType {
  return (DOC_TYPES as readonly string[]).includes(value);
}

export function isFolderKind(value: string): value is FolderKind {
  return (FOLDER_KINDS as readonly string[]).includes(value);
}

export function fileGlyph(docType: string, mimeType?: string | null): {
  icon: "folder" | "pdf" | "image" | "form" | "flyer" | "note" | "file";
  tone: "navy" | "accent" | "green" | "yellow" | "flag" | "muted";
} {
  if (docType === "folder") return { icon: "folder", tone: "navy" };
  if (docType === "photo" || mimeType?.startsWith("image/")) return { icon: "image", tone: "green" };
  if (docType === "acord" || docType === "signed_app") return { icon: "form", tone: "accent" };
  if (docType === "flyer") return { icon: "flyer", tone: "yellow" };
  if (docType === "marketing") return { icon: "note", tone: "flag" };
  if (docType === "dec" || docType === "wind_mit" || docType === "four_point") {
    return { icon: "pdf", tone: "navy" };
  }
  if (mimeType === "application/pdf") return { icon: "pdf", tone: "navy" };
  return { icon: "file", tone: "muted" };
}

export function folderHref(input: { folderId?: string | null; scope?: string; library?: string }) {
  const q = new URLSearchParams();
  const library = input.library ?? (input.scope === "library" ? "shared" : input.scope);
  if (library === "shared" || library === "forms") q.set("library", library);
  else if (input.scope) q.set("scope", input.scope);
  if (input.folderId) q.set("folder", input.folderId);
  const qs = q.toString();
  return qs ? `/documents?${qs}` : "/documents";
}

export type FolderNode = {
  id: string;
  name: string;
  parentId: string | null;
};

export function folderBreadcrumbs(folders: FolderNode[], folderId: string | null): FolderNode[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail: FolderNode[] = [];
  let current = byId.get(folderId) ?? null;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current = current.parentId ? (byId.get(current.parentId) ?? null) : null;
  }
  return trail;
}
