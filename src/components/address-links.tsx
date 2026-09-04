import { ExternalLink } from "lucide-react";
import {
  formatPropertyAddress,
  propertyAddressLinks,
  type PropertyAddressInput,
} from "@/lib/address-links";
import { cn } from "@/lib/utils";

export function PropertyAddressLinks({
  address,
  className,
}: {
  address: PropertyAddressInput;
  className?: string;
}) {
  const links = propertyAddressLinks(address);
  if (!links) return null;

  return (
    <span className={cn("ff-address-links", className)}>
      <a href={links.zillow} target="_blank" rel="noopener">
        <ExternalLink aria-hidden />
        Zillow
      </a>
      <a href={links.femaFlood} target="_blank" rel="noopener">
        <ExternalLink aria-hidden />
        FEMA flood
      </a>
    </span>
  );
}

export function PropertyAddressLine({
  address,
  className,
}: {
  address: PropertyAddressInput;
  className?: string;
}) {
  const formatted = formatPropertyAddress(address);
  if (!formatted) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span>{formatted}</span>
      <PropertyAddressLinks address={address} />
    </span>
  );
}
