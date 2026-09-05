import { formatDay } from "@/lib/domain";
import { groupPolicyChangeLogs, sourceLabel, type PolicyChangeLogRow } from "@/lib/policy/change-log";

export function PolicyChangeTimeline({
  logs,
}: {
  logs: PolicyChangeLogRow[];
}) {
  const groups = groupPolicyChangeLogs(logs);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-navy">Change history</h3>
        <p className="text-helper text-muted-foreground">
          Who changed which field, when, and the value before / after. Bind, record edits, and
          endorsements write here. Ana is not on this book.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No field changes recorded on this policy yet.</p>
      ) : (
        <ol className="space-y-3">
          {groups.map((group) => (
            <li key={group.key} className="rounded-md border border-border">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                <span className="text-sm font-medium text-navy">{group.changedByName}</span>
                <span className="text-caption uppercase text-muted-foreground">
                  {formatDay(group.changedAt)}
                </span>
                <span className="rounded-sm bg-fit-check-bg px-1.5 py-0.5 text-[11px] font-semibold uppercase text-navy">
                  {sourceLabel(group.source)}
                </span>
              </div>
              <table className="ff-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {group.fields.map((field) => (
                    <tr key={`${group.key}-${field.fieldKey}`}>
                      <td className="font-medium">{field.fieldLabel}</td>
                      <td className="font-mono text-helper text-muted-foreground">{field.beforeValue}</td>
                      <td className="font-mono text-[11px] text-navy">{field.afterValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
