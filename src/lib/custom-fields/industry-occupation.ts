/**
 * Single shared Industry → Occupation cascade (Javy locked 2026-09-16).
 * Used by Deal/Lead applicant, co-applicant, and later Auto drivers — do not
 * duplicate picklists per person.
 */

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

/** Javy 2026-09-16 paste — Agriculture, Forestry, Fishing. */
const AGRICULTURE = list(
  "Farmworker",
  "Rancher",
  "Logger",
  "Fisher",
  "Agricultural Inspector",
  "Forester",
  "Greenhouse Manager",
  "Animal Breeder",
  "Logging Equipment Operator",
  "Farm Equipment Operator",
  "Aquaculture Technician",
  "Crop Scout",
  "Forest Conservation Worker",
  "Agricultural Sales Rep",
  "Irrigation Specialist",
);

/** Javy 2026-09-16 paste — Art, Design, Media. */
const ART = list(
  "Graphic Designer",
  "Animator",
  "Video Editor",
  "Photographer",
  "Art Director",
  "Illustrator",
  "UX/UI Designer",
  "Interior Designer",
  "Fashion Designer",
  "Set Designer",
  "Multimedia Artist",
  "Copywriter",
  "Music Producer",
  "Camera Operator",
  "Social Media Content Creator",
);

/** Javy 2026-09-16 paste — Other industry. Exact file list (no extra Other). */
const OTHER_OCCUPATIONS = [
  "Retired",
  "Student",
  "Homemaker",
  "Unemployed",
  "Self-Employed",
  "Volunteer",
  "Caregiver",
  "Entrepreneur",
  "Consultant",
  "Freelancer",
] as const;

const OCCUPATIONS_BY_INDUSTRY: Record<string, readonly string[]> = {
  "Agriculture / Forestry / Fishing": AGRICULTURE,
  "Art / Design / Media": ART,
  "Banking / Finance / Real Estate": list(
    "Loan Officer",
    "Bank Teller",
    "Financial Advisor",
    "Credit Analyst",
    "Insurance Underwriter",
    "Real Estate Agent",
    "Property Manager",
    "Mortgage Broker",
    "Investment Analyst",
    "Compliance Officer",
    "Accountant",
    "Auditor",
    "Wealth Manager",
    "Title Agent",
    "Escrow Officer",
  ),
  "Business / Sales / Office": list(
    "Administrative Assistant",
    "Sales Representative",
    "Office Manager",
    "Customer Service",
    "Marketing",
    "Executive",
    "Buyer",
    "Receptionist",
    "Consultant",
    "Entrepreneur",
  ),
  "Construction / Energy / Trades": list(
    "Carpenter",
    "Electrician",
    "Plumber",
    "HVAC Technician",
    "Construction Manager",
    "Civil Engineer",
    "Welder",
    "Roofer",
    "Mason",
    "Heavy Equipment Operator",
    "Solar Installer",
    "Wind Turbine Technician",
    "Power Plant Operator",
    "Building Inspector",
    "Drywall Installer",
  ),
  Disabled: ["Disabled"],
  "Education / Library": list(
    "Teacher",
    "Principal",
    "School Counselor",
    "Librarian",
    "Library Assistant",
    "Professor",
    "Special Education Teacher",
    "Curriculum Developer",
    "School Administrator",
    "Archivist",
    "Museum Curator",
    "Tutor",
    "Education Consultant",
    "School Nurse",
    "Instructional Designer",
  ),
  "Engineer / Architect / Science / Math": list(
    "Architect",
    "Civil Engineer",
    "Electrical Engineer",
    "Mechanical Engineer",
    "Scientist",
    "Software Engineer",
    "Surveyor",
    "Industrial Engineer",
    "Data Scientist",
  ),
  "Government / Military": list(
    "Federal Employee",
    "State Employee",
    "City Employee",
    "Military Officer",
    "Enlisted Soldier",
    "Border Patrol Agent",
    "Police Officer",
    "Firefighter",
    "Postal Worker",
    "Government Analyst",
    "Policy Advisor",
    "Court Clerk",
    "Tax Examiner",
    "Park Ranger",
    "Customs Inspector",
  ),
  "Home / Homemaker / Houseperson": ["Homemaker", "Houseperson", "Caregiver", OTHER],
  "Information Technology": list(
    "Software Developer",
    "IT Support Specialist",
    "Network Administrator",
    "Cybersecurity Analyst",
    "Data Scientist",
    "Database Administrator",
    "Systems Analyst",
    "Cloud Engineer",
    "Web Developer",
    "IT Manager",
    "Help Desk Technician",
    "DevOps Engineer",
    "AI Engineer",
    "IT Auditor",
    "Technical Writer",
  ),
  Insurance: list(
    "Claims Adjuster",
    "Insurance Agent",
    "Underwriter",
    "Actuary",
    "Claims Examiner",
    "Risk Manager",
    "Insurance Broker",
    "Loss Control Specialist",
    "Policy Underwriter",
    "Insurance Investigator",
    "Benefits Administrator",
    "Reinsurance Analyst",
    "Insurance Auditor",
    "Customer Service Rep",
    "Insurance Sales Manager",
  ),
  "Legal / Law Enforcement / Security": list(
    "Lawyer",
    "Paralegal",
    "Legal Assistant",
    "Judge",
    "Police Officer",
    "Detective",
    "Security Guard",
    "Private Investigator",
    "Bailiff",
    "Court Reporter",
    "Legal Secretary",
    "Compliance Officer",
    "Forensic Analyst",
    "Security Manager",
    "Correctional Officer",
  ),
  "Maintenance / Repair / Housekeeping": list(
    "Housekeeper",
    "Maintenance Technician",
    "Mechanic",
    "Janitor",
    "Repair Technician",
    "Custodian",
    "Groundskeeper",
  ),
  "Manufacturing / Production": list(
    "Machine Operator",
    "Assembler",
    "Quality Control Inspector",
    "Production Supervisor",
    "CNC Machinist",
    "Welder",
    "Industrial Engineer",
    "Maintenance Technician",
    "Packaging Operator",
    "Tool and Die Maker",
    "Production Planner",
    "Safety Coordinator",
    "Robotics Technician",
    "Material Handler",
    "Process Engineer",
  ),
  "Medical / Social Services / Religion": list(
    "Physician",
    "Nurse",
    "Medical Assistant",
    "Pharmacist",
    "Physical Therapist",
    "Social Worker",
    "Counselor",
    "Home Health Aide",
    "Medical Records Specialist",
    "Occupational Therapist",
    "EMT",
    "Paramedic",
    "Healthcare Administrator",
    "Dietitian",
    "Mental Health Therapist",
  ),
  "Personal Care / Services": list(
    "Hairdresser",
    "Barber",
    "Esthetician",
    "Massage Therapist",
    "Nail Technician",
    "Personal Trainer",
    "Fitness Instructor",
    "Spa Manager",
    "Pet Groomer",
    "Housekeeper",
    "Personal Assistant",
    "Makeup Artist",
    "Tattoo Artist",
    "Yoga Instructor",
    "Wellness Coach",
  ),
  Retire: ["Retire"],
  "Restaurant and Hotel Services": list(
    "Chef",
    "Cook",
    "Server",
    "Bartender",
    "Hotel Manager",
    "Front Desk Clerk",
    "Housekeeping Supervisor",
    "Event Planner",
    "Caterer",
    "Food Service Manager",
    "Concierge",
    "Travel Agent",
    "Dishwasher",
    "Host",
    "Restaurant Owner",
  ),
  "Sports and Recreation": list(
    "Athlete",
    "Coach",
    "Fitness Instructor",
    "Official/Referee",
    "Recreation Worker",
    "Personal Trainer",
    "Yoga Instructor",
  ),
  Student: ["Student"],
  "Travel / Transportation / Warehousing": list(
    "Travel Agent",
    "Concierge",
    "Bus Driver",
    "Delivery Driver",
    "Dispatcher",
    "Flight Attendant",
    "Pilot",
    "Taxi/Rideshare Driver",
    "Truck Driver",
    "Warehouse Worker",
    "Material Handler",
  ),
  Unemployed: ["Unemployed"],
  Other: [...OTHER_OCCUPATIONS],
};

