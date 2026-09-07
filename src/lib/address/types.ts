export type ParsedAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  country: string;
};

export type AddressSuggestion = {
  id: string;
  label: string;
  address: ParsedAddress;
};

export type AddressFillMap = {
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
};

export const EMPTY_ADDRESS: ParsedAddress = {
  street: "",
  city: "",
  state: "",
  zip: "",
  county: "",
  country: "US",
};

export function formatAddressLine(address: ParsedAddress): string {
  const cityStateZip = [address.city, [address.state, address.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [address.street, cityStateZip].filter(Boolean).join(", ");
}

export function addressIsComplete(address: ParsedAddress): boolean {
  return Boolean(address.street && address.city && address.state && address.zip);
}
