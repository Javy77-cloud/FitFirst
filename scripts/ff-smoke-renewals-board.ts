import { loadRenewalsBoard } from "@/lib/renewal/board-data";
import { getAgencyPolicyLabelTemplate } from "@/lib/policy/auto-label-prefs";
import { buildPolicyLabel } from "@/lib/policy/auto-label";

async function main() {
  const r = await loadRenewalsBoard(180);
  console.log("stages", r.stages.join(","));
  console.log("cards", r.cards.length);
  console.log(
    JSON.stringify(
      r.cards.slice(0, 5).map((c) => ({
        n: c.policyNumber,
        stage: c.stage,
        days: c.daysUntil,
        xs: c.crossSell.map((x) => x.line),
        prem: c.premium,
      })),
      null,
      2,
    ),
  );
  const t = await getAgencyPolicyLabelTemplate();
  console.log("template", JSON.stringify(t));
  console.log(
    "sample",
    buildPolicyLabel(t, {
      ownerName: "Elena Hale",
      carrier: "Citizens",
      policyType: "HO3",
      policyNumber: "HP-FL-88421",
    }),
  );
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
