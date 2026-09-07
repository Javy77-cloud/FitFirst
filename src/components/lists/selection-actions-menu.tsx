"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { sendDeskEmail, sendDeskSms } from "@/app/actions/comms";
import { clickDeskButton, runDeskMacro } from "@/app/actions/developer-hub";
import {
  archiveSelectedRecords,
  convertSelectedLeads,
  deleteSelectedRecords,
  duplicateSelectedRecord,
  openMergeForSelection,
} from "@/app/actions/list-selection";
import { confirmDeleteOnce, confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { asDevHubModule, listSelectionActions, type CrmListModule, type SelectionRecord } from "@/lib/lists/selection-actions";

type MacroOption = { id: string; name: string; kind?: string };
type ButtonOption = {
  id: string;
  label: string;
  actionKind: string;
  functionApiName?: string | null;
};

function ActionLabel({ label, reason }: { label: string; reason?: string }) {
  return (
    <span className="flex w-max flex-col items-start whitespace-nowrap text-left">
      <span>{label}</span>
      {reason ? (
        <span className="whitespace-nowrap text-[11px] font-normal text-muted-foreground">{reason}</span>
      ) : null}
    </span>
  );
}

export function SelectionActionsMenu({
  module,
  selected,
  records,
  macros,
  buttons,
  busy,
  onBusy,
  onMessage,
  onWidget,
  onClear,
}: {
  module: CrmListModule;
  selected: string[];
  records: SelectionRecord[];
  macros: MacroOption[];
  buttons: ButtonOption[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onMessage: (message: string | null) => void;
  onWidget: (widget: { name: string; url: string | null } | null) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const selectedRecords = useMemo(
    () => selected.map((id) => records.find((row) => row.id === id) ?? { id, label: id }),
    [records, selected],
  );
  const actions = listSelectionActions({
    module,
    selected: selectedRecords,
    hasMacros: macros.length > 0,
  });
  const hubModule = asDevHubModule(module);
  const [compose, setCompose] = useState<"email" | "sms" | null>(null);
  const [subject, setSubject] = useState("Desk follow-up");
  const [body, setBody] = useState("");
  const deleteLock = useRef(false);

  if (selected.length === 0) return null;

  function formWithIds(): FormData {
    const form = new FormData();
    form.set("module", module);
    for (const id of selected) form.append("recordId", id);
    return form;
  }

  async function finish(result: { ok: boolean; message: string; href?: string }, clearOnOk = true) {
    onMessage(result.message);
    onBusy(false);
    if (result.ok && clearOnOk) onClear();
    if (result.ok && result.href) router.push(result.href);
    else if (result.ok) router.refresh();
  }

  async function onDuplicate() {
    onBusy(true);
    await finish(await duplicateSelectedRecord(formWithIds()));
  }

  async function onMerge() {
    onBusy(true);
    await finish(await openMergeForSelection(formWithIds()));
  }

  async function onArchive() {
    if (!window.confirm(`Archive ${selected.length} selected ${selected.length === 1 ? "record" : "records"}? They leave this list.`)) {
      return;
    }
    onBusy(true);
    await finish(await archiveSelectedRecords(formWithIds()));
  }

  async function onDelete() {
    if (deleteLock.current) return;
    deleteLock.current = true;
    const noun =
      module === "leads"
        ? selected.length === 1
          ? "this lead"
          : `${selected.length} selected leads`
        : selected.length === 1
          ? "this task"
          : `${selected.length} selected tasks`;
    const confirmed = module === "leads" ? confirmDeleteOnce(noun) : confirmHardDelete(noun);
    if (!confirmed) {
      deleteLock.current = false;
      return;
    }
    onBusy(true);
    try {
      const result = await deleteSelectedRecords(formWithIds());
      await finish(result);
    } catch (error) {
      onBusy(false);
      onMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      deleteLock.current = false;
    }
  }

  async function onConvert() {
    onBusy(true);
    await finish(await convertSelectedLeads(formWithIds()));
  }

  async function onMacro(macroId: string) {
    if (!hubModule || !macroId) {
      onMessage("No macros for this list — open Settings → Macros");
      return;
    }
    onBusy(true);
    const form = formWithIds();
    form.set("macroId", macroId);
    form.set("module", hubModule);
    const result = await runDeskMacro(form);
    onMessage(result.summary);
    onBusy(false);
    if (result.ok) onClear();
  }

  async function onButton(buttonId: string) {
    onBusy(true);
    const notes: string[] = [];
    for (const id of selected) {
      const form = new FormData();
      form.set("buttonId", buttonId);
      form.set("recordId", id);
      const result = await clickDeskButton(form);
      if (result.kind === "url" && result.url) window.open(result.url, "_blank", "noopener,noreferrer");
      if (result.kind === "widget") {
        onWidget({ name: result.widgetName ?? "Widget", url: result.widgetUrl ?? null });
      }
      notes.push(result.message);
    }
    onMessage(notes[0] ?? "Done.");
    onBusy(false);
  }

  async function sendCompose() {
    if (!compose) return;
    const targets = selectedRecords.filter((row) =>
      compose === "email" ? Boolean(row.email?.trim()) : Boolean(row.phone?.trim()),
    );
    if (targets.length === 0) {
      onMessage(compose === "email" ? "No email on the selected rows." : "No phone on the selected rows.");
      return;
    }
    onBusy(true);
    for (const row of targets) {
      const form = new FormData();
      form.set("direction", "outbound");
      if (compose === "email") {
        form.set("subject", subject || "Desk follow-up");
        form.set("body", body || `Follow-up for ${row.label}.`);
        form.set("toAddress", row.email ?? "");
      } else {
        form.set("body", body || `Text for ${row.label}.`);
        form.set("phone", row.phone ?? "");
      }
      if (row.contactId) form.set("contactId", row.contactId);
      if (row.accountId) form.set("accountId", row.accountId);
      if (row.dealId) form.set("dealId", row.dealId);
      if (row.leadId) form.set("leadId", row.leadId);
      if (row.policyId) form.set("policyId", row.policyId);
      if (module === "leads") form.set("leadId", row.id);
      if (module === "contacts") form.set("contactId", row.id);
      if (module === "deals") form.set("dealId", row.id);
      if (module === "policies") form.set("policyId", row.id);
      if (module === "businesses") form.set("accountId", row.id);
      if (compose === "email") await sendDeskEmail(form);
      else await sendDeskSms(form);
    }
    setCompose(null);
    onBusy(false);
    onClear();
    onMessage(
      compose === "email"
        ? `Queued email for ${targets.length} record${targets.length === 1 ? "" : "s"}. Nothing left the desk.`
        : `Queued SMS for ${targets.length} record${targets.length === 1 ? "" : "s"}. Nothing left the desk.`,
    );
    router.refresh();
  }

  function handle(id: (typeof actions)[number]["id"], href?: string) {
    if (id === "bind" && href) {
      router.push(href);
      return;
    }
    if (id === "convert" && href) {
      router.push(href);
      return;
    }
    if (id === "print") {
      window.print();
      return;
    }
    if (id === "email") {
      setSubject("Desk follow-up");
      setBody("");
      setCompose("email");
      return;
    }
    if (id === "sms") {
      setBody("");
      setCompose("sms");
      return;
    }
    if (id === "duplicate") void onDuplicate();
    if (id === "merge") void onMerge();
    if (id === "archive") void onArchive();
    if (id === "delete") void onDelete();
    if (id === "convert") void onConvert();
  }

  const extras = actions.filter((item) => item.id === "convert" || item.id === "bind");
  const core = actions.filter((item) => !["convert", "bind", "run_macro", "delete"].includes(item.id));
  const runMacro = actions.find((item) => item.id === "run_macro");
  const del = actions.find((item) => item.id === "delete");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" size="sm" className="gap-1" disabled={busy} />}
        >
          Actions
          <ChevronDown className="size-3.5 opacity-80" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-max min-w-max">
          {extras.length ? (
            <>
              <DropdownMenuGroup>
                {extras.map((action) => (
                  <ActionItem key={action.id} action={action} busy={busy} onPick={handle} />
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuGroup>
            {core.map((action) => (
              <ActionItem key={action.id} action={action} busy={busy} onPick={handle} />
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {runMacro?.enabled && macros.length ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Run macro</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-48">
                  <DropdownMenuLabel>Macros</DropdownMenuLabel>
                  {macros.map((macro) => (
                    <DropdownMenuItem
                      key={macro.id}
                      disabled={busy}
                      onClick={() => void onMacro(macro.id)}
                    >
                      {macro.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : (
              <DropdownMenuItem disabled>
                <ActionLabel label="Run macro" reason={runMacro?.reason} />
              </DropdownMenuItem>
            )}
            {buttons.map((button) => (
              <DropdownMenuItem key={button.id} disabled={busy} onClick={() => void onButton(button.id)}>
                {button.label}
              </DropdownMenuItem>
            ))}
            {del ? <ActionItem action={del} busy={busy} onPick={handle} /> : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={compose !== null} onOpenChange={(open) => !open && setCompose(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{compose === "sms" ? "Queue SMS" : "Queue email"}</DialogTitle>
            <DialogDescription>
              Writes the desk outbound queue and activity log. No vendor send from this menu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {compose === "email"
                ? selectedRecords
                    .filter((row) => row.email)
                    .map((row) => `${row.label} · ${row.email}`)
                    .join(" · ")
                : selectedRecords
                    .filter((row) => row.phone)
                    .map((row) => `${row.label} · ${row.phone}`)
                    .join(" · ")}
            </p>
            {compose === "email" ? (
              <div>
                <Label htmlFor="selection-email-subject" className="text-xs">
                  Subject
                </Label>
                <Input
                  id="selection-email-subject"
                  className="mt-1 h-8"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
            ) : null}
            <div>
              <Label htmlFor="selection-compose-body" className="text-xs">
                {compose === "sms" ? "Text" : "Body"}
              </Label>
              <textarea
                id="selection-compose-body"
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setCompose(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void sendCompose()}>
              Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActionItem({
  action,
  busy,
  onPick,
}: {
  action: ReturnType<typeof listSelectionActions>[number];
  busy: boolean;
  onPick: (id: ReturnType<typeof listSelectionActions>[number]["id"], href?: string) => void;
}) {
  return (
    <DropdownMenuItem
      disabled={!action.enabled || busy}
      variant={action.variant}
      title={action.reason}
      onClick={() => {
        if (!action.enabled) return;
        onPick(action.id, action.href);
      }}
    >
      <ActionLabel label={action.label} reason={action.enabled ? undefined : action.reason} />
    </DropdownMenuItem>
  );
}
