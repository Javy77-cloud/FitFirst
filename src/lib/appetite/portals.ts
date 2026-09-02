export type PortalQuoteRequest = {
  carrierId: string;
  dealId: string;
  riskId: string;
};

export type PortalQuoteResult = {
  status: "not_implemented";
  message: string;
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
