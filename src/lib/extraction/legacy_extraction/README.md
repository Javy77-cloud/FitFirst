# Legacy extraction (archived)

Synonym dictionary, checkbox maps, and per-form field maps used by the pre-Gemini
text extract path.

**Not used by Fill from source.** Fill for wind_mit / four_point / dec now calls
`src/lib/extraction/gemini/` only.

Kept for historical unit tests and OCR helpers that intentionally exercise the
archived path. Do not wire these modules back into `runFillQuoteSheet` or document
Fill. Thin re-export stubs that once lived at `../synonyms.ts` etc. were moved to
`_archive/legacy_extraction_20260908/` so live paths cannot accidentally import them.
