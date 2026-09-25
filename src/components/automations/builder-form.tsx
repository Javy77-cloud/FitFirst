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
  PLAYBOOK_VISIBILITIES,
  PLAYBOOK_VISIBILITY_HINT,
  PLAYBOOK_VISIBILITY_LABEL,
  preferredActionFor,
  type AutomationAction,
  type AutomationCondition,
  type AutomationTrigger,
  type PlaybookVisibility,
} from "@/lib/automations/types";
import { DEAL_STAGES, LINES } from "@/lib/domain";
import { commercialLineMenuOptions } from "@/lib/policy/eo";

type TemplateOption = { id: string; name: string };

export function AutomationBuilderForm({
  templates,
}: {
  templates: TemplateOption[];
}) {
  const [triggerKind, setTriggerKind] = useState<AutomationTrigger>("closed_won");
  const [conditionKind, setConditionKind] = useState<AutomationCondition>("always");
  const [actionKind, setActionKind] = useState<AutomationAction>("in_app_notify");
  const [visibility, setVisibility] = useState<PlaybookVisibility>("both");
  const [actionValue, setActionValue] = useState(
    "Closed Won just landed. Confirm the bind packet.",
  );

  const triggerHint = AUTOMATION_TRIGGER_HINT[triggerKind];
  const actionHint = AUTOMATION_ACTION_HINT[actionKind];

  const actionField = useMemo(() => {
    if (actionKind === "send_template_email") {
      return (
        <div>
          <Label className="text-xs">Draft hold note</Label>
          <Input
            name="actionValue"
            required
            value={actionValue}
            onChange={(event) => setActionValue(event.target.value)}
            className="mt-1 h-8"
            placeholder="Hold this template as a draft. Nothing sends."
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {templates.length
              ? `${templates.length} templates in the library — none send from a playbook.`
              : "No templates yet. The hold still stays in-desk."}
          </p>
        </div>
      );
    }
    if (actionKind === "create_task" || actionKind === "task_and_alert") {
      return (
        <div>
          <Label className="text-xs">
            {actionKind === "task_and_alert" ? "Task title + alert body" : "Task title"}
          </Label>
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
            } else if (preferred === "task_and_alert" || preferred === "create_task") {
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
            {commercialLineMenuOptions(LINES, (line) => line).map((line) => (
              <option key={line.value} value={line.value} title={line.title}>
                {line.label}
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
            } else if (next === "create_task" || next === "task_and_alert") {
              setActionValue("Follow this record");
            } else {
              setActionValue("Hold this template as a draft. Nothing sends.");
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
      <div>
        <Label className="text-xs">Who sees this playbook</Label>
        <select
          name="visibility"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as PlaybookVisibility)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {PLAYBOOK_VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {PLAYBOOK_VISIBILITY_LABEL[value]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">{PLAYBOOK_VISIBILITY_HINT[visibility]}</p>
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
