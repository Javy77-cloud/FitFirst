"use client";

import { useMemo, useState } from "react";
import { previewAutomationNotify, saveGuidedAutomation } from "@/app/actions/automations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_ACTION_HINT,
  AUTOMATION_ACTION_LABEL,
  AUTOMATION_CONDITIONS,
  AUTOMATION_CONDITION_LABEL,
  AUTOMATION_TRIGGERS,
  AUTOMATION_TRIGGER_HINT,
  AUTOMATION_TRIGGER_LABEL,
  preferredActionFor,
  type AutomationAction,
  type AutomationCondition,
  type AutomationTrigger,
} from "@/lib/automations/types";
import { DEAL_STAGES, LINES } from "@/lib/domain";

type TemplateOption = { id: string; name: string };

export function AutomationBuilderForm({
  templates,
}: {
  templates: TemplateOption[];
}) {
  const [triggerKind, setTriggerKind] = useState<AutomationTrigger>("closed_won");
  const [conditionKind, setConditionKind] = useState<AutomationCondition>("always");
  const [actionKind, setActionKind] = useState<AutomationAction>("in_app_notify");
  const [actionValue, setActionValue] = useState(
    "Closed Won just landed. Confirm the bind packet.",
  );

  const triggerHint = AUTOMATION_TRIGGER_HINT[triggerKind];
  const actionHint = AUTOMATION_ACTION_HINT[actionKind];

  const actionField = useMemo(() => {
    if (actionKind === "send_template_email") {
      return (
        <div>
          <Label className="text-xs">Work-email template</Label>
          <select
            name="actionValue"
            required
            value={actionValue}
            onChange={(event) => setActionValue(event.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">Pick a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      );
    }
    if (actionKind === "create_task") {
      return (
        <div>
          <Label className="text-xs">Task title</Label>
          <Input
            name="actionValue"
            required
            value={actionValue}
            onChange={(event) => setActionValue(event.target.value)}
            className="mt-1 h-8"
            placeholder="Shop this renewal 60 days out"
          />
        </div>
      );
    }
    return (
      <div>
        <Label className="text-xs">In-app alert</Label>
        <Textarea
          name="actionValue"
          required
          rows={3}
          value={actionValue}
          onChange={(event) => setActionValue(event.target.value)}
          className="mt-1"
          placeholder="Ping the producer in Alerts. Do not email the broker."
        />
      </div>
    );
  }, [actionKind, actionValue, templates]);

  return (
    <form action={saveGuidedAutomation} className="ff-card space-y-3 p-4">
      <h2 className="text-sm font-semibold text-navy">New automation</h2>
      <p className="text-xs text-muted-foreground">
        Pick a trigger, a condition, then an action. Agent alerts stay in-app — that is the Javy
        preference.
      </p>
      <div>
        <Label className="text-xs">Name</Label>
        <Input name="name" required className="mt-1 h-8" placeholder="Closed Won — ping producer" />
      </div>
      <div>
        <Label className="text-xs">1. Trigger</Label>
        <select
          name="triggerKind"
          value={triggerKind}
          onChange={(event) => {
            const next = event.target.value as AutomationTrigger;
            setTriggerKind(next);
            const preferred = preferredActionFor(next);
            setActionKind(preferred);
            if (preferred === "in_app_notify") {
              setActionValue("Check Alerts. Nothing emailed the broker.");
            } else if (preferred === "create_task") {
              setActionValue("Shop this renewal 60 days out");
            }
          }}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {AUTOMATION_TRIGGERS.map((trigger) => (
            <option key={trigger} value={trigger}>
              {AUTOMATION_TRIGGER_LABEL[trigger]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">{triggerHint}</p>
      </div>
      {triggerKind === "deal_stage_change" ? (
        <div>
          <Label className="text-xs">Stage this watches</Label>
          <select
            name="triggerValue"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="quote_sent"
          >
            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      ) : triggerKind === "policy_renewal_window" ? (
        <div>
          <Label className="text-xs">Days before expiration</Label>
          <Input name="triggerValue" defaultValue="60" className="mt-1 h-8" />
        </div>
      ) : (
        <input type="hidden" name="triggerValue" value="" />
      )}
      <div>
        <Label className="text-xs">2. Condition</Label>
        <select
          name="conditionKind"
          value={conditionKind}
          onChange={(event) => setConditionKind(event.target.value as AutomationCondition)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {AUTOMATION_CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {AUTOMATION_CONDITION_LABEL[condition]}
            </option>
          ))}
        </select>
      </div>
      {conditionKind === "line_of_business" ? (
        <div>
          <Label className="text-xs">Line</Label>
          <select
            name="conditionValue"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="HO"
          >
            {LINES.map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>
        </div>
      ) : conditionKind === "days_before" ? (
        <div>
          <Label className="text-xs">Days</Label>
          <Input name="conditionValue" defaultValue="60" className="mt-1 h-8" />
        </div>
      ) : conditionKind === "stage_is" ? (
        <div>
          <Label className="text-xs">Stage</Label>
          <select
            name="conditionValue"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="quote_sent"
          >
            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="conditionValue" value="" />
      )}
      <div>
        <Label className="text-xs">3. Action</Label>
        <select
          name="actionKind"
          value={actionKind}
          onChange={(event) => {
            const next = event.target.value as AutomationAction;
            setActionKind(next);
            if (next === "in_app_notify") {
              setActionValue("Check Alerts. Nothing emailed the broker.");
            } else if (next === "create_task") {
              setActionValue("Follow this record");
            } else {
              setActionValue(templates[0]?.id ?? "");
            }
          }}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {AUTOMATION_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {AUTOMATION_ACTION_LABEL[action]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">{actionHint}</p>
      </div>
      {actionField}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked />
        Enabled
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          Save automation
        </Button>
        {actionKind === "in_app_notify" ? (
          <Button formAction={previewAutomationNotify} type="submit" size="sm" variant="outline">
            Preview in-app notify
          </Button>
        ) : null}
      </div>
    </form>
  );
}
