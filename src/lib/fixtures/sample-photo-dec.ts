import { readFileSync } from "node:fs";
import path from "node:path";

/** Phone-scan fixture of a Cocoa Beach HO dec. Values are not Ana Dib. Cov A is 245000, not 321000. */
export const SAMPLE_PHOTO_DEC_FILENAME = "sample-photo-dec.png";

export const SAMPLE_PHOTO_DEC_PATH = path.join(
  process.cwd(),
  "fixtures",
  SAMPLE_PHOTO_DEC_FILENAME,
);

/** Ground-truth text printed on the fixture image. */
export const PHOTO_DEC_TEXT = `HOMEOWNERS DECLARATIONS
PHONE SCAN  in-desk OCR demo  not a Zestimate
Named insured: Luis Vega
Location: 88 Sandpiper Ln, Cocoa Beach, FL 32931
City: Cocoa Beach
County: Brevard
Year built: 2011
Roof year: 2019
Construction: masonry
Square feet: 1840
Coverage A: $245,000
Hurricane deductible: 2%
AOP deductible: $2,500
Occupancy: owner
Stories: 1
Current carrier: Citizens
Dwelling limit from the dec. Do not use Zillow list price.
`;

export function loadSamplePhotoDecPng(): Buffer {
  return readFileSync(SAMPLE_PHOTO_DEC_PATH);
}

export const SAMPLE_PHOTO_DEC_PNG = loadSamplePhotoDecPng();
