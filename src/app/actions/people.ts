"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAdminAction } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { alerts, deskMessages, users } from "@/lib/db/schema";
import { ADMIN_USER_ID } from "@/lib/fixtures/ids";
import { flagsForStatus, normalizeAccessStatus } from "@/lib/people/status";
import { parsePrivilegeForm } from "@/lib/people/privileges";
import { ensureDeskAgentRow, findPersonByLogin, getPerson } from "@/lib/people/store";
import {
  emailFromUsername,
  invitePath,
  isTokenLive,
  newDeskToken,
  normalizeLogin,
  resetPath,
  tokenExpiresAt,
  usernameFromEmail,
} from "@/lib/people/tokens";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidatePeople(id?: string) {
  revalidatePath("/settings");
  revalidatePath("/settings/agents");
  revalidatePath("/alerts");
  if (id) {
    revalidatePath(`/settings/agents/${id}`);
    revalidatePath(`/settings/agents/${id}/performance`);
  }
}

function slugFor(username: string, id: string) {
  const base = username.replace(/[^a-z0-9-]/g, "") || "agent";
  return `${base}-${id.slice(0, 8)}`.slice(0, 40);
}

export async function createAgent(formData: FormData) {
  const session = await requireAdminAction();
  const name = str(formData, "name");
  const login = normalizeLogin(str(formData, "username") || str(formData, "email"));
  const emailRaw = normalizeLogin(str(formData, "email"));
  const role = str(formData, "role") === "admin" ? "admin" : "agent";
  if (!name) redirect("/settings/agents?error=name");
  if (!login) redirect("/settings/agents?error=login");

  const email = emailRaw.includes("@") ? emailRaw : emailFromUsername(login);
  const username = login.includes("@") ? usernameFromEmail(login) : login;
  const taken = await findPersonByLogin(email);
  const takenUser = await findPersonByLogin(username);
  if (taken || takenUser) redirect("/settings/agents?error=taken");

  const privileges = parsePrivilegeForm(formData);
  const token = newDeskToken();
  const [row] = await db
    .insert(users)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      name,
      email,
      username,
      role,
      passwordHash: null,
      ...flagsForStatus("active"),
      canAccessModules: privileges.canAccessModules,
      canSeeAgencyWidgets: role === "admin" ? true : privileges.canSeeAgencyWidgets,
      officeLabel: str(formData, "officeLabel") || null,
      territoryLabel: str(formData, "territoryLabel") || null,
      mustSetPassword: true,
      inviteToken: token,
      inviteExpiresAt: tokenExpiresAt(),
      meetingAddress: str(formData, "officeLabel") || null,
    })
    .returning();
  if (!row) redirect("/settings/agents?error=create");

  await ensureDeskAgentRow({
    id: row.id,
    slug: slugFor(username, row.id),
    displayName: name,
    role,
  });

  revalidatePeople(row.id);
  redirect(`/settings/agents/${row.id}?created=1&invite=${encodeURIComponent(invitePath(token))}`);
  void session;
}

async function loadTarget(id: string) {
  if (!isUuid(id)) throw new Error("Unknown agent.");
  const person = await getPerson(id);
  if (!person) throw new Error("Unknown agent.");
  return person;
}

export async function setAgentStatus(formData: FormData) {
  const session = await requireAdminAction();
  const id = str(formData, "userId");
  const next = normalizeAccessStatus(str(formData, "status"));
  const person = await loadTarget(id);
  if (person.id === session.userId && next !== "active") {
    redirect(`/settings/agents/${id}?error=self`);
  }
  if (person.id === ADMIN_USER_ID && next === "removed") {
    redirect(`/settings/agents/${id}?error=javy`);
  }
  const flags = flagsForStatus(next);
  await db
    .update(users)
    .set({
      ...flags,
      updatedAt: new Date(),
    })
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  revalidatePeople(id);
  redirect(`/settings/agents/${id}?status=${next}`);
}

export async function saveAgentPrivileges(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "userId");
  await loadTarget(id);
  const privileges = parsePrivilegeForm(formData);
  await db
    .update(users)
    .set({
      canAccessModules: privileges.canAccessModules,
      canSeeAgencyWidgets: privileges.canSeeAgencyWidgets,
      officeLabel: str(formData, "officeLabel") || null,
      territoryLabel: str(formData, "territoryLabel") || null,
      updatedAt: new Date(),
    })
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  revalidatePeople(id);
  redirect(`/settings/agents/${id}?saved=1`);
}

export async function notifyAgent(formData: FormData) {
  const session = await requireAdminAction();
  const id = str(formData, "userId");
  const person = await loadTarget(id);
  const body = str(formData, "body");
  if (!body) redirect(`/settings/agents/${id}?error=message`);
  await db.insert(deskMessages).values({
    tenantId: DEFAULT_TENANT_ID,
    fromUserId: session.userId ?? ADMIN_USER_ID,
    toUserId: person.id,
    body,
  });
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "desk_message",
    title: `${session.name} sent a desk note to ${person.name}`,
    body,
    severity: "info",
    entityType: "user",
    entityId: person.id,
    recipientUserId: person.id,
  });
  revalidatePeople(id);
  redirect(`/settings/agents/${id}?notified=1`);
}

export async function issueInviteLink(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "userId");
  await loadTarget(id);
  const token = newDeskToken();
  await db
    .update(users)
    .set({
      mustSetPassword: true,
      inviteToken: token,
      inviteExpiresAt: tokenExpiresAt(),
      updatedAt: new Date(),
    })
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  revalidatePeople(id);
  redirect(`/settings/agents/${id}?invite=${encodeURIComponent(invitePath(token))}`);
}

export async function issuePasswordReset(formData: FormData) {
  await requireAdminAction();
  const id = str(formData, "userId");
  await loadTarget(id);
  const token = newDeskToken();
  await db
    .update(users)
    .set({
      mustSetPassword: true,
      resetToken: token,
      resetExpiresAt: tokenExpiresAt(),
      updatedAt: new Date(),
    })
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.id, id)));
  revalidatePeople(id);
  redirect(`/settings/agents/${id}?reset=${encodeURIComponent(resetPath(token))}`);
}

export async function completeInvitePassword(formData: FormData) {
  const token = str(formData, "token");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token) redirect("/login?error=invite");
  if (password.length < 4 || password !== confirm) redirect(`/login/invite?token=${encodeURIComponent(token)}&error=password`);
  const [person] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.inviteToken, token)));
  if (!person || !isTokenLive(person.inviteToken, person.inviteExpiresAt)) {
    redirect("/login?error=invite");
  }
  if (normalizeAccessStatus(person.accessStatus) !== "active") {
    redirect("/login?error=frozen");
  }
  await db
    .update(users)
    .set({
      passwordHash: hashPassword(password),
      mustSetPassword: false,
      inviteToken: null,
      inviteExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, person.id));
  redirect("/login?set=1");
}

export async function completeResetPassword(formData: FormData) {
  const token = str(formData, "token");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token) redirect("/login?error=reset");
  if (password.length < 4 || password !== confirm) redirect(`/login/reset?token=${encodeURIComponent(token)}&error=password`);
  const [person] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.resetToken, token)));
  if (!person || !isTokenLive(person.resetToken, person.resetExpiresAt)) {
    redirect("/login?error=reset");
  }
  if (normalizeAccessStatus(person.accessStatus) !== "active") {
    redirect("/login?error=frozen");
  }
  await db
    .update(users)
    .set({
      passwordHash: hashPassword(password),
      mustSetPassword: false,
      resetToken: null,
      resetExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, person.id));
  redirect("/login?set=1");
}
