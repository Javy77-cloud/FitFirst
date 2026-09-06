import { extractZohoOwner, type ZohoOwnerRef } from "./owners";
import type { ZohoModule, ZohoRecord } from "./types";
import {
  asBool,
  asDate,
  asDateOnly,
  asNumber,
  asStringList,
  asText,
  firstText,
  isSystemZohoField,
  lookupId,
  lookupName,
  parseTermMonths,
  presentKeys,
  splitName,
} from "./values";

export type MappedContact = {
  zohoId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  dateOfBirth: string | null;
  preferredLanguage: string | null;
  maritalStatus: string | null;
  notes: string | null;
  clientStatus: string | null;
  emailOptOut: boolean;
  smsOptOut: boolean;
  tenureStart: Date | null;
  accountZohoId: string | null;
  owner: ZohoOwnerRef;
  createdBy: ZohoOwnerRef;
  unmatched: string[];
};

export type MappedAccount = {
  zohoId: string;
  name: string;
  legalName: string | null;
  dba: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  primaryAddress1: string | null;
  primaryCity: string | null;
  primaryState: string | null;
  primaryZip: string | null;
  notes: string | null;
  fein: string | null;
  employeeCount: number | null;
  annualSales: string | null;
  payrollTotal: string | null;
  yearsInBusiness: number | null;
  wcClassCode: string | null;
  operations: string | null;
  clientSince: Date | null;
  officerZohoId: string | null;
  unmatched: string[];
};

export type MappedLead = {
  zohoId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  mailingAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  dateOfBirth: string | null;
  insuranceTypeDesired: string | null;
  preferredLanguage: string | null;
  convertedDealZohoId: string | null;
  owner: ZohoOwnerRef;
  createdBy: ZohoOwnerRef;
  unmatched: string[];
};

export type MappedDeal = {
  zohoId: string;
  title: string;
  pipelineStage: string;
  lineOfBusiness: string;
  accountKind: string;
  bindTarget: string;
  state: string;
  notes: string | null;
  quoteResultsNote: string | null;
  coverageAmount: number | null;
  currentCarrier: string | null;
  contactZohoId: string | null;
  accountZohoId: string | null;
  wonAt: Date | null;
  owner: ZohoOwnerRef;
  createdBy: ZohoOwnerRef;
  unmatched: string[];
};

export type MappedVendor = {
  zohoId: string;
  name: string;
  phone: string | null;
  website: string | null;
  portalUrl: string | null;
  agencyCode: string | null;
  appetiteNotes: string | null;
  dontWriteNotes: string | null;
  carrierInfo: string | null;
  writtenLines: string[];
  appointmentStatus: string | null;
  sellingAgency: string | null;
  unmatched: string[];
};

export type MappedPolicy = {
  zohoId: string;
  policyNumber: string;
  lineOfBusiness: string;
  formType: string | null;
  policyType: string | null;
  policySubType: string | null;
  insuranceType: string | null;
  status: string;
  effectiveDate: Date;
  expirationDate: Date;
  premium: string | null;
  gwp: string | null;
  billingFrequency: string | null;
  premiumFrequency: string | null;
  termMonths: number;
  sellingAgency: string | null;
  notes: string | null;
  producer: string | null;
  contactZohoId: string | null;
  accountZohoId: string | null;
  dealZohoId: string | null;
  carrierZohoId: string | null;
  carrierName: string | null;
  commission4Pct: string | null;
  numberOfInsured: number | null;
  oepStart: Date | null;
  owner: ZohoOwnerRef;
  createdBy: ZohoOwnerRef;
  unmatched: string[];
};

export type MappedTask = {
  zohoId: string;
  title: string;
  notes: string | null;
  status: string;
  dueAt: Date | null;
  contactZohoId: string | null;
  relatedZohoId: string | null;
  relatedName: string | null;
  unmatched: string[];
};

const CONTACT_MAPPED = [
  "First_Name",
  "Last_Name",
  "Email",
  "Mobile",
  "Phone",
  "Work_Phone",
  "Date_of_Birth",
  "Address",
  "Address_Street_Address",
  "Address_City",
  "Address_State_Province",
  "Address_Zip_Postal_Code",
  "Preferred_Language",
  "Marital_Status",
  "Client_Status",
  "Client_Since",
  "Email_Opt_Out",
  "SMS_Opt_Out",
  "Phone_Opt_Out",
  "Account_Name",
  "Description",
  "Other_Household_Info",
  "Nickname",
];

