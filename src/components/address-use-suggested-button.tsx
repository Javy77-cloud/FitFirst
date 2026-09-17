import { Check } from "lucide-react";
import {
  ADDRESS_USE_SUGGESTED_LABEL,
  addressUseSuggestedButtonClassName,
} from "@/lib/address/use-suggested-button";

export function AddressUseSuggestedButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      data-ff-address-use-suggested
      className={addressUseSuggestedButtonClassName()}
      onClick={onClick}
    >
      <Check className="size-3.5" aria-hidden />
      {ADDRESS_USE_SUGGESTED_LABEL}
    </button>
  );
}
