import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { looksLikePdf } from "@/lib/files/urls";

const execFileAsync = promisify(execFile);

export const MAX_PDF_OCR_PAGES = 12;
const RASTER_DPI = 150;

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

async function withTempPdf<T>(buffer: Buffer, fn: (pdfPath: string, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "ff-pdf-"));
  const pdfPath = path.join(dir, "input.pdf");
  try {
    await writeFile(pdfPath, buffer);
    return await fn(pdfPath, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Poppler rasterize — preferred when `pdftoppm` is on PATH (Mac mini / brew poppler). */
export async function rasterizeWithPdftoppm(
  buffer: Buffer,
  maxPages = MAX_PDF_OCR_PAGES,
): Promise<Buffer[]> {
  if (!(await commandExists("pdftoppm"))) return [];
  return withTempPdf(buffer, async (pdfPath, dir) => {
    const prefix = path.join(dir, "page");
    await execFileAsync("pdftoppm", ["-png", "-r", String(RASTER_DPI), "-f", "1", "-l", String(maxPages), pdfPath, prefix], {
      timeout: 60_000,
      maxBuffer: 20_000_000,
    });
    const names = (await readdir(dir))
      .filter((name) => name.startsWith("page") && name.endsWith(".png"))
      .sort();
    const pages: Buffer[] = [];
    for (const name of names.slice(0, maxPages)) {
      pages.push(await readFile(path.join(dir, name)));
    }
    return pages;
  });
}

type PdfjsModule = {
  getDocument: (opts: Record<string, unknown>) => { promise: Promise<PdfjsDocument> };
  GlobalWorkerOptions?: { workerSrc: string };
};

type PdfjsDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfjsPage>;
  destroy: () => Promise<void>;
};

type PdfjsPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: Record<string, unknown>) => { promise: Promise<void> };
  getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
};

function pdfWorkerSrc(): string {
  return pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).href;
}

async function loadPdfjs(): Promise<PdfjsModule> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsModule;
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc();
  }
  return pdfjs;
}

function nodeCanvasFactory(createCanvas: (w: number, h: number) => {
  width: number;
  height: number;
  getContext: (id: string) => unknown;
  toBuffer: (type: string) => Buffer;
}) {
  return {
    create(width: number, height: number) {
      const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
      return { canvas, context: canvas.getContext("2d") };
    },
    reset(
      canvasAndContext: { canvas: { width: number; height: number } },
      width: number,
      height: number,
    ) {
      canvasAndContext.canvas.width = Math.ceil(width);
      canvasAndContext.canvas.height = Math.ceil(height);
    },
    destroy(canvasAndContext: { canvas: { width: number; height: number } }) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    },
  };
}

/** In-process rasterize via pdfjs + @napi-rs/canvas when poppler is not installed. */
export async function rasterizeWithPdfjs(
  buffer: Buffer,
  maxPages = MAX_PDF_OCR_PAGES,
): Promise<Buffer[]> {
  const pdfjs = await loadPdfjs();
  const { createCanvas } = await import("@napi-rs/canvas");
  const data = new Uint8Array(buffer);
  const canvasFactory = nodeCanvasFactory(createCanvas);
  const doc = await pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
    canvasFactory,
  }).promise;
  const pages: Buffer[] = [];
  try {
    const n = Math.min(doc.numPages, maxPages);
    const scale = RASTER_DPI / 72;
    for (let i = 1; i <= n; i += 1) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
      await page.render({
        canvasContext: canvasAndContext.context,
        viewport,
        canvasFactory,
      }).promise;
      const png = Buffer.from(canvasAndContext.canvas.toBuffer("image/png"));
      canvasFactory.destroy(canvasAndContext);
      if (png.length > 0 && !looksLikePdf(png)) pages.push(png);
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}

export async function rasterizePdfPages(
  buffer: Buffer,
  maxPages = MAX_PDF_OCR_PAGES,
): Promise<Buffer[]> {
  if (!looksLikePdf(buffer)) return [];
  try {
    const poppler = await rasterizeWithPdftoppm(buffer, maxPages);
    if (poppler.length > 0) return poppler;
  } catch {
    // fall through to pdfjs
  }
  try {
    return await rasterizeWithPdfjs(buffer, maxPages);
  } catch {
    return [];
  }
}

export function textContentToLines(content: {
  items: Array<{ str?: string; transform?: number[] }>;
}): string {
  let lastY: number | null = null;
  const lines: string[] = [];
  let current = "";
  for (const item of content.items) {
    const str = item.str ?? "";
    const y = item.transform?.[5];
    if (lastY != null && y != null && Math.abs(y - lastY) > 2.5) {
      if (current.trim()) lines.push(current.trim());
      current = str;
    } else if (str) {
      const needSpace = Boolean(current) && !current.endsWith(" ") && !str.startsWith(" ");
      current += (needSpace ? " " : "") + str;
    }
    if (y != null) lastY = y;
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join("\n");
}

export async function extractTextWithPdfjs(buffer: Buffer): Promise<string> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;
  const pages: string[] = [];
  try {
    const n = Math.min(doc.numPages, 20);
    for (let i = 1; i <= n; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(textContentToLines(content));
    }
  } finally {
    await doc.destroy();
  }
  return pages.join("\n").replace(/\r/g, "").trim();
}

export async function extractTextWithPdftotext(buffer: Buffer): Promise<string> {
  if (!(await commandExists("pdftotext"))) return "";
  return withTempPdf(buffer, async (pdfPath) => {
    const { stdout } = await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], {
      timeout: 30_000,
      maxBuffer: 10_000_000,
    });
    return String(stdout ?? "").replace(/\r/g, "").trim();
  });
}
