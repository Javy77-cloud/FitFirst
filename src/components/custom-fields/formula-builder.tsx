"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { evaluateFormula, formatFormulaValue } from "@/lib/custom-fields/formula";
import type { CustomFieldDef } from "@/lib/custom-fields/types";

const OPS = ["+", "-", "*", "/", "(", ")"];

export function FormulaBuilder({
  fields,
  name = "formula",
  defaultValue = "",
  sampleValues,
  onChange,
}: {
  fields: CustomFieldDef[];
  name?: string;
  defaultValue?: string;
  sampleValues?: Record<string, string>;
  onChange?: (expression: string) => void;
}) {
  const [expression, setExpression] = useState(defaultValue);
  function setExpr(next: string) {
    setExpression(next);
    onChange?.(next);
  }
  const numeric = fields.filter((field) =>
    ["number", "currency", "percentage", "formula"].includes(field.type),
  );
  const preview = useMemo(
    () => evaluateFormula(expression, sampleValues ?? {}),
    [expression, sampleValues],
  );

  function insert(token: string) {
    setExpr(`${expression}${expression && !expression.endsWith(" ") ? " " : ""}${token} `);
  }

  return (
    <div className="space-y-2" data-ff-formula-builder>
      <input type="hidden" name={name} value={expression} />
      <Input
        value={expression}
        onChange={(event) => setExpr(event.target.value)}
        placeholder="coverage_a * 0.1"
        className="h-8 font-mono text-sm"
        aria-label="Formula"
      />
      <div className="flex flex-wrap gap-1">
        {numeric.map((field) => (
          <Button key={field.key} type="button" size="xs" variant="outline" onClick={() => insert(field.key)}>
            {field.label}
          </Button>
        ))}
        {OPS.map((op) => (
          <Button key={op} type="button" size="xs" variant="secondary" onClick={() => insert(op)}>
            {op}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Basic math and field names only — not a script.{" "}
        {preview.ok ? `Preview ${formatFormulaValue(preview.value)}` : preview.error}
      </p>
    </div>
  );
}
