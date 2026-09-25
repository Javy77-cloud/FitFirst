"use client";

import { useMemo, useState, useTransition } from "react";
import {
  POLICY_LABEL_FIELDS,
  buildPolicyLabel,
  policyLabelPreviewSample,
  type PolicyLabelFieldId,
  type PolicyLabelTemplate,
} from "@/lib/policy/auto-label";
import {
  resetPolicyLabelTemplate,
  savePolicyLabelTemplate,
} from "@/app/actions/policy-label-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { flashAction } from "@/lib/flash-client";

const SEP_PRESETS = [
  { value: " / ", label: "Slash  /" },
  { value: " · ", label: "Dot  ·" },
  { value: " - ", label: "Dash  -" },
  { value: " | ", label: "Pipe  |" },
];

export function PolicyLabelBuilder({ initial }: { initial: PolicyLabelTemplate }) {
  const [fields, setFields] = useState<PolicyLabelFieldId[]>([...initial.fields]);
  const [separator, setSeparator] = useState(initial.separator);
  const [pending, startTransition] = useTransition();

  const template: PolicyLabelTemplate = useMemo(
    () => ({ fields, separator }),
    [fields, separator],
  );
  const preview = policyLabelPreviewSample(template);
  const emptySkipPreview = buildPolicyLabel(template, {
    ownerName: "Elena Hale",
    carrier: "",
    policyType: "HO3",
    policyNumber: "HP-FL-88421",
  });

  function toggleField(id: PolicyLabelFieldId) {
    setFields((cur) => {
      if (cur.includes(id)) return cur.filter((item) => item !== id);
      return [...cur, id];
    });
  }

  function move(id: PolicyLabelFieldId, dir: -1 | 1) {
    setFields((cur) => {
      const idx = cur.indexOf(id);
      if (idx < 0) return cur;
      const next = idx + dir;
      if (next < 0 || next >= cur.length) return cur;
      const copy = [...cur];
      const [row] = copy.splice(idx, 1);
      copy.splice(next, 0, row!);
      return copy;
    });
  }

  function save() {
    startTransition(async () => {
      try {
        const saved = await savePolicyLabelTemplate({ fields, separator });
        setFields([...saved.fields]);
        setSeparator(saved.separator);
        flashAction("Policy label template saved");
      } catch (err) {
        flashAction(err instanceof Error ? err.message : "Could not save", "error");
      }
    });
  }

  function reset() {
    startTransition(async () => {
      try {
        const saved = await resetPolicyLabelTemplate();
        setFields([...saved.fields]);
        setSeparator(saved.separator);
        flashAction("Reset to agency default");
      } catch (err) {
        flashAction(err instanceof Error ? err.message : "Could not reset", "error");
      }
    });
  }

  return (
    <div className="space-y-4" data-ff-policy-label-builder="">
      <section className="ff-card space-y-3 p-4">
        <h2 className="text-base font-semibold text-navy">Fields in order</h2>

        <ul className="space-y-2">
          {POLICY_LABEL_FIELDS.map((field) => {
            const on = fields.includes(field.id);
            const order = fields.indexOf(field.id);
            return (
              <li
                key={field.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleField(field.id)}
                    className="size-4"
                  />
                  <span className="font-medium text-navy">{field.label}</span>

                </label>
                {on ? (
                  <span className="flex items-center gap-1">
                    <span className="text-[11px] text-muted-foreground">#{order + 1}</span>
                    <button
                      type="button"
                      className="rounded border border-border px-1.5 text-xs"
                      onClick={() => move(field.id, -1)}
                      aria-label={`Move ${field.label} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-1.5 text-xs"
                      onClick={() => move(field.id, 1)}
                      aria-label={`Move ${field.label} down`}
                    >
                      ↓
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="ff-card space-y-3 p-4">
        <h2 className="text-base font-semibold text-navy">Separator</h2>
        <div className="flex flex-wrap gap-2">
          {SEP_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setSeparator(preset.value)}
              className={
                separator === preset.value
                  ? "rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                  : "rounded-md border border-border bg-card px-2.5 py-1 text-xs text-navy"
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="max-w-xs">
          <Label htmlFor="sep" className="text-xs">
            Custom separator
          </Label>
          <Input
            id="sep"
            value={separator}
            maxLength={8}
            className="mt-1 h-8"
            onChange={(e) => setSeparator(e.target.value)}
          />
        </div>
      </section>

      <section className="ff-card space-y-2 p-4" data-ff-policy-label-preview="">
        <h2 className="text-base font-semibold text-navy">Live preview</h2>
        <p className="text-sm text-muted-foreground">Sample with all fields filled:</p>
        <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-navy">{preview}</p>
        <p className="text-sm text-muted-foreground">Same template with empty carrier (skipped):</p>
        <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-navy">
          {emptySkipPreview}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={pending || fields.length === 0}>
          Save template
        </Button>
        <Button type="button" variant="outline" onClick={reset} disabled={pending}>
          Clear / reset to default
        </Button>
      </div>
    </div>
  );
}
