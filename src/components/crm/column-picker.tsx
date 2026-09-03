import { ColumnPickerClient, type PickerColumn } from "@/components/crm/data-table";
import { getCurrentAgent, isAdminAgent, loadColumnLayout } from "@/lib/crm/desk-agent";

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
  const [agent, layout] = await Promise.all([getCurrentAgent(), loadColumnLayout(tableId, columns)]);
  return (
    <ColumnPickerClient
      tableId={tableId}
      columns={columns}
      layout={layout}
      agentName={agent.displayName}
      canSetAgencyDefault={isAdminAgent(agent)}
      toolbar={toolbar}
    >
      {children}
    </ColumnPickerClient>
  );
}
