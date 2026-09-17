/** Lean Life Risk Profile conditions — keep these; MATRIX vocabulary is additive. */
export const LIFE_LEAN_MEDICAL_CONDITION_OPTIONS = [
  "None",
  "High blood pressure",
  "High cholesterol",
  "Diabetes Type 1",
  "Diabetes Type 2",
  "Heart disease",
  "Stroke",
  "Cancer",
  "Asthma",
  "COPD",
  "Kidney disease",
  "Liver disease",
  "Thyroid disorder",
  "Mental health condition",
  "Sleep apnea",
  "Other",
] as const;

/**
 * MATRIX row vocabulary from Javy live sheet col A (2026-09-17) plus earlier
 * screenshot labels. Labels only — no implied UW outcome.
 */
export const LIFE_MATRIX_MEDICAL_CONDITION_OPTIONS = [
  "Activities of daily living",
  "ADL assistance",
  "AIDS",
  "AIDS / HIV",
  "AIDS related complex (ARC)",
  "Alcohol / drug treatment",
  "ALS",
  "Alzheimer’s",
  "Amputation",
  "Anemia",
  "Aneurysm",
  "Angina",
  "Angioplasty",
  "Anxiety",
  "Arrhythmia",
  "Arthritis (osteo)",
  "Arthritis (rheumatoid)",
  "Asthma — steroid inhaler",
  "Atrial fibrillation",
  "Autism",
  "Avocations",
  "Bipolar",
  "Blood clots",
  "Brain tumor (non-cancerous)",
  "Bronchitis (chronic)",
  "Cardiomyopathy",
  "Cerebral palsy",
  "Chronic pain / pain pills",
  "Circulatory issues / surgeries",
  "Cirrhosis",
  "Citizenship",
  "Congestive heart failure (CHF)",
  "COVID-19",
  "CPAP with oxygen",
  "CPAP without oxygen",
  "Criminal history (felonies)",
  "Crohn’s",
  "Cystic fibrosis",
  "Defibrillator",
  "Dementia",
  "Depression",
  "Diabetes",
  "Diabetes — gestational",
  "Diabetes — gout",
  "Diabetes — insulin",
  "Diabetes with smoking",
  "Diabetic neuropathy",
  "Diabetic retinopathy",
  "Disability",
  "Diverticulitis",
  "Down’s syndrome",
  "Driver license / DUI",
  "Emphysema",
  "Endometriosis",
  "Epilepsy",
  "Erectile dysfunction",
  "Family history",
  "Fibromyalgia",
  "Gabapentin",
  "Gallbladder disorder",
  "Gastric bypass",
  "Gout",
  "Heart attack / heart disease",
  "Heart — mitral valve",
  "Heart surgeries (bypass)",
  "Hepatitis",
  "HIV",
  "HIV PrEP",
  "Hospitalization",
  "Huntington’s",
  "Hypothyroidism",
  "Kidney dialysis",
  "Kidney disease — chronic",
  "Kidney failure",
  "Kidney stones",
  "Liver — fatty",
  "Lupus",
  "Marijuana use",
  "Migraine headaches",
  "Military",
  "Multiple sclerosis",
  "Muscular dystrophy",
  "Occupation",
  "Organ transplant",
  "Oxygen use",
  "Pacemaker",
  "Pancreatitis",
  "Paralysis",
  "Parkinson’s",
  "Peripheral vascular disease (PVD)",
  "PTSD",
  "Pulmonary embolism",
  "Renal failure",
  "Sarcoidosis",
  "Schizophrenia",
  "Scooter use",
  "Seizures",
  "Sickle cell",
  "Stent",
  "TIA",
  "Ulcerative colitis",
  "Walker use",
  "Wheelchair use",
] as const;

const LEAN_SET = new Set<string>(LIFE_LEAN_MEDICAL_CONDITION_OPTIONS);

/** Union: existing lean labels first, then MATRIX rows not already present. */
export const LIFE_MEDICAL_CONDITION_OPTIONS = [
  ...LIFE_LEAN_MEDICAL_CONDITION_OPTIONS,
  ...LIFE_MATRIX_MEDICAL_CONDITION_OPTIONS.filter((label) => !LEAN_SET.has(label)),
] as const;

export type LifeMedicalConditionLabel = (typeof LIFE_MEDICAL_CONDITION_OPTIONS)[number];

/** Labels that are picklist chrome, not MATRIX condition keys. */
const SKIP_CONDITION_LABELS = new Set(["None", "Other"]);

