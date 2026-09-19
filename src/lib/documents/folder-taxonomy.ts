import {
  DOC_TYPE_LABELS,
  FORMS_LIBRARY_DOC_TYPES,
  SHARED_LIBRARY_DOC_TYPES,
  type DocumentLibrary,
  type DocType,
} from "@/lib/domain";

export type TypeFolderOption = {
  docType: DocType;
  label: string;
};

export function typeFolderOptions(library: DocumentLibrary): TypeFolderOption[] {
  const types = library === "forms" ? FORMS_LIBRARY_DOC_TYPES : SHARED_LIBRARY_DOC_TYPES;
  return types.map((docType) => ({
    docType,
    label: DOC_TYPE_LABELS[docType],
  }));
}

/** Root folders are document types. Nested folders are carriers. */
export function folderRole(parentId: string | null | undefined): "type" | "carrier" {
  return parentId ? "carrier" : "type";
}

export function typeFolderName(docType: string): string {
  return DOC_TYPE_LABELS[docType as DocType] ?? docType.replaceAll("_", " ");
}
