import type { DocumentPipelineStatus } from "./types";

export function pipelineStatusFromEnvelope(
  status: "sent" | "viewed" | "completed" | null | undefined,
  fallback: DocumentPipelineStatus = "sent",
): DocumentPipelineStatus {
  if (status === "completed") return "completed";
  if (status === "viewed") return "viewed";
  if (status === "sent") return "sent";
  return fallback === "out_for_signature" ? "sent" : fallback;
}

export function envelopeTimestamps(status: "sent" | "viewed" | "completed" | null | undefined, now = new Date()) {
  return {
    envelopeSentAt: status === "sent" || status === "viewed" || status === "completed" ? now : undefined,
    envelopeViewedAt: status === "viewed" || status === "completed" ? now : undefined,
    envelopeCompletedAt: status === "completed" ? now : undefined,
  };
}
