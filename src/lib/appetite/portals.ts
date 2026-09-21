export type PortalQuoteRequest = {
  carrierId: string;
  dealId: string;
  riskId: string;
};

/** A question the carrier page asked during a quote pull. */
export type PortalObservedQuestion = {
  question: string;
  options?: string[];
  url?: string;
  selector?: string;
};

export type PortalQuoteResult = {
  status: "not_implemented";
  message: string;
  /**
   * Carrier prompts seen on this pull. Auto shop logs the ones that are not
   * already on the Auto risk profile (data/quote-bot/auto-question-gaps.json).
   */
  observedQuestions?: PortalObservedQuestion[];
};

export interface CarrierPortalAdapter {
  id: string;
  name: string;
  submitQuote(input: PortalQuoteRequest): Promise<PortalQuoteResult>;
}

export class EmptyPortalAdapter implements CarrierPortalAdapter {
  constructor(
    public id: string,
    public name: string,
  ) {}

  async submitQuote(_input: PortalQuoteRequest): Promise<PortalQuoteResult> {
    return {
      status: "not_implemented",
      message:
        "Carrier portal automation is behind this interface only. No login or submit is wired.",
    };
  }
}

export function portalFor(carrierId: string, name: string): CarrierPortalAdapter {
  return new EmptyPortalAdapter(carrierId, name);
}