/** Javy section titles (commas, no slashes) → Deal Details industry keys. */
const INDUSTRY_ALIASES: Record<string, string> = {
  "agriculture, forestry, fishing": "Agriculture / Forestry / Fishing",
  "art, design, media": "Art / Design / Media",
  "banking, finance, real estate": "Banking / Finance / Real Estate",
  "construction, energy": "Construction / Energy / Trades",
  "education, library": "Education / Library",
  "government, military": "Government / Military",
  "legal, law enforcement, security": "Legal / Law Enforcement / Security",
  "manufacturing, production": "Manufacturing / Production",
  "medical, social, human services": "Medical / Social Services / Religion",
  "personal care, services": "Personal Care / Services",
  "restaurant, hotel, services": "Restaurant and Hotel Services",
  retired: "Retire",
};

function normalizeIndustryKey(raw: string): string {
  return raw.trim().replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ");
}

export const INDUSTRY_RETIRE = "Retire";

export function occupationsForIndustry(industry: string | null | undefined): string[] {
  const raw = String(industry ?? "").trim();
  if (!raw) return [];
  const normalized = normalizeIndustryKey(raw);
  if (normalized === INDUSTRY_RETIRE) return ["Retire"];
  const aliased = INDUSTRY_ALIASES[normalized.toLowerCase()] ?? INDUSTRY_ALIASES[raw.toLowerCase()];
  const key = aliased ?? normalized;
  if (key === INDUSTRY_RETIRE) return ["Retire"];
  const hit = OCCUPATIONS_BY_INDUSTRY[key];
  if (hit) return [...hit];
  const match = Object.entries(OCCUPATIONS_BY_INDUSTRY).find(
    ([label]) => normalizeIndustryKey(label) === key,
  );
  return match ? [...match[1]] : [...OTHER_OCCUPATIONS];
}

/** Keep occupation only when it still belongs to the new industry list. */
export function occupationValueAfterIndustryChange(
  industry: string | null | undefined,
  occupation: string | null | undefined,
): string {
  const current = String(occupation ?? "");
  if (!current) return "";
  return occupationsForIndustry(industry).includes(current) ? current : "";
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