const LABEL_TO_KEY: Record<string, string> = {
  "Activities of daily living": "adl_assistance",
  "ADL assistance": "adl_assistance",
  AIDS: "aids",
  "AIDS / HIV": "aids_hiv",
  "AIDS related complex (ARC)": "aids_arc",
  "Alcohol / drug treatment": "alcohol_drug_treatment",
  ALS: "als_lou_gehrigs_disease",
  "ALS (Lou Gehrig's Disease)": "als_lou_gehrigs_disease",
  "Alzheimer’s": "alzheimers",
  Amputation: "amputation",
  Anemia: "anemia",
  Aneurysm: "aneurysm",
  Angina: "angina",
  Angioplasty: "angioplasty",
  Anxiety: "anxiety",
  Arrhythmia: "arrhythmia",
  "Arthritis (osteo)": "arthritis_osteo",
  "Arthritis (rheumatoid)": "arthritis_rheumatoid",
  Asthma: "asthma",
  "Asthma — steroid inhaler": "asthma_steroid_inhaler",
  "Atrial fibrillation": "atrial_fibrillation",
  Autism: "autism",
  Avocations: "avocations",
  Bipolar: "bipolar",
  "Blood clots": "blood_clots",
  "Brain tumor (non-cancerous)": "brain_tumor_noncancerous",
  "Bronchitis (chronic)": "bronchitis_chronic",
  Cancer: "cancer",
  Cardiomyopathy: "cardiomyopathy",
  "Cerebral palsy": "cerebral_palsy",
  "Chronic pain / pain pills": "chronic_pain",
  "Circulatory issues / surgeries": "circulatory_surgeries",
  Cirrhosis: "cirrhosis",
  Citizenship: "citizenship",
  COPD: "copd",
  "Congestive heart failure (CHF)": "chf",
  "COVID-19": "covid_19",
  "CPAP with oxygen": "cpap_with_oxygen",
  "CPAP without oxygen": "cpap_without_oxygen",
  "Criminal history (felonies)": "criminal_history_felonies",
  "Crohn’s": "crohns",
  "Cystic fibrosis": "cystic_fibrosis",
  Defibrillator: "defibrillator",
  Dementia: "dementia",
  Depression: "depression",
  Diabetes: "diabetes",
  "Diabetes — gestational": "diabetes_gestational",
  "Diabetes — gout": "diabetes_gout",
  "Diabetes — insulin": "diabetes_insulin",
  "Diabetes Type 1": "diabetes_type_1",
  "Diabetes Type 2": "diabetes_type_2",
  "Diabetes with smoking": "diabetes_w_smoking",
  "Diabetic neuropathy": "diabetic_neuropathy",
  "Diabetic retinopathy": "diabetic_retinopathy",
  Disability: "disability",
  Diverticulitis: "diverticulitis",
  "Down’s syndrome": "downs_syndrome",
  "Driver license / DUI": "driver_license_dui",
  Emphysema: "emphysema",
  Endometriosis: "endometriosis",
  Epilepsy: "epilepsy",
  "Erectile dysfunction": "erectile_dysfunction",
  "Family history": "family_history",
  Fibromyalgia: "fibromyalgia",
  Gabapentin: "gabapentin",
  "Gallbladder disorder": "gallbladder_disorder",
  "Gastric bypass": "gastric_bypass",
  Gout: "gout",
  "Heart attack / heart disease": "heart_attack_heart_disease",
  "Heart disease": "heart_disease",
  "Heart — mitral valve": "heart_mitral_valve_insufficiency_prolapse",
  "Heart surgeries (bypass)": "heart_surgeries_bypass_etc",
  Hepatitis: "hepatitis",
  "High blood pressure": "high_blood_pressure",
  "High cholesterol": "high_cholesterol",
  HIV: "hiv",
  "HIV PrEP": "hiv_prep",
  Hospitalization: "hospitalization",
  "Huntington’s": "huntingtons_disease",
  Hypothyroidism: "hypothyroidism",
  "Kidney dialysis": "kidney_dialysis",
  "Kidney disease": "kidney_disease",
  "Kidney disease — chronic": "kidney_disease_chronic",
  "Kidney failure": "kidney_failure",
  "Kidney stones": "kidney_stones",
  "Liver disease": "liver_disease",
  "Liver — fatty": "liver_fatty_liver_disease",
  Lupus: "lupus",
  "Marijuana use": "marijuana_use",
  "Mental health condition": "mental_health",
  "Migraine headaches": "migraine_headaches",
  Military: "military",
  "Multiple sclerosis": "multiple_sclerosis_ms",
  "Multiple Sclerosis (MS)": "multiple_sclerosis_ms",
  "Muscular dystrophy": "muscular_dystrophy",
  Occupation: "occupation",
  "Organ transplant": "organ_transplant",
  "Oxygen use": "oxygen_use",
  Pacemaker: "pacemaker",
  Pancreatitis: "pancreatitis",
  Paralysis: "paralysis",
  "Parkinson’s": "parkinsons",
  "Peripheral vascular disease (PVD)": "pvd",
  PTSD: "ptsd",
  "Pulmonary embolism": "pulmonary_embolism",
  "Renal failure": "renal_failure",
  Sarcoidosis: "sarcoidosis",
  Schizophrenia: "schizophrenia",
  "Scooter use": "scooter_use",
  Seizures: "seizures",
  "Sickle cell": "sickle_cell",
  "Sleep apnea": "sleep_apnea",
  Stent: "stent",
  Stroke: "stroke",
  "Thyroid disorder": "thyroid_disorder",
  TIA: "tia",
  "Ulcerative colitis": "ulcerative_colitis",
  "Walker use": "walker_use",
  "Wheelchair use": "wheelchair_use",
};

