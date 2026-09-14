import { loadLayoutForModule } from "../src/lib/custom-fields/store";
import { allLayoutFieldKeys } from "../src/lib/custom-fields/types";

async function main() {
  for (const line of ["HO", "AUTO", "GL", "LIFE", "HEALTH", "WC"]) {
    const layout = await loadLayoutForModule("deals", line);
    const keys = allLayoutFieldKeys(layout);
    console.log(line, {
      type: keys.includes("insurance_type"),
      subtype: keys.includes("insurance_subtype"),
    });
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
