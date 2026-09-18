import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { MedicareBulkSyncPanel } from "@/components/settings/medicare-bulk-sync-panel";
import {
  HEALTHSHERPA_AGENT_EMAIL_MISSING,
  HEALTHSHERPA_KEYS_MISSING,
  HEALTHSHERPA_MEDICARE_BULK_AUTH_BANNER,
  HEALTHSHERPA_MEDICARE_BULK_FILTER,
  HEALTHSHERPA_MEDICARE_BULK_TITLE,
} from "./copy";
import {
  contactLooksMedicareHealth,
  failedMedicareBulkMessages,
  MEDICARE_BULK_ONESHOT_ERROR_LIMIT,
  MEDICARE_BULK_RATE_LIMIT_MS,
  medicareBulkAuthBanner,
  medicareBulkCredentialsReady,
  parseMedicareBulkOneshotState,
  persistableMedicareBulkLastRun,
  runMedicareContactBulkSync,
  tallyMedicareBulkRows,
} from "./bulk-medicare";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("./sync", () => ({
  syncContactToHealthSherpa: vi.fn(),
}));

vi.mock("@/app/actions/healthsherpa", () => ({
  bulkSyncMedicareContactsAction: vi.fn(),
  hideMedicareBulkSyncAction: vi.fn(),
  restoreMedicareBulkSyncAction: vi.fn(),
}));

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Medicare/Health contact filter", () => {
  it("includes HEALTH policies unpublished or published, HealthSherpa source, and Health flags", () => {
    expect(
      contactLooksMedicareHealth({
        hasHealthPolicy: true,
        source: "zoho",
        tags: [],
        healthNotes: null,
      }),
    ).toBe(true);
    expect(
      contactLooksMedicareHealth({
        hasHealthPolicy: false,
        source: "healthsherpa",
        tags: [],
        healthNotes: null,
      }),
    ).toBe(true);
    expect(
      contactLooksMedicareHealth({
        hasHealthPolicy: false,
        source: "zoho",
        tags: ["Medicare"],
        healthNotes: null,
      }),
    ).toBe(true);
    expect(
      contactLooksMedicareHealth({
        hasHealthPolicy: false,
        source: "zoho",
        tags: [],
        healthNotes: "MAPD from last AEP",
      }),
    ).toBe(true);
  });

  it("does not push every CRM contact and skips archived/merged", () => {
    expect(
      contactLooksMedicareHealth({
        hasHealthPolicy: false,
        source: "zoho",
        tags: ["homeowner"],
        healthNotes: null,
      }),
    ).toBe(false);
    expect(
      contactLooksMedicareHealth({
        hasHealthPolicy: true,
        source: "healthsherpa",
        tags: ["medicare"],
        healthNotes: "yes",
        archivedAt: "2026-01-01",
      }),
    ).toBe(false);
    expect(
      contactLooksMedicareHealth({
        hasHealthPolicy: true,
        mergedIntoId: "keeper",
      }),
    ).toBe(false);
    expect(HEALTHSHERPA_MEDICARE_BULK_FILTER).toMatch(/HEALTH policy/);
    expect(HEALTHSHERPA_MEDICARE_BULK_FILTER).toMatch(/source is healthsherpa/);
    expect(HEALTHSHERPA_MEDICARE_BULK_FILTER).toMatch(/Does not push the whole CRM|not the whole CRM/);
  });
});