const ACCOUNT_MAPPED = [
  "Account_Name",
  "DBA",
  "Business_Email",
  "Email",
  "Office_Phone",
  "Cell_Phone",
  "Phone",
  "Website",
  "Description",
  "FEIN",
  "Full_Time_Employees",
  "Total_Yearly_Sales",
  "Total_Annual_Payroll",
  "Years_in_Business",
  "Workers_Comp_Class_Code",
  "Claims_Summary",
  "Industry1",
  "Client_Since",
  "Primary_Contact",
  "Mailing_Address",
  "Mailing_Address_Street_Address",
  "Mailing_Address_City",
  "Mailing_Address_State_Province",
  "Mailing_Address_Zip_Postal_Code",
  "Address_1",
  "Address_1_Street_Address",
  "Address_1_City",
  "Address_1_State_Province",
  "Address_1_Zip_Postal_Code",
];

const LEAD_MAPPED = [
  "First_Name",
  "Middle_Name",
  "Last_Name",
  "Email",
  "Phone",
  "Mobile",
  "Lead_Status",
  "Lead_Source1",
  "Data_Source",
  "Description",
  "Other_Details",
  "Property_Details",
  "DOB",
  "Preferred_Language",
  "Product_Interest",
  "Existing_Coverage_Type",
  "Converted_Deal",
  "Mailing_Address",
  "Mailing_Address_Street_Address",
  "Mailing_Address_City",
  "Mailing_Address_State_Province",
  "Mailing_Address_Zip_Postal_Code",
  "Address_1_Street_Address",
  "Address_1_City",
  "Address_1_State_Province",
  "Address_1_Zip_Postal_Code",
  "City",
];

const DEAL_MAPPED = [
  "Deal_Name",
  "Stage",
  "Pipeline",
  "Description",
  "Quote_Notes",
  "Property_Details",
  "Contact_Name",
  "Account_Name",
  "Coverage_Amount",
  "Amount",
  "Current_Carrier",
  "Type_of_Insurance",
  "HO_Policy_Form",
  "Won_Date",
  "Quoted_Premium",
  "Quoted_Carrier",
];

const VENDOR_MAPPED = [
  "Vendor_Name",
  "Phone",
  "Email",
  "Street",
  "City",
  "State",
  "Zip_Code",
  "Description",
  "Carrier_Portal",
  "Website",
  "Agency_Code",
  "Apetite",
  "Appetite_URL",
  "Carrier_Notes",
  "Does_Not_Write",
  "Written_Lines",
  "Appointment_Status",
  "Selling_Agency",
];

const POLICY_MAPPED = [
  "Name",
  "Policy_Number",
  "Status",
  "Policy_Type",
  "Policy_Sub_Type",
  "Insurance_Type",
  "Effective_Date",
  "Policy_Term",
  "AFA_P_C_Annual_Premium",
  "Gross_Written_Premium",
  "Premium_Frequency",
  "Selling_Agency",
  "Policy_Notes",
  "Contact",
  "Insured_1",
  "Business",
  "Related_Deal",
  "Source_Deal",
  "Writing_Carrier",
  "Commission4",
  "Number_of_Insured",
  "Open_Enrollment_Start",
  "X_Date",
];

const TASK_MAPPED = [
  "Subject",
  "Description",
  "Status",
  "Due_Date",
  "Who_Id",
  "What_Id",
  "Priority",
];

function unmatchedOf(record: ZohoRecord, mapped: string[]): string[] {
  const mappedSet = new Set(mapped);
  return presentKeys(record).filter((key) => !isSystemZohoField(key) && !mappedSet.has(key));
}

function mapLeadStatus(raw: string | null): string {
  const text = (raw ?? "").toLowerCase();
  if (!text) return "new";
  if (text.includes("convert")) return "converted";
  if (text.includes("progress")) return "qualified";
  if (text.includes("recycl")) return "lost";
  if (text.includes("qualif")) return "qualified";
  if (text.includes("contact")) return "contacted";
  if (text.includes("lost") || text.includes("junk") || text.includes("unqual")) return "lost";
  return "new";
}

