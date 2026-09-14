import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";

const KEY_LEN = 64;
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

const GARCIA_ID = "44444444-4444-4444-8444-444444444403";
const TENANT = "11111111-1111-4111-8111-111111111111";
// resolve tenant from existing admin if needed
const sql = postgres("postgres://fitfirst:fitfirst_dev@127.0.0.1:5432/fitfirst");

const passwordHash = hashPassword("javier");

const [admin] = await sql`select tenant_id, totp_secret, mfa_secret from users where id = '44444444-4444-4444-8444-444444444401' limit 1`;
const tenantId = admin?.tenant_id ?? TENANT;
const secret = admin?.totp_secret ?? admin?.mfa_secret ?? "JBSWY3DPEHPK3PXP";

await sql`
  insert into users (
    id, tenant_id, name, email, username, role, password_hash, active, access_status,
    can_access_modules, can_see_agency_widgets, office_label, territory_label,
    must_set_password, mfa_enrolled, must_enroll_mfa, mfa_method, mfa_email,
    mfa_secret, totp_secret, mfa_demo_bypass, meeting_address, created_at, updated_at
  ) values (
    ${GARCIA_ID}, ${tenantId}, 'Javier Garcia', 'javier@fitfirst.local', 'javier', 'agent',
    ${passwordHash}, true, 'active',
    true, true, 'Palm Bay HQ', 'Brevard',
    false, true, false, 'email', 'javier@fitfirst.local',
    ${secret}, ${secret}, true, 'Suite 113 · agency book desk', now(), now()
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    username = excluded.username,
    role = excluded.role,
    password_hash = excluded.password_hash,
    active = excluded.active,
    access_status = excluded.access_status,
    can_access_modules = excluded.can_access_modules,
    can_see_agency_widgets = excluded.can_see_agency_widgets,
    office_label = excluded.office_label,
    territory_label = excluded.territory_label,
    must_set_password = excluded.must_set_password,
    mfa_enrolled = excluded.mfa_enrolled,
    must_enroll_mfa = excluded.must_enroll_mfa,
    mfa_method = excluded.mfa_method,
    mfa_email = excluded.mfa_email,
    mfa_secret = excluded.mfa_secret,
    totp_secret = excluded.totp_secret,
    mfa_demo_bypass = excluded.mfa_demo_bypass,
    meeting_address = excluded.meeting_address,
    updated_at = now()
`;

await sql`
  insert into desk_agents (id, tenant_id, slug, display_name, role)
  values (${GARCIA_ID}, ${tenantId}, 'javier', 'Javier Garcia', 'agent')
  on conflict (id) do update set
    display_name = excluded.display_name,
    role = excluded.role,
    slug = excluded.slug
`;

const rows = await sql`
  select id, name, email, username, role, can_see_agency_widgets, active, access_status,
         mfa_enrolled, mfa_demo_bypass, must_set_password, office_label, territory_label,
         (password_hash is not null) as has_password
  from users where id = ${GARCIA_ID}
`;
console.table(rows);

const desk = await sql`select * from desk_agents where id = ${GARCIA_ID}`;
console.table(desk);

// Ensure Veronica Boyle still exists
const veronica = await sql`select id, first_name, last_name from contacts where lower(last_name) = 'boyle' or lower(first_name) like '%veronica%' limit 5`;
console.log("Veronica check:", veronica);

await sql.end();
console.log("OK upserted Javier Garcia");
