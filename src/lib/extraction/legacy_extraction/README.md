# Legacy extraction (archived)

Synonym dictionary, checkbox maps, and per-form field maps used by the pre-Gemini
text extract path.

**Not used by Fill from source.** Fill for wind_mit / four_point / dec now calls
`src/lib/extraction/gemini/`.

Kept for historical unit tests and audit of the archived path. Do not wire these
modules back into `runFillQuoteSheet` or document Fill.

Files here may still be imported by tests and by the thin re-export in
`../extract.ts` (`extractFieldsFromText`) for OCR/test helpers only.
