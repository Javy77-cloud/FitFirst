# Archived legacy extraction stubs (2026-09-08)

These were thin re-exports at the old live paths:

- `src/lib/extraction/synonyms.ts`
- `src/lib/extraction/checkbox-maps.ts`
- `src/lib/extraction/field-maps.ts`
- `src/lib/extraction/labels.ts`

They only re-exported `src/lib/extraction/legacy_extraction/*` and risked accidental
imports from Fill. **Not imported by Fill from source.** Real archived modules live in
`src/lib/extraction/legacy_extraction/`.

Do not restore these stubs onto the live extraction paths. Fill for wind_mit / four_point /
dec uses `src/lib/extraction/gemini/` only.
