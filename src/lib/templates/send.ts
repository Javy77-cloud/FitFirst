import { and, eq, lte } from "drizzle-orm";
import { DEFAULT_TENANT_ID, EMAIL_JOB_HOLD, type SendFromProvider } from "@/lib/domain";
import { db } from "@/lib/db";
import { clientHistory, contacts, emailSendJobs, emailTemplates } from "@/lib/db/schema";
import { jobBlockedByChosenDrop } from "@/lib/templates/revision";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import { sendThroughConnectedInbox } from "./connectors";
import { isProtectedAnaContact } from "./locale";

export async function processDueEmailJobs(now = new Date(), tenantId = DEFAULT_TENANT_ID) {
  const due = await db
    .select()
    .from(emailSendJobs)
    .where(
      and(
        eq(emailSendJobs.tenantId, tenantId),
        eq(emailSendJobs.status, "queued"),
        lte(emailSendJobs.scheduledFor, now),
      ),
    );

  let sent = 0;
  let queued = 0;
  let failed = 0;

  for (const job of due) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.id, job.contactId ?? "")));

    if (!contact || contact.id === CONTACT_ID || isProtectedAnaContact(contact)) {
      await db
        .update(emailSendJobs)
        .set({
          status: "failed",
          lastError: "blocked: do not email Ana",
          holdReason: null,
          attemptCount: job.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(emailSendJobs.id, job.id));
      failed += 1;
      continue;
    }

    if (job.templateId) {
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(and(eq(emailTemplates.tenantId, tenantId), eq(emailTemplates.id, job.templateId)));
      const templateBody = (template?.bodyEn || template?.body || "").trim();
      if (
        template &&
        jobBlockedByChosenDrop({
          slug: template.slug,
          jobBody: job.body,
          templateBody,
        })
      ) {
        await db
          .update(emailSendJobs)
          .set({
            status: "failed",
            lastError: "blocked: template dropped",
            holdReason: null,
            attemptCount: job.attemptCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(emailSendJobs.id, job.id));
        failed += 1;
        continue;
      }
    }

    if (!job.toEmail) {
      await db
        .update(emailSendJobs)
        .set({
          status: "queued",
          holdReason: "missing_contact_email",
          lastError: "Contact has no email",
          attemptCount: job.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(emailSendJobs.id, job.id));
      queued += 1;
      continue;
    }

    const result = await sendThroughConnectedInbox({
      provider: job.sendFromProvider as SendFromProvider,
      to: job.toEmail,
      subject: job.subject ?? "",
      body: job.body ?? "",
    });

    if (result.ok) {
      await db
        .update(emailSendJobs)
        .set({
          status: "sent",
          holdReason: null,
          lastError: null,
          sentAt: new Date(),
          attemptCount: job.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(emailSendJobs.id, job.id));
      await db.insert(clientHistory).values({
        tenantId,
        contactId: job.contactId,
        dealId: job.dealId,
        policyId: job.policyId,
        eventType: "email_sent",
        body: `Sent “${job.subject}” to ${job.toEmail} via ${job.sendFromProvider} (${result.detail}).`,
        occurredAt: new Date(),
      });
      sent += 1;
      continue;
    }

    if (result.queued) {
      await db
        .update(emailSendJobs)
        .set({
          status: "queued",
          holdReason: EMAIL_JOB_HOLD,
          lastError: result.detail,
          attemptCount: job.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(emailSendJobs.id, job.id));
      queued += 1;
      continue;
    }

    await db
      .update(emailSendJobs)
      .set({
        status: "failed",
        holdReason: null,
        lastError: result.detail,
        attemptCount: job.attemptCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(emailSendJobs.id, job.id));
    await db.insert(clientHistory).values({
      tenantId,
      contactId: job.contactId,
      dealId: job.dealId,
      policyId: job.policyId,
      eventType: "email_failed",
      body: `Failed “${job.subject}” to ${job.toEmail}: ${result.detail}.`,
      occurredAt: new Date(),
    });
    failed += 1;
  }

  return { sent, queued, failed, scanned: due.length };
}
