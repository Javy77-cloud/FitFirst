import { AddressAutofill } from "@/components/address-autofill";
import { LineSelect } from "@/components/crm/line-select";
import { SourceSelect } from "@/components/crm/source-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_LANGUAGES } from "@/lib/crm/lead-fields";

export type LeadFieldDefaults = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  mailingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  insuranceTypeDesired?: string | null;
  source?: string | null;
  preferredLanguage?: string | null;
  notes?: string | null;
};

export function LeadFormFields({
  lead,
  requireName = true,
  hideLineSelect = false,
}: {
  lead?: LeadFieldDefaults;
  requireName?: boolean;
  /** Detail page uses line cards as the only lines-of-interest control. */
  hideLineSelect?: boolean;
}) {
  const language = lead?.preferredLanguage ?? "";
  const knownLanguage = LEAD_LANGUAGES.some((lang) => lang.value === language);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="firstName" className="text-xs">
            First name
          </Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={lead?.firstName ?? ""}
            required={requireName}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="middleName" className="text-xs">
            Middle name
          </Label>
          <Input id="middleName" name="middleName" defaultValue={lead?.middleName ?? ""} className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-xs">
            Last name
          </Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={lead?.lastName ?? ""}
            required={requireName}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="dateOfBirth" className="text-xs">
            Date of birth
          </Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={lead?.dateOfBirth ?? ""}
            className="mt-1 h-8"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3" data-ff-lead-contact-row>
        <div>
          <Label htmlFor="email" className="text-xs">
            Email
          </Label>
          <Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="phone" className="text-xs">
            Phone
          </Label>
          <Input id="phone" name="phone" defaultValue={lead?.phone ?? ""} className="mt-1 h-8" />
        </div>
      </div>
      <div
        className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_4.5rem_5.5rem] gap-2"
        data-ff-lead-address-row
      >
        <div className="min-w-0">
          <Label htmlFor="mailingAddress" className="text-xs">
            Address
          </Label>
          <AddressAutofill
            id="mailingAddress"
            name="mailingAddress"
            defaultValue={lead?.mailingAddress ?? ""}
            className="mt-1 h-8"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="city" className="text-xs">
            City
          </Label>
          <Input id="city" name="city" defaultValue={lead?.city ?? ""} className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="state" className="text-xs">
            State
          </Label>
          <Input id="state" name="state" defaultValue={lead?.state ?? "FL"} className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="zip" className="text-xs">
            ZIP
          </Label>
          <Input id="zip" name="zip" defaultValue={lead?.zip ?? ""} className="mt-1 h-8" />
        </div>
      </div>
      {hideLineSelect ? (
        <input type="hidden" name="insuranceTypeDesired" value={lead?.insuranceTypeDesired ?? "HO"} />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {hideLineSelect ? null : (
          <div>
            <Label htmlFor="insuranceTypeDesired" className="text-xs">
              Insurance type desired
            </Label>
            <LineSelect
              id="insuranceTypeDesired"
              name="insuranceTypeDesired"
              defaultValue={lead?.insuranceTypeDesired ?? "HO"}
            />
          </div>
        )}
        <SourceSelect defaultValue={lead?.source ?? "manual"} />
        <div>
          <Label htmlFor="preferredLanguage" className="text-xs">
            Preferred language
          </Label>
          <select
            id="preferredLanguage"
            name="preferredLanguage"
            defaultValue={language}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">None</option>
            {LEAD_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
            {!knownLanguage && language ? <option value={language}>{language}</option> : null}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes" className="text-xs">
            Notes
          </Label>
          <Textarea id="notes" name="notes" defaultValue={lead?.notes ?? ""} className="mt-1 min-h-20" />
        </div>
      </div>
    </div>
  );
}
