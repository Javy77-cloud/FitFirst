import { SavedToast } from "@/components/desk/saved-toast";

export function LeadSavedToast({ show }: { show: boolean }) {
  return <SavedToast show={show} message="Lead saved." listHref="/leads" />;
}