export function mapDealStage(raw: string | null): string {
  const text = (raw ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (text.includes("closed_won") || text === "won" || text.includes("bound")) return "closed_won";
  if (text.includes("closed_lost") || text === "lost") return "closed_lost";
  if (text.includes("quote_sent") || text.includes("proposal")) return "quote_sent";
  if (text.includes("quot")) return "quoting";
  if (text.includes("compar")) return "comparing";
  if (text.includes("archiv")) return "archive";
  return "shopping";
}

function mapPolicyStatus(raw: string | null): string {
  const text = (raw ?? "").toLowerCase();
  if (text.includes("pend")) return "pending";
  if (text.includes("bound")) return "bound";
  if (text.includes("cancel")) return "cancelled";
  if (text.includes("expir") || text.includes("lapse")) return "expired";
  if (text.includes("non") && text.includes("renew")) return "nonrenewed";
  return "active";
}

function mapLineOfBusiness(parts: Array<string | null>): string {
  const blob = parts.filter(Boolean).join(" ").toLowerCase();
  if (/\bauto|personal auto|pap\b/.test(blob)) return "AUTO";
  if (/\bflood|nfip\b/.test(blob)) return "FLOOD";
  if (/\bumbrella|excess\b/.test(blob)) return "UMBRELLA";
  if (/\bwc|workers.?comp/.test(blob)) return "WC";
  if (/\bbop\b/.test(blob)) return "BOP";
  if (/\bgl|general liability\b/.test(blob)) return "GL";
  if (/\blife\b/.test(blob)) return "LIFE";
  if (/\bhealth|medicare|supple/.test(blob)) return "HEALTH";
  if (/\brv\b/.test(blob)) return "RV";
  if (/\bdp|dwelling\b/.test(blob)) return "DP";
  if (/\bho3|ho-3|homeowners|home\b/.test(blob)) return "HO";
  if (/\bcommercial\b/.test(blob)) return "GL";
  return "HO";
}

function mapAccountKind(line: string, policyType: string | null): string {
  const blob = `${line} ${policyType ?? ""}`.toLowerCase();
  if (/\bgl|bop|wc|commercial\b/.test(blob)) return "commercial";
  return "personal";
}

function mapTaskStatus(raw: string | null): string {
  const text = (raw ?? "").toLowerCase();
  if (text.includes("complete") || text.includes("done") || text.includes("closed")) return "completed";
  if (text.includes("defer") || text.includes("wait")) return "waiting";
  return "open";
}

export function mapContact(record: ZohoRecord, zohoId: string): MappedContact {
  const split = splitName(firstText(record, ["Full_Name"]));
  return {
    zohoId,
    firstName: firstText(record, ["First_Name"]) ?? split.first,
    lastName: firstText(record, ["Last_Name"]) ?? split.last,
    email: firstText(record, ["Email"]),
    phone: firstText(record, ["Mobile", "Phone", "Work_Phone"]),
    mailingAddress: firstText(record, ["Address_Street_Address", "Address"]),
    city: firstText(record, ["Address_City"]),
    state: firstText(record, ["Address_State_Province"]),
    zip: firstText(record, ["Address_Zip_Postal_Code"]),
    dateOfBirth: asDateOnly(record.Date_of_Birth),
    preferredLanguage: firstText(record, ["Preferred_Language"]),
    maritalStatus: firstText(record, ["Marital_Status"]),
    notes: firstText(record, ["Description", "Other_Household_Info"]),
    clientStatus: firstText(record, ["Client_Status"]),
    emailOptOut: asBool(record.Email_Opt_Out) ?? false,
    smsOptOut: asBool(record.SMS_Opt_Out) ?? asBool(record.Phone_Opt_Out) ?? false,
    tenureStart: asDate(record.Client_Since),
    accountZohoId: lookupId(record.Account_Name),
    owner: extractZohoOwner(record),
    createdBy: extractZohoOwner(record, "Created_By"),
    unmatched: unmatchedOf(record, CONTACT_MAPPED),
  };
}

export function mapAccount(record: ZohoRecord, zohoId: string): MappedAccount {
  const name = firstText(record, ["Account_Name"]) ?? "Unnamed business";
  return {
    zohoId,
    name,
    legalName: name,
    dba: firstText(record, ["DBA"]),
    email: firstText(record, ["Business_Email", "Email"]),
    phone: firstText(record, ["Office_Phone", "Cell_Phone", "Phone"]),
    website: firstText(record, ["Website"]),
    mailingAddress: firstText(record, ["Mailing_Address_Street_Address", "Mailing_Address"]),
    city: firstText(record, ["Mailing_Address_City"]),
    state: firstText(record, ["Mailing_Address_State_Province"]),
    zip: firstText(record, ["Mailing_Address_Zip_Postal_Code"]),
    primaryAddress1: firstText(record, ["Address_1_Street_Address", "Address_1"]),
    primaryCity: firstText(record, ["Address_1_City"]),
    primaryState: firstText(record, ["Address_1_State_Province"]),
    primaryZip: firstText(record, ["Address_1_Zip_Postal_Code"]),
    notes: firstText(record, ["Description", "Claims_Summary"]),
    fein: firstText(record, ["FEIN"]),
    employeeCount: asNumber(record.Full_Time_Employees),
    annualSales: asNumber(record.Total_Yearly_Sales) != null ? String(asNumber(record.Total_Yearly_Sales)) : null,
    payrollTotal:
      asNumber(record.Total_Annual_Payroll) != null ? String(asNumber(record.Total_Annual_Payroll)) : null,
    yearsInBusiness: asNumber(record.Years_in_Business),
    wcClassCode: firstText(record, ["Workers_Comp_Class_Code"]),
    operations: firstText(record, ["Industry1", "Description"]),
    clientSince: asDate(record.Client_Since),
    officerZohoId: lookupId(record.Primary_Contact),
    unmatched: unmatchedOf(record, ACCOUNT_MAPPED),
  };
}

export function mapLead(record: ZohoRecord, zohoId: string): MappedLead {
  const split = splitName(firstText(record, ["Full_Name"]));
  return {
    zohoId,
    firstName: firstText(record, ["First_Name"]) ?? split.first,
    lastName: firstText(record, ["Last_Name"]) ?? split.last,
    middleName: firstText(record, ["Middle_Name"]),
    email: firstText(record, ["Email"]),
    phone: firstText(record, ["Phone", "Mobile"]),
    source: firstText(record, ["Lead_Source1", "Data_Source"]),
    status: mapLeadStatus(firstText(record, ["Lead_Status"])),
    notes: firstText(record, ["Description", "Other_Details", "Property_Details"]),
    mailingAddress: firstText(record, [
      "Mailing_Address_Street_Address",
      "Mailing_Address",
      "Address_1_Street_Address",
    ]),
    city: firstText(record, ["Mailing_Address_City", "Address_1_City", "City"]),
    state: firstText(record, ["Mailing_Address_State_Province", "Address_1_State_Province"]),
    zip: firstText(record, ["Mailing_Address_Zip_Postal_Code", "Address_1_Zip_Postal_Code"]),
    dateOfBirth: asDateOnly(record.DOB),
    insuranceTypeDesired: firstText(record, ["Product_Interest", "Existing_Coverage_Type"]),
    preferredLanguage: firstText(record, ["Preferred_Language"]),
    convertedDealZohoId: lookupId(record.Converted_Deal),
    owner: extractZohoOwner(record),
    createdBy: extractZohoOwner(record, "Created_By"),
    unmatched: unmatchedOf(record, LEAD_MAPPED),
  };
}

export function mapDeal(record: ZohoRecord, zohoId: string): MappedDeal {
  const insurance = asStringList(record.Type_of_Insurance).join(" ");
  const line = mapLineOfBusiness([insurance, asText(record.HO_Policy_Form), asText(record.Pipeline)]);
  const notes = [firstText(record, ["Description", "Property_Details"]), firstText(record, ["Quote_Notes"])]
    .filter(Boolean)
    .join("\n\n");
  return {
    zohoId,
    title: firstText(record, ["Deal_Name"]) ?? "Untitled deal",
    pipelineStage: mapDealStage(firstText(record, ["Stage"])),
    lineOfBusiness: line,
    accountKind: mapAccountKind(line, firstText(record, ["Pipeline"])),
    bindTarget: mapAccountKind(line, firstText(record, ["Pipeline"])) === "commercial" ? "account" : "contact",
    state: "FL",
    notes: notes || null,
    quoteResultsNote: firstText(record, ["Quote_Notes"]),
    coverageAmount: asNumber(record.Coverage_Amount) ?? asNumber(record.Amount),
    currentCarrier: firstText(record, ["Current_Carrier", "Quoted_Carrier"]),
    contactZohoId: lookupId(record.Contact_Name),
    accountZohoId: lookupId(record.Account_Name),
    wonAt: asDate(record.Won_Date),
    owner: extractZohoOwner(record),
    createdBy: extractZohoOwner(record, "Created_By"),
    unmatched: unmatchedOf(record, DEAL_MAPPED),
  };
}

export function mapVendor(record: ZohoRecord, zohoId: string): MappedVendor {
  return {
    zohoId,
    name: firstText(record, ["Vendor_Name"]) ?? "Unnamed carrier",
    phone: firstText(record, ["Phone"]),
    website: firstText(record, ["Website", "Carrier_Portal"]),
    portalUrl: firstText(record, ["Carrier_Portal"]),
    agencyCode: firstText(record, ["Agency_Code"]),
    appetiteNotes: firstText(record, ["Apetite", "Appetite_URL", "Carrier_Notes"]),
    dontWriteNotes: firstText(record, ["Does_Not_Write"]),
    carrierInfo: firstText(record, ["Description", "Carrier_Notes"]),
    writtenLines: asStringList(record.Written_Lines),
    appointmentStatus: firstText(record, ["Appointment_Status"]),
    sellingAgency: firstText(record, ["Selling_Agency"]),
    unmatched: unmatchedOf(record, VENDOR_MAPPED),
  };
}

export function mapPolicy(record: ZohoRecord, zohoId: string): MappedPolicy | { skip: string; unmatched: string[] } {
  const number = firstText(record, ["Policy_Number"]);
  const effective = asDate(record.Effective_Date);
  if (!number) return { skip: "Policy_Number is required.", unmatched: unmatchedOf(record, POLICY_MAPPED) };
  if (!effective) return { skip: "Effective_Date is required.", unmatched: unmatchedOf(record, POLICY_MAPPED) };
  const termMonths = parseTermMonths(record.Policy_Term);
  const expiration = asDate(record.X_Date) ?? asDate(record.Expiration_Renewal) ?? addMonthsSafe(effective, termMonths);
  const line = mapLineOfBusiness([
    asText(record.Policy_Sub_Type),
    asText(record.Policy_Type),
    asText(record.Insurance_Type),
    asText(record.Name),
  ]);
  const premium = asNumber(record.AFA_P_C_Annual_Premium) ?? asNumber(record.Gross_Written_Premium);
  return {
    zohoId,
    policyNumber: number,
    lineOfBusiness: line,
    formType: firstText(record, ["Policy_Sub_Type"]),
    policyType: firstText(record, ["Policy_Type"]),
    policySubType: firstText(record, ["Policy_Sub_Type"]),
    insuranceType: firstText(record, ["Insurance_Type"]),
    status: mapPolicyStatus(firstText(record, ["Status"])),
    effectiveDate: effective,
    expirationDate: expiration,
    premium: premium != null ? String(premium) : null,
    gwp: asNumber(record.Gross_Written_Premium) != null ? String(asNumber(record.Gross_Written_Premium)) : null,
    billingFrequency: firstText(record, ["Premium_Frequency"]),
    premiumFrequency: firstText(record, ["Premium_Frequency"]),
    termMonths,
    sellingAgency: firstText(record, ["Selling_Agency"]),
    notes: firstText(record, ["Policy_Notes"]),
    producer: firstText(record, ["Selling_Agency"]),
    contactZohoId: lookupId(record.Contact) ?? lookupId(record.Insured_1),
    accountZohoId: lookupId(record.Business),
    dealZohoId: lookupId(record.Related_Deal) ?? lookupId(record.Source_Deal),
    carrierZohoId: lookupId(record.Writing_Carrier),
    carrierName: lookupName(record.Writing_Carrier),
    commission4Pct: asNumber(record.Commission4) != null ? String(asNumber(record.Commission4)) : null,
    numberOfInsured: asNumber(record.Number_of_Insured),
    oepStart: asDate(record.Open_Enrollment_Start),
    owner: extractZohoOwner(record),
    createdBy: extractZohoOwner(record, "Created_By"),
    unmatched: unmatchedOf(record, POLICY_MAPPED),
  };
}

function addMonthsSafe(start: Date, months: number): Date {
  const next = new Date(start.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function mapTask(record: ZohoRecord, zohoId: string): MappedTask {
  return {
    zohoId,
    title: firstText(record, ["Subject"]) ?? "Imported task",
    notes: firstText(record, ["Description"]),
    status: mapTaskStatus(firstText(record, ["Status"])),
    dueAt: asDate(record.Due_Date),
    contactZohoId: lookupId(record.Who_Id),
    relatedZohoId: lookupId(record.What_Id),
    relatedName: lookupName(record.What_Id),
    unmatched: unmatchedOf(record, TASK_MAPPED),
  };
}

export function mapperFor(module: ZohoModule) {
  return { Contacts: mapContact, Accounts: mapAccount, Leads: mapLead, Deals: mapDeal, Vendors: mapVendor, Policies: mapPolicy, Tasks: mapTask }[
    module
  ];
}
