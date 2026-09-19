"use client";

import { PolicyInlineSelect } from "@/components/policy/policy-inline-fields";
import { useAgencyLobs } from "@/components/desk/agency-lob-context";
import { uniqueLobCodes } from "@/lib/desk/agency-lobs";

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
  return (
    <PolicyInlineSelect
      policyId={policyId}
      fieldKey="lineOfBusiness"
      label="Line of business"
      value={value}
      options={options}
      readOnly={readOnly}
    />
  );
}
