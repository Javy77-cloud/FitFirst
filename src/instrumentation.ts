export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureExperienceReviewsTable } = await import("@/lib/db/ensure-experience-reviews");
    await ensureExperienceReviewsTable();
  } catch (error) {
    console.error("[pulse] boot ensure experience_reviews failed", error);
  }
}
