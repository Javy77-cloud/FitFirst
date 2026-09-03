/**
 * Single desk funnel — CRM UI and lifecycle-wiring share these hooks.
 * Do not add a second bind or policy-create path.
 *
 * Lead (or dec drop) → Deal → finalized quotes attach PDFs on the Deal
 * → Bind → Contact (personal) or Business (commercial) → one Policy per line.
 */
export { attachFinalizedQuotePdfs } from "@/lib/crm/quote-docs";
export {
  QUOTE_CREATES_POLICY,
  defaultAccountKind,
  planBind,
} from "@/lib/crm/bind";
