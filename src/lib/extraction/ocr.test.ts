import { describe, expect, it } from "vitest";
import { extractFromImage, isImageUpload } from "./ocr";

describe("image OCR stub", () => {
  it("returns not_implemented and never invents fields", () => {
    const result = extractFromImage(Buffer.from("fake"), "wind-mit-photo.jpg");
    expect(result.status).toBe("not_implemented");
    expect(result.fields).toEqual([]);
    expect(result.message).toMatch(/not implemented/i);
  });

  it("classifies photos as image uploads", () => {
    expect(isImageUpload("image/jpeg", "house.jpg")).toBe(true);
    expect(isImageUpload("application/pdf", "dec.pdf")).toBe(false);
    expect(isImageUpload("application/octet-stream", "scan.png")).toBe(true);
  });
});