describe("Medicare bulk credentials + tally", () => {
  it("skips the whole run when the Medicare vault key or agent email is missing", async () => {
    const syncContact = vi.fn();
    const listCandidates = vi.fn(async () => [
      {
        id: "c1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: null,
        dateOfBirth: null,
        mailingAddress: null,
        city: null,
        state: null,
        zip: null,
        source: "healthsherpa",
        sourceId: null,
        tags: ["medicare"],
        healthNotes: null,
        status: "active",
        archivedAt: null,
        mergedIntoId: null,
      },
    ]);

    const noKey = await runMedicareContactBulkSync({
      loadCredentials: async () => null,
      listCandidates,
      syncContact,
      persist: false,
    });
    expect(noKey).toMatchObject({
      ok: false,
      code: "not_configured",
      message: HEALTHSHERPA_KEYS_MISSING,
      synced: 0,
      skipped: 0,
      failed: 0,
      candidateCount: 0,
      configured: false,
    });
    expect(listCandidates).not.toHaveBeenCalled();
    expect(syncContact).not.toHaveBeenCalled();

    const noEmail = await runMedicareContactBulkSync({
      loadCredentials: async () => ({ apiKey: "partner-key", agentEmail: null, environment: "sandbox" }),
      listCandidates,
      syncContact,
      persist: false,
    });
    expect(noEmail).toMatchObject({
      ok: false,
      code: "agent_email",
      message: HEALTHSHERPA_AGENT_EMAIL_MISSING,
      synced: 0,
      skipped: 0,
      failed: 0,
    });
    expect(syncContact).not.toHaveBeenCalled();
    expect(medicareBulkCredentialsReady(null).ok).toBe(false);
  });

  it("tallies synced / skipped / failed and uses the vault agent email", async () => {
    expect(
      tallyMedicareBulkRows([
        { contactId: "1", name: "A", status: "synced" },
        { contactId: "2", name: "B", status: "skipped", message: "Missing first or last name." },
        { contactId: "3", name: "C", status: "failed", message: "HealthSherpa returned 422." },
      ]),
    ).toEqual({
      synced: 1,
      skipped: 1,
      failed: 1,
      errors: [
        {
          contactId: "3",
          name: "C",
          code: "healthsherpa_error",
          message: "HealthSherpa returned 422.",
        },
      ],
    });

    const syncContact = vi.fn(async (input: { agentEmail: string; contact: { id: string; firstName: string } }) => {
      if (input.contact.id === "skip") {
        return { ok: false as const, code: "identity", message: "Add first and last name before syncing." };
      }
      if (input.contact.id === "fail") {
        return { ok: false as const, code: "healthsherpa_error", message: "HealthSherpa returned 500." };
      }
      return { ok: true as const, redirectUrl: null, contactId: "hs-1", message: "Contact synced." };
    });
    const sleep = vi.fn(async () => undefined);

    const result = await runMedicareContactBulkSync({
      loadCredentials: async () => ({
        apiKey: "partner-key",
        agentEmail: "vault-agent@agency.test",
        environment: "sandbox",
      }),
      listCandidates: async () => [
        {
          id: "ok",
          firstName: "Ada",
          lastName: "Lovelace",
          email: null,
          phone: null,
          dateOfBirth: null,
          mailingAddress: null,
          city: null,
          state: null,
          zip: null,
          source: "healthsherpa",
          sourceId: null,
          tags: [],
          healthNotes: null,
          status: "active",
          archivedAt: null,
          mergedIntoId: null,
        },
        {
          id: "skip",
          firstName: "",
          lastName: "",
          email: null,
          phone: null,
          dateOfBirth: null,
          mailingAddress: null,
          city: null,
          state: null,
          zip: null,
          source: "healthsherpa",
          sourceId: null,
          tags: ["medicare"],
          healthNotes: null,
          status: "active",
          archivedAt: null,
          mergedIntoId: null,
        },
        {
          id: "fail",
          firstName: "Grace",
          lastName: "Hopper",
          email: null,
          phone: null,
          dateOfBirth: null,
          mailingAddress: null,
          city: null,
          state: null,
          zip: null,
          source: "healthsherpa",
          sourceId: null,
          tags: [],
          healthNotes: null,
          status: "active",
          archivedAt: null,
          mergedIntoId: null,
        },
      ],
      syncContact: syncContact as never,
      sleep,
      persist: false,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "partial",
      synced: 1,
      skipped: 1,
      failed: 1,
      candidateCount: 3,
      configured: true,
    });
    expect(result.errors).toEqual([
      {
        contactId: "fail",
        name: "Grace Hopper",
        code: "healthsherpa_error",
        message: "HealthSherpa returned 500.",
      },
    ]);
    expect(syncContact).toHaveBeenCalledTimes(2);
    expect(syncContact.mock.calls[0]?.[0].agentEmail).toBe("vault-agent@agency.test");
    expect(sleep).toHaveBeenCalledWith(MEDICARE_BULK_RATE_LIMIT_MS);
  });

  it("fills blank client messages and keeps the first 20 errors on lastRun", async () => {
    expect(
      tallyMedicareBulkRows([
        { contactId: "blank", name: "Pat Lee", status: "failed", code: "", message: "" },
      ]).errors[0],
    ).toMatchObject({
      contactId: "blank",
      name: "Pat Lee",
      code: "healthsherpa_error",
      message: "HealthSherpa sync failed.",
    });

    const result = await runMedicareContactBulkSync({
      loadCredentials: async () => ({
        apiKey: "partner-key",
        agentEmail: "vault-agent@agency.test",
        environment: "sandbox",
      }),
      listCandidates: async () =>
        Array.from({ length: 22 }, (_, index) => ({
          id: `c${index}`,
          firstName: "Pat",
          lastName: `Lee${index}`,
          email: null,
          phone: null,
          dateOfBirth: null,
          mailingAddress: null,
          city: null,
          state: null,
          zip: null,
          source: "healthsherpa",
          sourceId: null,
          tags: ["medicare"],
          healthNotes: null,
          status: "active",
          archivedAt: null,
          mergedIntoId: null,
        })),
      syncContact: async () => ({ ok: false as const, code: "", message: "   " }),
      sleep: async () => undefined,
      persist: false,
    });
    expect(result.failed).toBe(22);
    expect(result.errors.every((error) => error.message.trim() && error.code.trim())).toBe(true);
    const lastRun = persistableMedicareBulkLastRun(result);
    expect(lastRun.errors).toHaveLength(MEDICARE_BULK_ONESHOT_ERROR_LIMIT);
    expect(lastRun.errors[0]?.name).toBe("Pat Lee0");
    expect(lastRun.errors[0]?.message).toBe("HealthSherpa sync failed.");
    const parsed = parseMedicareBulkOneshotState({
      hidden: false,
      lastRunAt: "2026-09-18T00:00:00.000Z",
      lastRun,
    });
    expect(parsed.lastRun?.errors).toHaveLength(20);
    expect(parsed.lastRun?.errors[0]?.name).toBe("Pat Lee0");
    expect(failedMedicareBulkMessages(parsed.lastRun ?? { errors: [] })[0]?.message).toMatch(/HealthSherpa/);
  });

  it("surfaces one auth banner when every row fails with the same 401/403/agent-email error", () => {
    const errors = [
      { contactId: "1", name: "Ada Lovelace", code: "http_401", message: "HealthSherpa HTTP 401: Unauthorized." },
      { contactId: "2", name: "Grace Hopper", code: "http_401", message: "HealthSherpa HTTP 401: Unauthorized." },
    ];
    expect(medicareBulkAuthBanner({ synced: 0, failed: 2, errors })).toBe(HEALTHSHERPA_MEDICARE_BULK_AUTH_BANNER);
    expect(
      medicareBulkAuthBanner({
        synced: 0,
        failed: 2,
        errors: [
          { contactId: "1", name: "Ada", message: "HealthSherpa HTTP 403: Forbidden." },
          { contactId: "2", name: "Grace", message: "HealthSherpa HTTP 403: Forbidden." },
        ],
      }),
    ).toBe(HEALTHSHERPA_MEDICARE_BULK_AUTH_BANNER);
    expect(
      medicareBulkAuthBanner({
        synced: 0,
        failed: 1,
        errors: [{ contactId: "1", name: "Ada", code: "agent_email", message: HEALTHSHERPA_AGENT_EMAIL_MISSING }],
      }),
    ).toBe(HEALTHSHERPA_MEDICARE_BULK_AUTH_BANNER);
    expect(
      medicareBulkAuthBanner({
        synced: 1,
        failed: 1,
        errors: [{ contactId: "1", name: "Ada", message: "HealthSherpa HTTP 401: Unauthorized." }],
      }),
    ).toBeNull();
    expect(
      medicareBulkAuthBanner({
        synced: 0,
        failed: 2,
        errors: [
          { contactId: "1", name: "Ada", message: "HealthSherpa HTTP 401: Unauthorized." },
          { contactId: "2", name: "Grace", message: "HealthSherpa HTTP 422: Invalid zip." },
        ],
      }),
    ).toBeNull();
  });

  it("turns a thrown contact sync into a failed row with a non-empty message", async () => {
    const result = await runMedicareContactBulkSync({
      loadCredentials: async () => ({
        apiKey: "partner-key",
        agentEmail: "vault-agent@agency.test",
        environment: "production",
      }),
      listCandidates: async () => [
        {
          id: "boom",
          firstName: "Ada",
          lastName: "Lovelace",
          email: null,
          phone: null,
          dateOfBirth: null,
          mailingAddress: null,
          city: null,
          state: null,
          zip: null,
          source: "healthsherpa",
          sourceId: null,
          tags: ["medicare"],
          healthNotes: null,
          status: "active",
          archivedAt: null,
          mergedIntoId: null,
        },
      ],
      syncContact: async () => {
        throw new Error("postgres://user:hunter2@db/ff");
      },
      sleep: async () => undefined,
      persist: false,
    });
    expect(result.failed).toBe(1);
    expect(result.errors[0]?.code).toBeTruthy();
    expect(result.errors[0]?.message).toBeTruthy();
    expect(JSON.stringify(result.errors)).not.toMatch(/hunter2/);
  });
});