/** Lean / combined labels also look up the live-sheet row keys. */
const CONDITION_KEY_ALIASES: Record<string, readonly string[]> = {
  aids_hiv: ["aids", "hiv"],
  als: ["als_lou_gehrigs_disease"],
  diabetes_type_1: ["diabetes"],
  diabetes_type_2: ["diabetes"],
  heart_disease: ["heart_attack_heart_disease"],
  kidney_disease: ["kidney_disease_chronic"],
  multiple_sclerosis: ["multiple_sclerosis_ms"],
  thyroid_disorder: ["hypothyroidism"],
};

/**
 * Exact MATRIX col A strings (2026-09-17 extract) that slug differently from
 * the picklist labels. Headers / chrome are skipped by the caller.
 */
const MATRIX_COL_A_TO_KEY: Record<string, string> = {
  "Activities of Daily Living": "adl_assistance",
  "AIDS Related Complex (ARC)": "aids_arc",
  "ALS (Lou Gehrig's Disease)": "als_lou_gehrigs_disease",
  "Arthritis-Osteo": "arthritis_osteo",
  "Asthma-Steroid Inhaler": "asthma_steroid_inhaler",
  "Atrial Fibrillation (A-Fib)": "atrial_fibrillation",
  "Bipolar Disorder": "bipolar",
  "Brain Tumor- Non Cancerous": "brain_tumor_noncancerous",
  "Bronchitis-Chronic": "bronchitis_chronic",
  "Circulatory Issues/ Surgeries": "circulatory_surgeries",
  "Cirrhosis of Liver": "cirrhosis",
  "Crohns Disease": "crohns",
  "Congestive Heart Failure": "chf",
  "CPAP w/No Oxygen": "cpap_without_oxygen",
  "CPAP w/Oxygen": "cpap_with_oxygen",
  "Heart Attack/ Heart Disease": "heart_attack_heart_disease",
  "Heart - Mitral Valve Insufficiency/ Prolapse": "heart_mitral_valve_insufficiency_prolapse",
  "Heart Surgeries (Bypass, etc)": "heart_surgeries_bypass_etc",
  "HIV PREP": "hiv_prep",
  "Huntington's Disease": "huntingtons_disease",
  "Kidney Disease-Chronic": "kidney_disease_chronic",
  "Liver-Fatty Liver Disease": "liver_fatty_liver_disease",
  "Migrane Headaches": "migraine_headaches",
  "Multiple Sclerosis (MS)": "multiple_sclerosis_ms",
  "Pain-Chronic /Pain Pills": "chronic_pain",
  "Peripheral Vascular Disease": "pvd",
  "Rheumatoid Arthritis": "arthritis_rheumatoid",
  "Sickle Cell Anemia": "sickle_cell",
  Tobacco: "tobacco",
};

/** Section chrome from MATRIX column A — not condition keys. */
export const LIFE_MATRIX_COL_A_SKIP = new Set([
  "Carrier Websites",
  "Phone Number",
  "E Apps",
  "Miscellaneous Info",
  "Declines Reported?",
  "Docusign?",
  "Paramed Vendors",
  "Payments Accepted?",
  "Phone Interview Required",
  "Split W/Uncontracted Agent",
  "Telesales?",
  "Term Conversions",
  "Background Questions",
  "Medical Conditions",
]);

export function lifeConditionKeyFromLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed || SKIP_CONDITION_LABELS.has(trimmed) || LIFE_MATRIX_COL_A_SKIP.has(trimmed)) return null;
  if (LABEL_TO_KEY[trimmed]) return LABEL_TO_KEY[trimmed];
  if (MATRIX_COL_A_TO_KEY[trimmed]) return MATRIX_COL_A_TO_KEY[trimmed];
  return trimmed
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || null;
}

export function parseLifeConditionLabels(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function lifeConditionKeysFromSheet(raw: string | null | undefined): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const add = (key: string) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    keys.push(key);
  };
  for (const label of parseLifeConditionLabels(raw)) {
    const key = lifeConditionKeyFromLabel(label);
    if (!key) continue;
    add(key);
    for (const alias of CONDITION_KEY_ALIASES[key] ?? []) add(alias);
  }
  return keys;
}

export function tobaccoConditionKey(status: string | null | undefined): string | null {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "current" || value === "former") return "tobacco";
  return null;
}
