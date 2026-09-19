import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { documentFolders, documents, formTemplates } from "./schema";
import {
  DOC_ACORD_80_ID,
  DOC_AOR_ID,
  DOC_APPETITE_ID,
  DOC_CANCEL_ID,
  DOC_LOSS_RUN_ID,
  DOC_FLYER_ID,
  DOC_HURRICANE_ID,
  FOLDER_ACORD_CITIZENS_ID,
  FOLDER_ACORD_ID,
  FOLDER_ACORD_TAILROW_ID,
  FOLDER_AGENCY_FORMS_ID,
  FOLDER_AOR_ID,
  FOLDER_APPETITE_ID,
  FOLDER_CANCEL_ID,
  FOLDER_CARRIER_FORMS_CITIZENS_ID,
  FOLDER_CARRIER_FORMS_ID,
  FOLDER_FLYERS_ID,
  FOLDER_FLYERS_TAILROW_ID,
  FOLDER_LOSS_RUN_ID,
  FOLDER_MARKETING_ID,
  FOLDER_MISC_ID,
  FORM_AOR_ID,
  FORM_CANCEL_ID,
  FORM_HO3_ID,
  FORM_LOSS_RUN_ID,
  TENANT_ID,
} from "../fixtures/ids";

type FolderSeed = {
  id: string;
  name: string;
  library: "shared" | "forms";
  kind: string;
  parentId: string | null;
  description: string;
  sortOrder: number;
};

const FOLDERS: FolderSeed[] = [
  {
    id: FOLDER_MARKETING_ID,
    name: "Marketing",
    library: "shared",
    kind: "shared_library",
    parentId: null,
    description: "Anyone can drop flyers and campaign one-pagers here.",
    sortOrder: 10,
  },
  {
    id: FOLDER_APPETITE_ID,
    name: "Appetite guides",
    library: "shared",
    kind: "shared_library",
    parentId: null,
    description: "Carrier appetite one-pagers for the desk.",
    sortOrder: 20,
  },
  {
    id: FOLDER_MISC_ID,
    name: "Quick access",
    library: "shared",
    kind: "shared_library",
    parentId: null,
    description: "Misc files the whole desk reaches for.",
    sortOrder: 30,
  },
  {
    id: FOLDER_FLYERS_ID,
    name: "Carrier flyers",
    library: "shared",
    kind: "custom",
    parentId: FOLDER_MISC_ID,
    description: "Type folder. Nest carriers inside.",
    sortOrder: 10,
  },
  {
    id: FOLDER_FLYERS_TAILROW_ID,
    name: "Tailrow",
    library: "shared",
    kind: "custom",
    parentId: FOLDER_FLYERS_ID,
    description: "Carrier nested under flyers.",
    sortOrder: 10,
  },
  {
    id: FOLDER_ACORD_ID,
    name: "ACORD",
    library: "forms",
    kind: "forms_library",
    parentId: null,
    description: "Type folder. Nest the carrier inside. Not a licensed ACORD product.",
    sortOrder: 10,
  },
  {
    id: FOLDER_ACORD_CITIZENS_ID,
    name: "Citizens",
    library: "forms",
    kind: "custom",
    parentId: FOLDER_ACORD_ID,
    description: "Citizens nested under ACORD.",
    sortOrder: 10,
  },
  {
    id: FOLDER_ACORD_TAILROW_ID,
    name: "Tailrow",
    library: "forms",
    kind: "custom",
    parentId: FOLDER_ACORD_ID,
    description: "Tailrow nested under ACORD.",
    sortOrder: 20,
  },
  {
    id: FOLDER_AGENCY_FORMS_ID,
    name: "Agency forms",
    library: "forms",
    kind: "forms_library",
    parentId: null,
    description: "Type folder for agency paperwork.",
    sortOrder: 20,
  },
  {
    id: FOLDER_CANCEL_ID,
    name: "Cancellation",
    library: "forms",
    kind: "forms_library",
    parentId: null,
    description: "Type folder for cancellation requests. Nest a carrier if needed.",
    sortOrder: 30,
  },
  {
    id: FOLDER_AOR_ID,
    name: "AOR",
    library: "forms",
    kind: "forms_library",
    parentId: null,
    description: "Type folder for agent of record letters.",
    sortOrder: 40,
  },
  {
    id: FOLDER_LOSS_RUN_ID,
    name: "No Run Loss",
    library: "forms",
    kind: "forms_library",
    parentId: null,
    description: "Type folder for loss-run requests.",
    sortOrder: 45,
  },
  {
    id: FOLDER_CARRIER_FORMS_ID,
    name: "Carrier forms",
    library: "forms",
    kind: "forms_library",
    parentId: null,
    description: "Type folder. Carrier nested inside.",
    sortOrder: 50,
  },
  {
    id: FOLDER_CARRIER_FORMS_CITIZENS_ID,
    name: "Citizens",
    library: "forms",
    kind: "custom",
    parentId: FOLDER_CARRIER_FORMS_ID,
    description: "Citizens nested under carrier forms.",
    sortOrder: 10,
  },
];

