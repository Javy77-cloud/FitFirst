import Link from "next/link";
import { GlobalListCard } from "@/components/settings/global-list-card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { currentDeskSession } from "@/lib/auth/session";
import { loadGlobalLists } from "@/lib/db/global-lists";
import { listCarriers } from "@/lib/db/queries";
import { GLOBAL_LIST_KEYS, GLOBAL_LIST_LABEL } from "@/lib/desk/global-lists";

export const dynamic = "force-dynamic";

export default async function GlobalListsPage() {
  const [session, rows, carriers] = await Promise.all([
    currentDeskSession(),
    loadGlobalLists(),
    listCarriers(),
  ]);

  return (
    <SettingsShell title="Lines / Global lists" current="lists">

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Link href="/settings/lines" className="ff-list-card block hover:border-primary/40">
          <div className="ff-list-card-body">
            <h2 className="text-sm font-semibold tracking-tight text-navy">Lines of business</h2>

          </div>
        </Link>
        <Link href="/settings/email-templates" className="ff-list-card block hover:border-primary/40">
          <div className="ff-list-card-body">
            <h2 className="text-sm font-semibold tracking-tight text-navy">Email templates</h2>

          </div>
        </Link>
        <Link href="/settings/email-triggers" className="ff-list-card block hover:border-primary/40">
          <div className="ff-list-card-body">
            <h2 className="text-sm font-semibold tracking-tight text-navy">Triggers</h2>

          </div>
        </Link>
        <Link href="/settings/integrations" className="ff-list-card block hover:border-primary/40">
          <div className="ff-list-card-body">
            <h2 className="text-sm font-semibold tracking-tight text-navy">Integrations catalog</h2>

          </div>
        </Link>
      </div>


      <section className="ff-list-card mb-4">
        <div className="ff-list-card-body">
          <h2 className="text-sm font-semibold tracking-tight text-navy">Carriers</h2>

          <ul className="mt-3 columns-1 gap-x-6 text-sm sm:columns-2">
            {[...carriers].sort((a, b) => a.carrier.name.localeCompare(b.carrier.name)).map(({ carrier }) => (
              <li key={carrier.id} className="break-inside-avoid py-0.5">
                <Link href={`/carriers/${carrier.id}`} className="text-primary hover:underline">
                  {carrier.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {GLOBAL_LIST_KEYS.map((key) => (
          <GlobalListCard
            key={key}
            listKey={key}
            title={GLOBAL_LIST_LABEL[key]}
            rows={rows.filter((row) => row.listKey === key)}
            canEdit={session.isAdmin}
            familyPicker={key === "policy_sub_type" || key === "policy_term" || key === "policy_type"}
          />
        ))}
      </div>
    </SettingsShell>
  );
}
