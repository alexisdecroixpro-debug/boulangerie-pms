export type OcrDateType = "DLC" | "DDM" | "Non précisé";

export interface LabelOcrResult {
  produit: string;
  marque: string;
  fournisseur: string;
  numero_lot: string;
  dlc_ddm: string;
  type_date: OcrDateType;
  temperature_conservation: string;
  conservation_apres_ouverture: string;
  allergenes: string[];
  ingredients: string;
  conditionnement: string;
  code_barres: string;
  mentions_tracabilite: string;
  champs_incertains: string[];
  scores_par_champ: Record<string, number>;
  score_confiance_global: number;
  qualite_image: "lisible" | "partielle" | "illisible";
}

export const EMPTY_OCR_RESULT: LabelOcrResult = {
  produit: "",
  marque: "",
  fournisseur: "",
  numero_lot: "",
  dlc_ddm: "",
  type_date: "Non précisé",
  temperature_conservation: "",
  conservation_apres_ouverture: "",
  allergenes: [],
  ingredients: "",
  conditionnement: "",
  code_barres: "",
  mentions_tracabilite: "",
  champs_incertains: [],
  scores_par_champ: {},
  score_confiance_global: 0,
  qualite_image: "partielle",
};

const FIELD_NAMES = [
  "produit", "marque", "fournisseur", "numero_lot", "dlc_ddm", "type_date",
  "temperature_conservation", "conservation_apres_ouverture", "allergenes",
  "ingredients", "conditionnement", "code_barres", "mentions_tracabilite",
] as const;

export function normalizeOcrResult(value: unknown): LabelOcrResult {
  if (!value || typeof value !== "object") return { ...EMPTY_OCR_RESULT };
  const input = value as Record<string, unknown>;
  const scores = typeof input.scores_par_champ === "object" && input.scores_par_champ
    ? input.scores_par_champ as Record<string, unknown>
    : {};
  const normalizedScores = Object.fromEntries(FIELD_NAMES.map((field) => [
    field,
    clampScore(scores[field]),
  ]));
  const dateType = input.type_date === "DLC" || input.type_date === "DDM"
    ? input.type_date
    : "Non précisé";
  const imageQuality = input.qualite_image === "lisible" || input.qualite_image === "illisible"
    ? input.qualite_image
    : "partielle";

  return {
    produit: text(input.produit),
    marque: text(input.marque),
    fournisseur: text(input.fournisseur),
    numero_lot: text(input.numero_lot),
    dlc_ddm: normalizeDate(text(input.dlc_ddm)),
    type_date: dateType,
    temperature_conservation: text(input.temperature_conservation),
    conservation_apres_ouverture: text(input.conservation_apres_ouverture),
    allergenes: stringArray(input.allergenes),
    ingredients: text(input.ingredients),
    conditionnement: text(input.conditionnement),
    code_barres: text(input.code_barres).replace(/\s+/g, ""),
    mentions_tracabilite: text(input.mentions_tracabilite),
    champs_incertains: stringArray(input.champs_incertains),
    scores_par_champ: normalizedScores,
    score_confiance_global: clampScore(input.score_confiance_global),
    qualite_image: imageQuality,
  };
}

export function validateOpeningDraft(input: {
  produit: string;
  numeroLot: string;
  dateFournisseur: string;
  justificationLot: string;
  justificationDate: string;
}) {
  const errors: string[] = [];
  if (!input.produit.trim()) errors.push("Le produit est obligatoire.");
  if (!input.numeroLot.trim() && !input.justificationLot.trim()) {
    errors.push("Saisissez un numéro de lot ou une justification.");
  }
  if (!input.dateFournisseur.trim() && !input.justificationDate.trim()) {
    errors.push("Saisissez une DLC/DDM ou une justification.");
  }
  return errors;
}

export function isUncertain(result: LabelOcrResult, field: string) {
  return result.champs_incertains.includes(field)
    || (result.scores_par_champ[field] ?? 0) < 70;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function clampScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeDate(value: string) {
  if (!value) return "";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;
  const french = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!french) return "";
  const year = french[3].length === 2 ? `20${french[3]}` : french[3];
  return `${year}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
}
