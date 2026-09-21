import type { CarrierLoginEvent, CarrierLoginRollup } from "@/lib/carrier-login-issues/types";
import { CARRIER_LOGIN_ISSUES_RELATIVE_PATH } from "@/lib/carrier-login-issues/types";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function CarrierLoginIssuesPanel({
  rollup,
  events,
}: {
  rollup: CarrierLoginRollup[];
  events: CarrierLoginEvent[];
}) {
  return (
    <div className="space-y-6" data-ff-carrier-login-issues="">
      <p className="text-sm text-muted-foreground">
        Event log: <code>{CARRIER_LOGIN_ISSUES_RELATIVE_PATH}</code>. Postgres mirror:{" "}
        <code>carrier_login_issues</code>. Routing is unchanged unless{" "}
        <code>FF_BLOCK_CARRIER_LOGIN_ISSUES=1</code>.
      </p>
      {rollup.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-carrier-login-issues-empty="">
          No login failures logged yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm" data-ff-carrier-login-rollup="">
            <caption className="mb-2 text-left text-sm font-semibold text-navy">
              Carriers with quote-bot login failures
            </caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-2 py-2 font-medium">Carrier</th>
                <th scope="col" className="px-2 py-2 font-medium">Category</th>
                <th scope="col" className="px-2 py-2 font-medium">Count</th>
                <th scope="col" className="px-2 py-2 font-medium">Recurring</th>
                <th scope="col" className="px-2 py-2 font-medium">First seen</th>
                <th scope="col" className="px-2 py-2 font-medium">Last seen</th>
                <th scope="col" className="px-2 py-2 font-medium">Latest error</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map((row) => (
                <tr
                  key={`${row.carrier_id ?? row.carrier_name}-${row.error_category}`}
                  className="border-b border-border align-top"
                  data-ff-carrier-login-row={row.carrier_name}
                  data-ff-carrier-login-recurring={row.recurring ? "true" : "false"}
                >
                  <td className="px-2 py-2">
                    <div className="font-medium text-navy">{row.carrier_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.lob || "—"}
                      {row.carrier_id ? ` · ${row.carrier_id}` : ""}
                    </div>
                  </td>
                  <td className="px-2 py-2">{row.error_category}</td>
                  <td className="px-2 py-2">{row.count}</td>
                  <td className="px-2 py-2">{row.recurring ? "Yes" : "No"}</td>
                  <td className="px-2 py-2">
                    <time dateTime={row.first_seen}>{formatWhen(row.first_seen)}</time>
                  </td>
                  <td className="px-2 py-2">
                    <time dateTime={row.last_seen}>{formatWhen(row.last_seen)}</time>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{row.error_message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm" data-ff-carrier-login-events="">
            <caption className="mb-2 text-left text-sm font-semibold text-navy">Event log</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-2 py-2 font-medium">When</th>
                <th scope="col" className="px-2 py-2 font-medium">Carrier</th>
                <th scope="col" className="px-2 py-2 font-medium">Category</th>
                <th scope="col" className="px-2 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {[...events]
                .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
                .map((event) => (
                  <tr key={event.id} className="border-b border-border align-top">
                    <td className="px-2 py-2">
                      <time dateTime={event.occurred_at}>{formatWhen(event.occurred_at)}</time>
                    </td>
                    <td className="px-2 py-2 font-medium text-navy">{event.carrier_name}</td>
                    <td className="px-2 py-2">{event.error_category}</td>
                    <td className="px-2 py-2 text-muted-foreground">{event.error_message}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
