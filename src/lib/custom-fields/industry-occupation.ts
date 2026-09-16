/** QuoteRush-style Industry → Occupation cascade. Shared by Deal applicant and co-applicant. */

export const INDUSTRY_OPTIONS = [
  "Agriculture / Forestry / Fishing",
  "Art / Design / Media",
  "Banking / Finance / Real Estate",
  "Business / Sales / Office",
  "Construction / Energy / Trades",
  "Disabled",
  "Education / Library",
  "Engineer / Architect / Science / Math",
  "Government / Military",
  "Home / Homemaker / Houseperson",
  "Information Technology",
  "Insurance",
  "Legal / Law Enforcement / Security",
  "Maintenance / Repair / Housekeeping",
  "Manufacturing / Production",
  "Medical / Social Services / Religion",
  "Personal Care / Services",
  "Retire",
  "Restaurant and Hotel Services",
  "Sports and Recreation",
  "Student",
  "Travel / Transportation / Warehousing",
  "Unemployed",
  "Other",
] as const;

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];

const OTHER = "Other";

function list(...jobs: string[]): string[] {
  return [...new Set([...jobs, OTHER])];
}

/** Agriculture / Forestry / Fishing — from Javy QuoteRush walkthrough. */
const AGRICULTURE = list(
  "Agricultural Inspector",
  "Arborist",
  "Clerk",
  "Occupational Equipment Operator",
  "Farm Ranch Owner",
  "Farm Ranch Worker",
  "Fisherman",
  "Florist",
  "Laborer/Worker",
  "Landscaper",
  "Nursery Worker",
  "Logger",
  "Mill Worker",
  "Ranger",
  "Supervisor",
  "Timber Grader or Scale",
);

/** Art / Design / Media — from Javy QuoteRush walkthrough. */
const ART = list(
  "Actor",
  "Administrative Assistant",
  "Announcer/Broadcaster",
  "Artist/Animator",
  "Author/Writer",
  "Choreography/Dancer",
  "Clerk",
  "Composer",
  "Director",
  "Curator",
  "Designer",
  "Editor",
  "Journalist or Reporter",
  "Printer",
  "Producer",
  "Production Crew",
  "Projectionist",
  "Receptionist or Secretary",
  "Ticket Sales or Usher",
);

