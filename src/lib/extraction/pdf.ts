export async function textFromUpload(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  const isText =
    mimeType.startsWith("text/") ||
    filename.toLowerCase().endsWith(".txt") ||
    filename.toLowerCase().endsWith(".md");
  if (isText) {
    return buffer.toString("utf8");
  }

  try {
    const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{
      text: string;
    }>;
    const parsed = await pdfParse(buffer);
    return parsed.text ?? "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF parse failed";
    throw new Error(`Could not read document: ${message}`);
  }
}