type FileSeed = {
  id: string;
  folderId: string;
  library: "shared" | "forms";
  filename: string;
  docType: string;
  fillable: boolean;
  formTemplateId?: string;
  body: string;
};

const FILES: FileSeed[] = [
  {
    id: DOC_HURRICANE_ID,
    folderId: FOLDER_MARKETING_ID,
    library: "shared",
    filename: "Hurricane-season-checklist.pdf",
    docType: "marketing",
    fillable: false,
    body: "FitFirst hurricane season checklist. Demo marketing file. No InsuredMine copy.",
  },
  {
    id: DOC_APPETITE_ID,
    folderId: FOLDER_APPETITE_ID,
    library: "shared",
    filename: "Citizens-HO3-appetite.txt",
    docType: "appetite_guide",
    fillable: false,
    body: "Citizens HO3 appetite (demo). Coastal masonry preferred. Not a live carrier feed.",
  },
  {
    id: DOC_FLYER_ID,
    folderId: FOLDER_FLYERS_TAILROW_ID,
    library: "shared",
    filename: "Tailrow-homeowners-flyer.pdf",
    docType: "flyer",
    fillable: false,
    body: "Tailrow homeowners flyer (demo). Shared library quick-access file.",
  },
  {
    id: DOC_ACORD_80_ID,
    folderId: FOLDER_ACORD_CITIZENS_ID,
    library: "forms",
    filename: "FL-HO3-ACORD-style.pdf",
    docType: "acord",
    fillable: true,
    formTemplateId: FORM_HO3_ID,
    body: "Florida HO3 application style label. Folded from the Forms catalog. Not licensed ACORD.",
  },
  {
    id: DOC_CANCEL_ID,
    folderId: FOLDER_CANCEL_ID,
    library: "forms",
    filename: "Cancellation-request.pdf",
    docType: "cancellation",
    fillable: true,
    formTemplateId: FORM_CANCEL_ID,
    body: "Agency cancellation request. Fillable stub.",
  },
  {
    id: DOC_AOR_ID,
    folderId: FOLDER_AOR_ID,
    library: "forms",
    filename: "Agent-of-record.pdf",
    docType: "aor",
    fillable: true,
    formTemplateId: FORM_AOR_ID,
    body: "Agent of record letter. Fillable stub.",
  },
  {
    id: DOC_LOSS_RUN_ID,
    folderId: FOLDER_LOSS_RUN_ID,
    library: "forms",
    filename: "Loss-run-request.pdf",
    docType: "loss_run",
    fillable: true,
    formTemplateId: FORM_LOSS_RUN_ID,
    body: "No Run Loss request. Fillable form for the Documents send loop.",
  },
];

/** Shared + Forms libraries. Does not touch Ana folders or the Ana fixture. */
export async function seedDocumentLibraries() {
  for (const folder of FOLDERS) {
    await db
      .insert(documentFolders)
      .values({
        id: folder.id,
        tenantId: TENANT_ID,
        name: folder.name,
        kind: folder.kind,
        library: folder.library,
        parentId: folder.parentId,
        description: folder.description,
        sortOrder: folder.sortOrder,
      })
      .onConflictDoUpdate({
        target: documentFolders.id,
        set: {
          name: folder.name,
          kind: folder.kind,
          library: folder.library,
          parentId: folder.parentId,
          description: folder.description,
          sortOrder: folder.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  const folderBySlug: Record<string, string> = {
    "fl-ho3": FOLDER_ACORD_CITIZENS_ID,
    "fl-home-packet": FOLDER_ACORD_CITIZENS_ID,
    "agency-cancellation": FOLDER_CANCEL_ID,
    "agency-aor": FOLDER_AOR_ID,
    "agency-loss-run": FOLDER_LOSS_RUN_ID,
  };

  for (const [slug, folderId] of Object.entries(folderBySlug)) {
    await db
      .update(formTemplates)
      .set({ folderId, fillable: true, updatedAt: new Date() })
      .where(eq(formTemplates.slug, slug));
  }

  const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  for (const file of FILES) {
    const storagePath = path.join(TENANT_ID, "library", file.library, `${file.id}-${file.filename}`);
    const abs = path.join(uploadRoot, storagePath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, file.body, "utf8");
    await db
      .insert(documents)
      .values({
        id: file.id,
        tenantId: TENANT_ID,
        filename: file.filename,
        mimeType: file.filename.endsWith(".txt") ? "text/plain" : "application/pdf",
        storagePath,
        docType: file.docType,
        slot: "library_file",
        status: "uploaded",
        tags: file.fillable ? ["fillable"] : [],
        folderId: file.folderId,
        library: file.library,
        fillable: file.fillable,
        formTemplateId: file.formTemplateId ?? null,
      })
      .onConflictDoUpdate({
        target: documents.id,
        set: {
          filename: file.filename,
          docType: file.docType,
          folderId: file.folderId,
          library: file.library,
          fillable: file.fillable,
          formTemplateId: file.formTemplateId ?? null,
          slot: "library_file",
          tags: file.fillable ? ["fillable"] : [],
          storagePath,
        },
      });
  }
}

