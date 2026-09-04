import { LineSelect } from "@/components/crm/line-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_LANGUAGES, LEAD_SOURCES } from "@/lib/crm/lead-fields";

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
}: {
  lead?: LeadFieldDefaults;
  requireName?: boolean;
}) {
  const source = lead?.source ?? "manual";
  const knownSource = (LEAD_SOURCES as readonly string[]).includes(source);
  const language = lead?.preferredLanguage ?? "en";
  const knownLanguage = LEAD_LANGUAGES.some((lang) => lang.value === language);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
      <div className="sm:col-span-2">
        <Label htmlFor="mailingAddress" className="text-xs">
          Address
        </Label>
        <Input
          id="mailingAddress"
          name="mailingAddress"
          defaultValue={lead?.mailingAddress ?? ""}
          className="mt-1 h-8"
        />
      </div>
      <div>
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
      <div>
        <Label htmlFor="source" className="text-xs">
          Source
        </Label>
        <select
          id="source"
          name="source"
          defaultValue={source}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {LEAD_SOURCES.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
          {!knownSource ? <option value={source}>{source.replaceAll("_", " ")}</option> : null}
        </select>
      </div>
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
  );
}