describe("Medicare bulk one-shot UI + wiring", () => {
  it("labels the control one-time and shows not configured", () => {
    const html = renderToString(
      createElement(MedicareBulkSyncPanel, {
        ready: {
          hasApiKey: false,
          hasAgentEmail: false,
          configured: false,
          code: "not_configured",
          message: HEALTHSHERPA_KEYS_MISSING,
        },
        oneshot: { hidden: false, lastRunAt: null, lastRun: null },
      }),
    );
    expect(html).toContain(HEALTHSHERPA_MEDICARE_BULK_TITLE);
    expect(html).toContain("One-time / temporary");
    expect(html).toContain("data-ff-healthsherpa-medicare-bulk-not-configured");
    expect(html).toContain(HEALTHSHERPA_KEYS_MISSING);
    expect(html).toContain(HEALTHSHERPA_MEDICARE_BULK_FILTER);
  });

  it("renders persisted lastRun failed-row messages and the shared auth banner", () => {
    const html = renderToString(
      createElement(MedicareBulkSyncPanel, {
        ready: {
          hasApiKey: true,
          hasAgentEmail: true,
          configured: true,
          code: "ok",
          message: null,
        },
        oneshot: {
          hidden: false,
          lastRunAt: "2026-09-18T16:00:00.000Z",
          lastRun: {
            synced: 0,
            skipped: 0,
            failed: 57,
            code: "partial",
            message: "Finished with 57 failed of 57 matched.",
            candidateCount: 57,
            errors: [
              {
                contactId: "c1",
                name: "Ada Lovelace",
                code: "http_401",
                message: "HealthSherpa HTTP 401: Unauthorized.",
              },
              {
                contactId: "c2",
                name: "Grace Hopper",
                code: "http_401",
                message: "HealthSherpa HTTP 401: Unauthorized.",
              },
            ],
          },
        },
      }),
    );
    expect(html).toContain("data-ff-healthsherpa-medicare-bulk-errors");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Grace Hopper");
    expect(html).toContain("HealthSherpa HTTP 401: Unauthorized.");
    expect(html).toContain("data-ff-healthsherpa-medicare-bulk-auth-banner");
    expect(html).toContain(HEALTHSHERPA_MEDICARE_BULK_AUTH_BANNER);
    expect(html).toContain("Medicare vault key");
    expect(html).toContain("agent email");
    expect(html).toContain("sandbox versus production");
    expect(html).toContain("more failed");
    expect(html).toContain("55");
  });

  it("reuses contact sync + vault credentials and never hardcodes an agent email", () => {
    const bulk = source("src/lib/healthsherpa/bulk-medicare.ts");
    const sync = source("src/lib/healthsherpa/sync.ts");
    const action = source("src/app/actions/healthsherpa.ts");
    const panel = source("src/components/settings/medicare-bulk-sync-panel.tsx");
    expect(bulk).toMatch(/loadHealthSherpaMedicareCredentials/);
    expect(bulk).toMatch(/syncContactToHealthSherpa/);
    expect(sync).toMatch(/syncHealthSherpaContact/);
    expect(sync).toMatch(/external_id: input\.contact\.id/);
    expect(action).toMatch(/runMedicareContactBulkSync/);
    expect(bulk).not.toMatch(/session\.email/);
    expect(bulk).not.toMatch(/@fitfirst|javy@|fake@|test-agent@/i);
    expect(panel).toMatch(/One-time \/ temporary/);
    expect(panel).toMatch(/failedMedicareBulkMessages/);
    expect(panel).toMatch(/medicareBulkAuthBanner/);
    expect(panel).toMatch(/bulk-medicare-result/);
    expect(panel).not.toMatch(/from ["']@\/lib\/healthsherpa\/bulk-medicare["']/);
    expect(bulk).toMatch(/MEDICARE_BULK_ONESHOT_ERROR_LIMIT/);
    expect(bulk).toMatch(/persistableMedicareBulkLastRun/);
    expect(source("src/components/developer-hub/api-vault-panel.tsx")).toMatch(/MedicareBulkSyncPanel/);
    expect(source("src/components/settings/healthsherpa-card.tsx")).toMatch(/MedicareBulkSyncPanel/);
    expect(source("src/app/settings/developer-hub/api-vault/page.tsx")).toMatch(/describeMedicareBulkReady/);
    expect(bulk).not.toMatch(/console\.(log|info|debug|error)\([^)]*email/);
    expect(bulk).not.toMatch(/console\.(log|info|debug|error)\([^)]*apiKey/);
  });
});
