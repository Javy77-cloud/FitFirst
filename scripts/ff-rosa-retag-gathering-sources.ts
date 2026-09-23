/**
 * Retag Rosa Castellanos gathering-deal source docs so Fill Risk Profile sends them to Gemini.
 *
 * Wind mit 1f82de0d-fa2d-4d8c-a98a-a73365422bcb → wind_mit
 * ADT alarm bd221a27-746d-41d7-aad0-09d49522b4b1 → alarm_certificate
 * Deal 260de6f1-d91b-4e9f-ae0e-61e38de04b52 (gathering). Not the closed-won 5d4a4c04… shop.
 *
 * Idempotent: a row already on the target type is left alone. A row that is no longer
 * `other` is not overwritten. A filename that does not look like that packet is skipped.
 *
 * Usage: npx tsx --env-file=.env scripts/ff-rosa-retag-gathering-sources.ts
 *
 * Equivalent SQL:
 *
 * UPDATE documents
 * SET doc_type = 'wind_mit', slot = 'source_doc'
 * WHERE id = '1f82de0d-fa2d-4d8c-a98a-a73365422bcb'
 *   AND deal_id = '260de6f1-d91b-4e9f-ae0e-61e38de04b52'
 *   AND doc_type = 'other'
 *   AND filename ILIKE '%wind%';
 *
 * UPDATE documents
 * SET doc_type = 'alarm_certificate', slot = 'source_doc'
 * WHERE id = 'bd221a27-746d-41d7-aad0-09d49522b4b1'
 *   AND deal_id = '260de6f1-d91b-4e9f-ae0e-61e38de04b52'
 *   AND doc_type = 'other'
 *   AND (filename ILIKE '%alarm%' OR filename ILIKE '%adt%' OR filename ILIKE '%certificate%');
 */
import { ensureRosaGatheringSourceRetag } from "@/app/actions/rosa-gathering-retag";

async function main() {
  const result = await ensureRosaGatheringSourceRetag();
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
