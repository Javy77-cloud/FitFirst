# Zoho JSONL book dump (records only)

Copy one JSONL file per Zoho module into this folder, then wipe demo CRM rows and import.

Expected filenames (case-insensitive; `zoho-` prefix allowed):

| File | Zoho module | FitFirst table |
| --- | --- | --- |
| `Contacts.jsonl` | Contacts | `contacts` |
| `Accounts.jsonl` | Accounts (Business) | `accounts` |
| `Leads.jsonl` | Leads | `leads` |
| `Deals.jsonl` | Deals | `deals` |
| `Vendors.jsonl` | Vendors (Carriers) | `carriers` — add only when the name is new |
| `Policies.jsonl` | Policies (custom) | `policies` |
| `Tasks.jsonl` | Tasks | `activities` (`kind=task`) |

Each line is a Zoho CRM record as returned by `getRecords` (`id` + API-name keys). A whole MCP page is also accepted:

```json
{"data":[{"id":"6742…","First_Name":"Sharon","Last_Name":"Reese"}],"info":{"count":1}}
```

Lookups stay in Zoho shape: `{"id":"…","name":"…"}`. Files / attachments are out of scope.

Do not commit live dumps. `*.jsonl` in this folder is gitignored.
