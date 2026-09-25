import {
  resetAgentColumnLayout,
  saveAgencyColumnDefault,
  saveAgentColumnLayout,
  moveAgentColumn,
} from "@/app/actions/desk";
import { AutoSaveForm } from "@/components/crm/auto-save-form";
import { getCurrentAgent, isAdminAgent, loadColumnLayout } from "@/lib/crm/desk-agent";
import type { PickerColumn } from "@/components/crm/data-table";

export type { PickerColumn };

async function loadPicker(tableId: string, columns: PickerColumn[]) {
  const [agent, layout] = await Promise.all([getCurrentAgent(), loadColumnLayout(tableId, columns)]);
  const shown = layout.ids
    .filter((id) => columns.some((column) => column.id === id))
    .map((id) => `[data-ff-cols="${tableId}"] [data-col="${id}"]`)
    .join(", ");
  const sourceLabel =
    layout.source === "agent"
      ? `Saved for ${agent.displayName}`
      : layout.source === "agency"
        ? "Agency default"
        : "Product default";
  return { agent, layout, shown, sourceLabel };
}

/** Columns menu for AppShell.columns — far right of the title row. */
export async function ColumnPickerMenu({
  tableId,
  columns,
}: {
  tableId: string;
  columns: PickerColumn[];
}) {
  const { agent, layout, sourceLabel } = await loadPicker(tableId, columns);
  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[0.8rem] font-medium text-navy hover:bg-muted">
        Columns
      </summary>
      <div className="absolute right-0 z-50 mt-1 max-h-80 w-72 overflow-auto rounded-md border border-border bg-card p-2 shadow-lg">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {sourceLabel}
        </p>
        <AutoSaveForm action={saveAgentColumnLayout} className="space-y-0.5">
          <input type="hidden" name="tableId" value={tableId} />
          {columns.map((col) => {
            const on = layout.ids.includes(col.id);
            const required = col.hideable === false;
            return (
              <label
                key={col.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-navy hover:bg-muted"
              >
                {required ? <input type="hidden" name="columnIds" value={col.id} /> : null}
                <input
                  type="checkbox"
                  name="columnIds"
                  value={col.id}
                  defaultChecked={on}
                  disabled={required}
                  className="size-3.5 accent-primary"
                />
                <span className="truncate">{col.header}</span>
              </label>
            );
          })}
          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-navy px-2 py-1.5 text-xs font-medium text-white"
          >
            Save my columns
          </button>
        </AutoSaveForm>
        <div className="mt-2 flex flex-wrap gap-1 px-1">
          {layout.ids.map((id) => {
            const col = columns.find((column) => column.id === id);
            if (!col) return null;
            return (
              <form key={id} action={moveAgentColumn} className="flex items-center gap-0.5 rounded border border-border px-1 py-0.5 text-[10px]">
                <input type="hidden" name="tableId" value={tableId} />
                <input type="hidden" name="columnId" value={id} />
                <input type="hidden" name="currentIds" value={layout.ids.join(",")} />
                <button type="submit" name="direction" value="-1" className="px-1 hover:bg-muted">
                  ↑
                </button>
                <span>{col.header}</span>
                <button type="submit" name="direction" value="1" className="px-1 hover:bg-muted">
                  ↓
                </button>
              </form>
            );
          })}
        </div>
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          {layout.hasAgentOverride ? (
            <form action={resetAgentColumnLayout}>
              <input type="hidden" name="tableId" value={tableId} />
              <button
                type="submit"
                className="w-full rounded-md px-2 py-1 text-left text-xs text-primary hover:bg-muted"
              >
                Use agency default
              </button>
            </form>
          ) : null}
          {isAdminAgent(agent) ? (
            <form action={saveAgencyColumnDefault}>
              <input type="hidden" name="tableId" value={tableId} />
              {layout.ids.map((id) => (
                <input key={id} type="hidden" name="columnIds" value={id} />
              ))}
              <button
                type="submit"
                className="w-full rounded-md px-2 py-1 text-left text-xs text-navy hover:bg-muted"
              >
                Save as agency default
              </button>
            </form>
          ) : null}

        </div>
      </div>
    </details>
  );
}

export async function ColumnPicker({
  tableId,
  columns,
  children,
  toolbar,
}: {
  tableId: string;
  columns: PickerColumn[];
  children: React.ReactNode;
  toolbar?: React.ReactNode;
}) {
  const { shown } = await loadPicker(tableId, columns);

  return (
    <div className="space-y-3">
      <style>{`
        [data-ff-cols="${tableId}"] [data-col] { display: none !important; }
        ${shown} { display: table-cell !important; }
      `}</style>
      {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      <div data-ff-cols={tableId}>{children}</div>
    </div>
  );
}
