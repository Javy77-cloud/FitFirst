-- Javy 2026-09-23: Southern Oak + Olympus do not write flood.
-- Strip mistaken FLOOD tags so Flood Markets / appetite stop treating them as writers.
UPDATE carriers
SET
  written_lines = COALESCE((
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(written_lines) AS elem
    WHERE elem #>> '{}' <> 'FLOOD'
  ), '[]'::jsonb),
  updated_at = now()
WHERE id IN (
  '1a0bfaf1-9888-45b3-84ea-2425eff3d3c2', -- Southern Oak
  '575e1105-3a65-4aa3-83f9-31ee4e6891de'  -- Olympus
)
  OR lower(name) LIKE '%southern oak%'
  OR lower(name) LIKE '%olympus%';

UPDATE carrier_appetite
SET
  lines_offered = COALESCE((
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(lines_offered) AS elem
    WHERE elem #>> '{}' <> 'FLOOD'
  ), lines_offered),
  updated_at = now()
WHERE carrier_id = 'southern_oak';
