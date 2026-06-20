import type { LabelOcrResult } from "./ocr";
import type { ProductType, RawMaterialOpening } from "./types";

export interface ProductMemoryMatch {
  sourceOpeningId: string;
  matchType: "code_barres" | "produit_marque";
  confidence: number;
  learnedFields: string[];
  category: string;
  productType: ProductType;
  storageZone: string;
  result: LabelOcrResult;
}

const STABLE_FIELDS = [
  "produit", "marque", "fournisseur", "temperature_conservation",
  "conservation_apres_ouverture", "allergenes", "ingredients",
  "conditionnement", "code_barres", "mentions_tracabilite",
] as const;

export function applyProductMemory(
  ocr: LabelOcrResult,
  openings: RawMaterialOpening[],
): ProductMemoryMatch | null {
  const candidates = openings
    .filter((opening) => opening.validationStatus !== "À vérifier")
    .filter((opening) => opening.materialName.trim())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const exactBarcode = ocr.code_barres
    ? candidates.find((opening) => normalizeBarcode(opening.barcode) === normalizeBarcode(ocr.code_barres))
    : undefined;
  const fuzzy = exactBarcode ? undefined : findFuzzyMatch(ocr, candidates);
  const opening = exactBarcode ?? fuzzy?.opening;
  if (!opening) return null;

  const learned = openingToOcr(opening);
  const result = { ...ocr, scores_par_champ: { ...ocr.scores_par_champ } };
  const learnedFields: string[] = [];
  for (const field of STABLE_FIELDS) {
    const learnedValue = learned[field];
    if (!hasValue(learnedValue)) continue;
    const currentValue = result[field];
    const currentScore = result.scores_par_champ[field] ?? 0;
    if (hasValue(currentValue) && currentScore >= 85 && field !== "produit" && field !== "marque") continue;
    assignField(result, field, learnedValue);
    result.scores_par_champ[field] = 96;
    learnedFields.push(field);
  }
  result.champs_incertains = result.champs_incertains.filter((field) => !learnedFields.includes(field));
  result.score_confiance_global = Math.max(result.score_confiance_global, learnedFields.length ? 88 : 0);

  return {
    sourceOpeningId: opening.id,
    matchType: exactBarcode ? "code_barres" : "produit_marque",
    confidence: exactBarcode ? 100 : Math.round((fuzzy?.score ?? 0) * 100),
    learnedFields,
    category: opening.category,
    productType: opening.productType,
    storageZone: opening.storageZone,
    result,
  };
}

function findFuzzyMatch(ocr: LabelOcrResult, openings: RawMaterialOpening[]) {
  const product = normalizeText(ocr.produit);
  const brand = normalizeText(ocr.marque);
  if (product.length < 5) return undefined;
  let best: { opening: RawMaterialOpening; score: number } | undefined;
  for (const opening of openings) {
    const productScore = tokenSimilarity(product, normalizeText(opening.materialName));
    const brandScore = brand && opening.brand
      ? tokenSimilarity(brand, normalizeText(opening.brand))
      : 0;
    const score = brand && opening.brand ? productScore * 0.75 + brandScore * 0.25 : productScore;
    if (score >= 0.72 && (!best || score > best.score)) best = { opening, score };
  }
  return best;
}

function openingToOcr(opening: RawMaterialOpening): LabelOcrResult {
  return {
    produit: opening.materialName,
    marque: opening.brand ?? "",
    fournisseur: opening.supplier,
    numero_lot: "",
    dlc_ddm: "",
    type_date: "Non précisé",
    temperature_conservation: opening.storageTemperature ?? "",
    conservation_apres_ouverture: opening.afterOpeningStorage ?? "",
    allergenes: opening.allergens ?? [],
    ingredients: opening.ingredients ?? "",
    conditionnement: opening.packaging ?? "",
    code_barres: opening.barcode ?? "",
    mentions_tracabilite: opening.traceabilityNotes ?? "",
    champs_incertains: [],
    scores_par_champ: {},
    score_confiance_global: 0,
    qualite_image: "lisible",
  };
}

function tokenSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 1));
  const rightTokens = new Set(right.split(" ").filter((token) => token.length > 1));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union ? intersection / union : 0;
  const containment = left.includes(right) || right.includes(left) ? 0.9 : 0;
  return Math.max(tokenScore, containment);
}

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeBarcode(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

function hasValue(value: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value.trim());
}

function assignField(
  result: LabelOcrResult,
  field: typeof STABLE_FIELDS[number],
  value: string | string[],
) {
  if (field === "allergenes") result.allergenes = value as string[];
  else result[field] = value as string;
}
