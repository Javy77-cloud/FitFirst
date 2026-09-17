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
 * MATRIX row vocabulary from Javy screenshots + notes (2026-09-16).
 * Labels only — no implied UW outcome.
 */
export const LIFE_MATRIX_MEDICAL_CONDITION_OPTIONS = [
  "ADL assistance",
  "AIDS / HIV",
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
  "Atrial fibrillation",
  "Autism",
  "Bipolar",
  "Blood clots",
  "Brain tumor (non-cancerous)",
  "Bronchitis (chronic)",
  "Cardiomyopathy",
  "Cerebral palsy",
  "Chronic pain / pain pills",
  "Circulatory issues / surgeries",
  "Cirrhosis",
  "Congestive heart failure (CHF)",
  "COVID-19",
  "CPAP with oxygen",
  "CPAP without oxygen",
  "Crohn’s",
  "Cystic fibrosis",
  "Defibrillator",
  "Dementia",
  "Depression",
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
  "ADL assistance": "adl_assistance",
  "AIDS / HIV": "aids_hiv",
  ALS: "als",
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
  "Atrial fibrillation": "atrial_fibrillation",
  Autism: "autism",
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
  COPD: "copd",
  "Congestive heart failure (CHF)": "chf",
  "COVID-19": "covid_19",
  "CPAP with oxygen": "cpap_with_oxygen",
  "CPAP without oxygen": "cpap_without_oxygen",
  "Crohn’s": "crohns",
  "Cystic fibrosis": "cystic_fibrosis",
  Defibrillator: "defibrillator",
  Dementia: "dementia",
  Depression: "depression",
  "Diabetes Type 1": "diabetes_type_1",
  "Diabetes Type 2": "diabetes_type_2",
  "Heart disease": "heart_disease",
  "High blood pressure": "high_blood_pressure",
  "High cholesterol": "high_cholesterol",
  "Kidney disease": "kidney_disease",
  "Liver disease": "liver_disease",
  "Mental health condition": "mental_health",
  "Multiple sclerosis": "multiple_sclerosis",
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

export function lifeConditionKeyFromLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed || SKIP_CONDITION_LABELS.has(trimmed)) return null;
  if (LABEL_TO_KEY[trimmed]) return LABEL_TO_KEY[trimmed];
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
  for (const label of parseLifeConditionLabels(raw)) {
    const key = lifeConditionKeyFromLabel(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function tobaccoConditionKey(status: string | null | undefined): string | null {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "current" || value === "former") return "tobacco";
  return null;
}
