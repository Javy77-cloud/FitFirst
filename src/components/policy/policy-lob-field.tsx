"use client";

import { PolicyInlineSelect } from "@/components/policy/policy-inline-fields";
import { useAgencyLobs } from "@/components/desk/agency-lob-context";
import { resolveAgencyLobCode, uniqueLobCodes } from "@/lib/desk/agency-lobs";

export function PolicyLobField({
  policyId,
  value,
  readOnly = false,
}: {
  policyId: string;
  value: string;
  readOnly?: boolean;
}) {
  const catalog = useAgencyLobs();
  const options = uniqueLobCodes(catalog).map((code) => {
    const row = catalog.find((item) => item.lobCode.trim().toUpperCase() === code);
    return { value: code, label: row ? `${row.label} (${code})` : code };
  });
  const current = value.trim();
  const resolved = resolveAgencyLobCode(current, catalog);
  if (current && !resolved && !options.some((option) => option.value === current.toUpperCase())) {
    options.unshift({ value: current, label: `${current} (not on list)` });
  }
  return (
    <PolicyInlineSelect
      policyId={policyId}
      fieldKey="lineOfBusiness"
      label="Line of business"
      value={resolved ?? current}
      options={options}
      readOnly={readOnly}
    />
  );
}