const OCCUPATIONS_BY_INDUSTRY: Record<string, readonly string[]> = {
  "Agriculture / Forestry / Fishing": AGRICULTURE,
  "Art / Design / Media": ART,
  "Banking / Finance / Real Estate": list(
    "Accountant",
    "Bank Teller",
    "Branch Manager",
    "Broker",
    "Credit Analyst",
    "Financial Advisor",
    "Loan Officer",
    "Real Estate Agent",
    "Real Estate Appraiser",
    "Teller",
    "Underwriter",
    "Clerk",
    "Receptionist or Secretary",
  ),
  "Business / Sales / Office": list(
    "Administrative Assistant",
    "Buyer",
    "Clerk",
    "Customer Service",
    "Executive",
    "Manager",
    "Marketing",
    "Office Manager",
    "Purchasing Agent",
    "Receptionist or Secretary",
    "Sales Representative",
    "Supervisor",
  ),
  "Construction / Energy / Trades": list(
    "Carpenter",
    "Contractor",
    "Electrician",
    "Heavy Equipment Operator",
    "HVAC Technician",
    "Laborer/Worker",
    "Oil Field Worker",
    "Painter",
    "Plumber",
    "Roofer",
    "Supervisor",
    "Utility Worker",
    "Welder",
  ),
  Disabled: ["Disabled"],
  "Education / Library": list(
    "Administrative Assistant",
    "Clerk",
    "Counselor",
    "Librarian",
    "Principal",
    "Professor",
    "Teacher",
    "Teacher Aide",
  ),
  "Engineer / Architect / Science / Math": list(
    "Architect",
    "Chemist",
    "Civil Engineer",
    "Draftsman",
    "Electrical Engineer",
    "Mathematician",
    "Mechanical Engineer",
    "Scientist",
    "Software Engineer",
    "Surveyor",
  ),
  "Government / Military": list(
    "Administrator",
    "Elected Official",
    "Government Clerk",
    "Inspector",
    "Military Enlisted",
    "Military Officer",
    "Postal Worker",
  ),
  "Home / Homemaker / Houseperson": ["Homemaker", "Houseperson", OTHER],
  "Information Technology": list(
    "Cybersecurity",
    "Database Administrator",
    "Help Desk",
    "IT Manager",
    "Network Administrator",
    "Software Developer",
    "Systems Analyst",
    "Web Developer",
  ),
  Insurance: list(
    "Actuary",
    "Broker",
    "Claims Adjuster",
    "CSR",
    "Insurance Agent",
    "Underwriter",
  ),
  "Legal / Law Enforcement / Security": list(
    "Attorney",
    "Bailiff",
    "Correctional Officer",
    "Detective",
    "Judge",
    "Paralegal",
    "Police Officer",
    "Security Guard",
    "Sheriff",
  ),
  "Maintenance / Repair / Housekeeping": list(
    "Custodian",
    "Groundskeeper",
    "Housekeeper",
    "Janitor",
    "Maintenance Worker",
    "Mechanic",
    "Repair Technician",
  ),
  "Manufacturing / Production": list(
    "Assembler",
    "Factory Worker",
    "Machine Operator",
    "Machinist",
    "Production Supervisor",
    "Quality Control",
    "Welder",
  ),
  "Medical / Social Services / Religion": list(
    "Clergy",
    "Dentist",
    "Home Health Aide",
    "Medical Assistant",
    "Nurse",
    "Pharmacist",
    "Physician",
    "Social Worker",
    "Therapist",
  ),
  "Personal Care / Services": list(
    "Barber",
    "Childcare Worker",
    "Cosmetologist",
    "Funeral Director",
    "Massage Therapist",
    "Personal Trainer",
  ),
  Retire: ["Retire"],
  "Restaurant and Hotel Services": list(
    "Bartender",
    "Chef",
    "Cook",
    "Dishwasher",
    "Host/Hostess",
    "Hotel Clerk",
    "Housekeeper",
    "Manager",
    "Server",
  ),
  "Sports and Recreation": list(
    "Athlete",
    "Coach",
    "Fitness Instructor",
    "Official/Referee",
    "Recreation Worker",
  ),
  Student: ["Student"],
  "Travel / Transportation / Warehousing": list(
    "Bus Driver",
    "Delivery Driver",
    "Dispatcher",
    "Flight Attendant",
    "Pilot",
    "Taxi/Rideshare Driver",
    "Truck Driver",
    "Warehouse Worker",
  ),
  Unemployed: ["Unemployed"],
  Other: [OTHER],
};

export const INDUSTRY_RETIRE = "Retire";

export function occupationsForIndustry(industry: string | null | undefined): string[] {
  const key = String(industry ?? "").trim();
  if (!key) return [];
  if (key === INDUSTRY_RETIRE) return ["Retire"];
  const hit = OCCUPATIONS_BY_INDUSTRY[key];
  return hit ? [...hit] : [OTHER];
}

export function isIndustryOption(value: string | null | undefined): boolean {
  return (INDUSTRY_OPTIONS as readonly string[]).includes(String(value ?? "").trim());
}

/** Occupation field key → industry parent field key. */
export function occupationIndustryParentKey(fieldKey: string): string | null {
  if (fieldKey === "applicant_occupation") return "applicant_industry";
  if (fieldKey === "co_applicant_occupation") return "co_applicant_industry";
  const driver = fieldKey.match(/^(driver_\d+)_occupation$/);
  if (driver) return `${driver[1]}_industry`;
  return null;
}

export function isOccupationCascadeChild(fieldKey: string): boolean {
  return occupationIndustryParentKey(fieldKey) !== null;
}

export function isIndustryCascadeParent(fieldKey: string): boolean {
  return (
    fieldKey === "applicant_industry" ||
    fieldKey === "co_applicant_industry" ||
    /^driver_\d+_industry$/.test(fieldKey)
  );
}
