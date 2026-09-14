const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
const dealId = '5ed997ba-21b5-4a70-bdf8-c78810cc79b1';
(async () => {
  const sheets = await sql`select values from quote_sheets where deal_id = ${dealId}`;
  const v = (sheets[0] && sheets[0].values) || {};
  const keys = Object.keys(v).filter(k => /heat|hydrant|hvac|fire|fuel|electric|gas|amp/i.test(k));
  console.log('KEYS', keys);
  for (const k of keys) console.log(k, JSON.stringify(v[k]));
  // also dump a few related
  for (const k of ['hvac_year','electrical_year','electrical_circuit_amps','hydrant','miles_to_fire_station','protection_class','flood_zone']) {
    if (v[k]) console.log(k, JSON.stringify(v[k]));
  }
  await sql.end();
})().catch(e=>{console.error(e);process.exit(1)});
