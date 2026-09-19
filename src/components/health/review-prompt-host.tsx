import { currentDeskSession } from "@/lib/auth/session";
import { loadPendingReviewPrompt } from "@/lib/health/pending-review";
import { ExperienceReviewPrompt } from "@/components/health/review-prompt";

export async function ExperienceReviewHost() {
  try {
    const session = await currentDeskSession();
    if (!session.signedIn) return null;
    const prompt = await loadPendingReviewPrompt(session.userId);
    if (!prompt) return null;
    return <ExperienceReviewPrompt prompt={prompt} />;
  } catch {
    // Mini-review is optional chrome. A missing table, null date, or query miss
    // must never take down AppShell (login-after-auth black screen).
    return null;
  }
}
