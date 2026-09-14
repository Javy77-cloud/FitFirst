import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";

type Row = {
  id: string;
  name: string;
  agencyCode: string | null;
  portalUrl: string | null;
  hasUser: boolean;
  hasPass: boolean;
  active: boolean | null;
  createdAt: Date | null;
};

async function main() {
  const rows = (await db
    .select({
      id: carriers.id,
      name: carriers.name,
      agencyCode: carriers.agencyCode,
      portalUrl: carriers.portalUrl,
      hasUser: sql<boolean>`(${carriers.portalUsernameEnc} is not null and ${carriers.portalUsernameIv} is not null)`,
      hasPass: sql<boolean>`(${carriers.portalPasswordEnc} is not null and ${carriers.portalPasswordIv} is not null)`,
      active: carriers.active,
      createdAt: carriers.createdAt,
    })
    .from(carriers)
    .where(eq(carriers.tenantId, DEFAULT_TENANT_ID))) as Row[];

  const byKey = new Map<string, Row[]>();
  for (const r of rows) {
    const key = (r.name ?? "").trim().toLowerCase();
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }
  const dups = [...byKey.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));
  console.log("duplicate name groups:", dups.length);
  for (const [name, list] of dups) {
    console.log(`\n=== ${name} (${list.length}) ===`);
    for (const r of list) {
      console.log(
        JSON.stringify({
          id: r.id,
          name: r.name,
          agencyCode: r.agencyCode,
          portalUrl: r.portalUrl,
          hasUser: r.hasUser,
          hasPass: r.hasPass,
          active: r.active,
          createdAt: r.createdAt,
        }),
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
