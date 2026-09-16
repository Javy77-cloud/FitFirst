/** FormData file parts — Next/server runtimes do not always pass `instanceof File`. */

type FileLike = {
  name?: string;
  filename?: string;
  size?: number;
  type?: string;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  stream?: () => ReadableStream<Uint8Array> | NodeJS.ReadableStream;
};

export function isUploadedFile(item: FormDataEntryValue): item is File {
  if (typeof item === "string" || item == null) return false;
  if (typeof File !== "undefined" && item instanceof File) {
    return item.size > 0 || Boolean(item.name);
  }
  if (typeof Blob !== "undefined" && item instanceof Blob) {
    return item.size > 0 || Boolean((item as File).name);
  }
  if (typeof item !== "object") return false;
  const file = item as FileLike;
  const name = String(file.name ?? file.filename ?? "").trim();
  return typeof file.arrayBuffer === "function" && name.length > 0;
}

export function uploadedFileName(item: FormDataEntryValue): string {
  if (typeof item === "string" || item == null) return "upload";
  const file = item as FileLike;
  return String(file.name ?? file.filename ?? "upload").trim() || "upload";
}

export async function readUploadedBytes(item: FormDataEntryValue): Promise<Buffer | null> {
  if (!isUploadedFile(item)) return null;
  const file = item as FileLike;
  try {
    if (typeof file.arrayBuffer === "function") {
      const bytes = Buffer.from(await file.arrayBuffer());
      return bytes.length > 0 ? bytes : null;
    }
  } catch {
    return null;
  }
  return null;
}

export type CollectedUpload = {
  key: string;
  index: number;
  file: File;
  bytes: Buffer;
  filename: string;
};

function rowIndexFromKey(key: string): number {
  const match = /^files?_(\d+)$/.exec(key);
  if (match) return Number(match[1]);
  return 0;
}

/** Every file-like part, including `files_0` / `file` / unnamed Next.js parts. */
export async function collectUploadedFiles(form: FormData): Promise<CollectedUpload[]> {
  const out: CollectedUpload[] = [];
  for (const [key, value] of form.entries()) {
    if (!isUploadedFile(value)) continue;
    const bytes = await readUploadedBytes(value);
    if (!bytes) continue;
    out.push({
      key,
      index: rowIndexFromKey(key),
      file: value,
      bytes,
      filename: uploadedFileName(value),
    });
  }
  return out;
}
