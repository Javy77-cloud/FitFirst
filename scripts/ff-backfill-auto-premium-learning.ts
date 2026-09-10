/**
 * Backfill Auto premium-learning snapshots onto Heather Auto attempt logs + quotes.
 * Also ensure today's Home quotes on 5ed997ba have Appetite Log attempt rows.
 * No seed wipe.
 */
import postgres from "postgres";
import { buildAutoFeatureSnapshot } from "../src/lib/appetite/auto-premium-learning";
import type { QuoteSheetFieldValue } from "../src/lib/domain";

const AUTO_DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const HOME_DEAL = "5ed997ba-21b5-4a70-bdf8-c78810cc79b1";
const FOCUS = ["Liberty Mutual", "Bristol West", "Allstate", "Geico", "Progressive"];
const TODAY = "2026-09-10T04:00:00.000Z";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const sql = postgres(url, { max: 1 });

  try {
    const sheets = await sql<
      { values: Record<string, QuoteSheetFieldValue> }[]
    >`select values from quote_sheets where deal_id = ${AUTO_DEAL}::uuid and line = 'auto' limit 1`;
    const risks = await sql`
      select * from risks where deal_id = ${AUTO_DEAL}::uuid limit 1
    `;
    const risk = risks[0] ?? null;
    const snap = buildAutoFeatureSnapshot({
      sheetValues: sheets[0]?.values ?? {},
      risk: risk
        ? {
            state: risk.state,
            city: risk.city,
            zip: risk.zip,
            county: risk.county,
            vin: risk.vin,
            vehicleYear: risk.vehicle_year,
            vehicleMake: risk.vehicle_make,
            vehicleModel: risk.vehicle_model,
            vehicleUsage: risk.vehicle_usage,
            garagingZip: risk.garaging_zip,
          }
        : null,
    });

    const updated = await sql`
      update quote_attempt_logs
      set line_of_business = 'AUTO',
          auto_feature_snapshot = ${sql.json(snap as never)},
          snap_city = coalesce(snap_city, ${snap.city}),
          snap_county = coalesce(snap_county, ${snap.county})
      where deal_id = ${AUTO_DEAL}::uuid
      returning id
    `;

    const autoQuotes = await sql`
      select q.*, c.name as carrier_name
      from quotes q
      join carriers c on c.id = q.carrier_id
      where q.deal_id = ${AUTO_DEAL}::uuid
      order by q.created_at desc
    `;

    let refreshed = 0;
    let created = 0;
    for (const q of autoQuotes) {
      const result = q.risk_outcome || (q.bindable ? "quoted" : "no_market");
      if (q.quote_attempt_log_id) {
        await sql`
          update quote_attempt_logs
          set line_of_business = 'AUTO',
              auto_feature_snapshot = ${sql.json(snap as never)},
              premium = ${q.premium},
              quote_number = ${q.quote_number},
              bindable = ${q.bindable},
              result = ${result},
              snap_city = coalesce(snap_city, ${snap.city}),
              snap_county = coalesce(snap_county, ${snap.county})
          where id = ${q.quote_attempt_log_id}::uuid
        `;
        refreshed += 1;
        continue;
      }
      const existing = await sql`
        select id from quote_attempt_logs
        where deal_id = ${AUTO_DEAL}::uuid
          and carrier_id = ${q.carrier_id}::uuid
          and attempted_at >= ${TODAY}::timestamptz
        order by attempted_at desc
        limit 1
      `;
      if (existing[0]) {
        await sql`
          update quote_attempt_logs
          set line_of_business = 'AUTO',
              auto_feature_snapshot = ${sql.json(snap as never)},
              premium = coalesce(${q.premium}, premium),
              quote_number = coalesce(${q.quote_number}, quote_number),
              bindable = ${q.bindable},
              result = ${result}
          where id = ${existing[0].id}::uuid
        `;
        await sql`update quotes set quote_attempt_log_id = ${existing[0].id}::uuid where id = ${q.id}::uuid`;
        refreshed += 1;
      } else {
        const [log] = await sql`
          insert into quote_attempt_logs (
            tenant_id, deal_id, risk_id, carrier_id, line_of_business, result, bindable,
            quote_number, premium, why, snap_city, snap_county, auto_feature_snapshot, attempted_at
          ) values (
            ${q.tenant_id}::uuid, ${AUTO_DEAL}::uuid, ${q.risk_id}::uuid, ${q.carrier_id}::uuid,
            'AUTO', ${result}, ${q.bindable}, ${q.quote_number}, ${q.premium}, ${q.notes},
            ${snap.city}, ${snap.county}, ${sql.json(snap as never)}, ${q.created_at}
          ) returning id
        `;
        await sql`update quotes set quote_attempt_log_id = ${log.id}::uuid where id = ${q.id}::uuid`;
        created += 1;
      }
    }

    // Home appetite ensure for today's quotes missing attempt link
    const homeQuotes = await sql`
      select q.* from quotes q
      where q.deal_id = ${HOME_DEAL}::uuid
        and q.created_at >= ${TODAY}::timestamptz
    `;
    const homeRiskRows = await sql`select * from risks where deal_id = ${HOME_DEAL}::uuid limit 1`;
    const hr = homeRiskRows[0];
    let homeEnsured = 0;
    for (const q of homeQuotes) {
      if (q.quote_attempt_log_id) {
        homeEnsured += 1;
        continue;
      }
      const result = q.risk_outcome || (q.bindable ? "quoted" : "maybe");
      const [log] = await sql`
        insert into quote_attempt_logs (
          tenant_id, deal_id, risk_id, carrier_id, line_of_business, result, bindable,
          quote_number, premium, why, snap_year_built, snap_roof_year, snap_roof_covering,
          snap_construction, snap_city, snap_county, snap_coverage_a, snap_miles_to_coast, attempted_at
        ) values (
          ${q.tenant_id}::uuid, ${HOME_DEAL}::uuid, ${q.risk_id}::uuid, ${q.carrier_id}::uuid,
          'HO', ${result}, ${q.bindable}, ${q.quote_number}, ${q.premium}, ${q.notes},
          ${hr?.year_built ?? null}, ${hr?.roof_year ?? null}, ${hr?.roof_covering ?? null},
          ${hr?.construction ?? null}, ${hr?.city ?? null}, ${hr?.county ?? null},
          ${hr?.coverage_a ?? q.coverage_a ?? null}, ${hr?.miles_to_coast ?? null}, ${q.created_at}
        ) returning id
      `;
      await sql`update quotes set quote_attempt_log_id = ${log.id}::uuid where id = ${q.id}::uuid`;
      homeEnsured += 1;
    }

    const counts = await sql`
      select
        (select count(*)::int from quote_attempt_logs where deal_id = ${AUTO_DEAL}::uuid and auto_feature_snapshot is not null) as auto_with_snap,
        (select count(*)::int from quote_attempt_logs where deal_id = ${AUTO_DEAL}::uuid and attempted_at >= ${TODAY}::timestamptz) as auto_today,
        (select count(*)::int from quote_attempt_logs where deal_id = ${HOME_DEAL}::uuid and attempted_at >= ${TODAY}::timestamptz) as home_today,
        (select count(*)::int from quotes where deal_id = ${AUTO_DEAL}::uuid) as auto_quotes,
        (select count(*)::int from quotes where deal_id = ${HOME_DEAL}::uuid and created_at >= ${TODAY}::timestamptz) as home_quotes_today
    `;

    const focus = await sql`
      select distinct on (c.name)
        c.name as carrier, l.premium, l.result, l.quote_number,
        (l.auto_feature_snapshot is not null) as has_snap,
        l.auto_feature_snapshot->>'vehicleMake' as make,
        l.auto_feature_snapshot->>'vehicleYear' as vehicle_year,
        l.auto_feature_snapshot->>'driverAge' as driver_age
      from quote_attempt_logs l
      join carriers c on c.id = l.carrier_id
      where l.deal_id = ${AUTO_DEAL}::uuid
        and c.name = any(${FOCUS})
      order by c.name, l.attempted_at desc
    `;

    console.log(
      JSON.stringify(
        {
          snapPreview: {
            state: snap.state,
            city: snap.city,
            zip: snap.zip,
            vehicleYear: snap.vehicleYear,
            make: snap.vehicleMake,
            model: snap.vehicleModel,
            vin: snap.vin,
            driverAge: snap.driverAge,
            rideshare: snap.rideshare,
            ownership: snap.ownership,
            annualMiles: snap.annualMiles,
          },
          updatedLogs: updated.length,
          refreshedFromQuotes: refreshed,
          createdFromQuotes: created,
          homeEnsured,
          counts: counts[0],
          focusLatest: focus,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
