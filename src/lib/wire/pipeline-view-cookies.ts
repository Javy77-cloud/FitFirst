/** Cookie names for List|Grid|Board|Funnel defaults — not server actions. */
export const PIPELINE_VIEW_COOKIE = "ff_pipeline_view" as const;
export const RENEWALS_VIEW_COOKIE = "ff_renewals_view" as const;
export type PipelineViewCookie = typeof PIPELINE_VIEW_COOKIE | typeof RENEWALS_VIEW_COOKIE;
