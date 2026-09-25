import { listDocumentPipelineJobs } from "@/lib/document-pipeline/store";
import { letterStatusChipClass, letterStatusLabel } from "@/lib/document-pipeline/status";
import {
  DOCUMENT_PIPELINE_TYPE_LABELS,
  isDocumentPipelineJobType,
  isDocumentPipelineStatus,
} from "@/lib/document-pipeline/types";
import { cn } from "@/lib/utils";

export async function DealFormSends({ dealId }: { dealId: string }) {
  const jobs = await listDocumentPipelineJobs(dealId).catch(() => []);
  if (jobs.length === 0) return null;
  return (
    <section className="ff-card p-3" data-ff-form-sends="">
      <h3 className="mb-2 text-sm font-semibold text-navy">Form sends</h3>
      <ul className="space-y-1.5">
        {jobs.slice(0, 6).map((job) => {
          if (!isDocumentPipelineJobType(job.type) || !isDocumentPipelineStatus(job.status)) return null;
          return (
            <li key={job.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-navy">{DOCUMENT_PIPELINE_TYPE_LABELS[job.type]}</span>
              <span
                className={cn(
                  "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  letterStatusChipClass(job.status),
                )}
              >
                {letterStatusLabel(job.status)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
