import { Label } from "@/components/ui/label";
import {
  LEARNING_POOL_CONSENT_HELP,
  LEARNING_POOL_CONSENT_LABEL,
  LEARNING_POOL_TERMS_VERSION,
  ONBOARDING_CONSENT_FIELD,
} from "@/lib/onboarding";
import { isLearningPoolConsentLive } from "@/lib/learning-pipeline/flags";

type Props = {
  /** When omitted, the live flag is read from the environment (default off). */
  consentLive?: boolean;
};

/** Dormant until purchase. Default unchecked. Opt-in only. */
export function LearningConsentCheckbox({
  consentLive = isLearningPoolConsentLive(),
}: Props) {
  return (
    <div
      data-ff-learning-consent
      data-consent-live={consentLive ? "on" : "off"}
      data-terms-version={LEARNING_POOL_TERMS_VERSION}
      className="rounded-lg border border-border bg-card p-4"
    >
      <Label className="items-start gap-3 font-normal">
        <input
          type="checkbox"
          name={ONBOARDING_CONSENT_FIELD}
          value="1"
          defaultChecked={false}
          disabled={!consentLive}
          className="mt-0.5"
          aria-describedby="learning-consent-help"
        />
        <span>
          <span className="block text-sm font-medium text-navy">{LEARNING_POOL_CONSENT_LABEL}</span>
          <span id="learning-consent-help" className="mt-1 block text-sm text-muted-foreground">
            {consentLive
              ? LEARNING_POOL_CONSENT_HELP
              : "Dormant until purchase. The box stays off. Raw data stays in your agency. You still get the seed library."}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Terms {LEARNING_POOL_TERMS_VERSION}
          </span>
        </span>
      </Label>
    </div>
  );
}
