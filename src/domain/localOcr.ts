import { normalizeOcrResult, type LabelOcrResult, type OcrDateType } from "./ocr";

const FIELDS = [
  "produit", "marque", "fournisseur", "numero_lot", "dlc_ddm", "type_date",
  "temperature_conservation", "conservation_apres_ouverture", "allergenes",
  "ingredients", "conditionnement", "code_barres", "mentions_tracabilite",
] as const;

const EXCLUDED_PRODUCT_WORDS = [
  "LOT", "DLC", "DDM", "INGREDIENT", "ALLERGEN", "CONSERVER", "CONSERVATION",
  "POIDS", "NET", "FABRIQUE", "DISTRIBUE", "CONSOMMER", "ORIGINE",
];

export function extractStructuredLabel(text: string, ocrConfidence: number): LabelOcrResult {
  const lines = cleanLines(text);
  const lotLine = findLine(lines, /\b(?:lot|n[°o]\s*lot|batch)\b/i);
  const expiryLine = findLine(lines, /(?:à consommer|a consommer|use by|best before|dlc|ddm)/i);
  const ingredientsLine = findSection(lines, /^(?:ingredients?|ingrédients?)\s*[:-]/i);
  const allergensLine = findSection(lines, /^(?:allerg[eè]nes?|contient|allergens?)\s*[:-]/i);
  const temperatureLine = findLine(lines, /(?:conserver|conservation|store|storage).{0,60}(?:°|degr|c\b)/i);
  const afterOpeningLine = findLine(lines, /(?:apr[eè]s ouverture|une fois ouvert|after opening|once opened)/i);
  const supplierLine = findLine(lines, /(?:fabriqu[eé]\s+par|conditionn[eé]\s+par|distribu[eé]\s+par|fournisseur|supplier)/i);
  const packagingLine = findLine(lines, /(?:poids net|contenance|net weight|volume net|\b\d+(?:[,.]\d+)?\s*(?:kg|g|mg|l|ml|cl)\b)/i);
  const typeDate = detectDateType(expiryLine);
  const date = extractDate(expiryLine);
  const lot = extractAfterLabel(lotLine, /(?:n[°o]\s*)?lot|batch/i);
  const supplier = extractAfterLabel(supplierLine, /(?:fabriqu[eé]\s+par|conditionn[eé]\s+par|distribu[eé]\s+par|fournisseur|supplier)/i);
  const ingredients = extractAfterLabel(ingredientsLine, /ingr[eé]dients?/i);
  const allergens = splitList(extractAfterLabel(allergensLine, /(?:allerg[eè]nes?|contient|allergens?)/i));
  const brandLine = findBrandLine(lines);
  const productLine = findProductLine(lines, brandLine);
  const barcode = findBarcode(lines);
  const traceability = lines.filter((line) =>
    /(?:origine|agr[eé]ment|estampille|fabriqu[eé]\s+en|conditionn[eé]\s+en|pays d'origine)/i.test(line)
  ).join(" | ");

  const explicit: Record<typeof FIELDS[number], boolean> = {
    produit: Boolean(productLine),
    marque: Boolean(brandLine),
    fournisseur: Boolean(supplier),
    numero_lot: Boolean(lot),
    dlc_ddm: Boolean(date),
    type_date: typeDate !== "Non précisé",
    temperature_conservation: Boolean(temperatureLine),
    conservation_apres_ouverture: Boolean(afterOpeningLine),
    allergenes: allergens.length > 0,
    ingredients: Boolean(ingredients),
    conditionnement: Boolean(packagingLine),
    code_barres: Boolean(barcode),
    mentions_tracabilite: Boolean(traceability),
  };
  const scores = Object.fromEntries(FIELDS.map((field) => [
    field,
    explicit[field] ? fieldScore(field, ocrConfidence) : 0,
  ])) as Record<string, number>;
  const uncertain = FIELDS.filter((field) => !explicit[field] || scores[field] < 70);
  const quality = text.trim().length < 25 || ocrConfidence < 25
    ? "illisible"
    : ocrConfidence >= 65 ? "lisible" : "partielle";

  return normalizeOcrResult({
    produit: productLine,
    marque: brandLine,
    fournisseur: supplier,
    numero_lot: lot,
    dlc_ddm: date,
    type_date: typeDate,
    temperature_conservation: temperatureLine,
    conservation_apres_ouverture: afterOpeningLine,
    allergenes: allergens,
    ingredients,
    conditionnement: packagingLine,
    code_barres: barcode,
    mentions_tracabilite: traceability,
    champs_incertains: uncertain,
    scores_par_champ: scores,
    score_confiance_global: Math.round(ocrConfidence),
    qualite_image: quality,
  });
}

function cleanLines(text: string) {
  return text.split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").replace(/^[|:;,\-.\s]+|[|:;,\-.\s]+$/g, "").trim())
    .filter((line) => line.length >= 2);
}

function findLine(lines: string[], pattern: RegExp) {
  return lines.find((line) => pattern.test(line)) ?? "";
}

function findSection(lines: string[], pattern: RegExp) {
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) return "";
  const section = [lines[index]];
  for (let offset = 1; offset <= 2; offset += 1) {
    const line = lines[index + offset];
    if (!line || /^(?:lot|dlc|ddm|allerg|conserv|poids|fabriqu|distribu|\d[\d\s]{7})/i.test(line)) break;
    section.push(line);
  }
  return section.join(" ");
}

function findProductLine(lines: string[], brand: string) {
  return lines
    .filter((line) => line !== brand)
    .filter((line) => line.length >= 4 && line.length <= 90)
    .filter((line) => !EXCLUDED_PRODUCT_WORDS.some((word) => normalizedUpper(line).includes(word)))
    .filter((line) => !/\b\d{6,}\b/.test(line))
    .sort((a, b) => productRank(b) - productRank(a))[0] ?? "";
}

function findBrandLine(lines: string[]) {
  return lines.slice(0, 5).find((line) =>
    line.length >= 3
    && line.length <= 55
    && !EXCLUDED_PRODUCT_WORDS.some((word) => normalizedUpper(line).includes(word))
    && !/\b\d{4,}\b/.test(line)
  ) ?? "";
}

function productRank(line: string) {
  const letters = (line.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  const uppercase = (line.match(/[A-ZÀ-Þ]/g) ?? []).length;
  return letters + (uppercase / Math.max(letters, 1)) * 25 - Math.abs(line.length - 28) / 4;
}

function normalizedUpper(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function extractAfterLabel(line: string, label: RegExp) {
  if (!line) return "";
  return line
    .replace(new RegExp(`^.*?(?:${label.source})\\s*(?:n[°o])?\\s*[:#-]?\\s*`, "i"), "")
    .replace(/^[\s:#-]+/, "")
    .trim();
}

function extractDate(line: string) {
  const match = line.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (!match) return "";
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function detectDateType(line: string): OcrDateType {
  if (/(?:de pr[eé]f[eé]rence|best before|ddm)/i.test(line)) return "DDM";
  if (/(?:à consommer jusqu|a consommer jusqu|use by|dlc)/i.test(line)) return "DLC";
  return "Non précisé";
}

function findBarcode(lines: string[]) {
  const candidates: string[] = [];
  for (const line of lines) {
    if (/\b(?:lot|batch)\b/i.test(line)) continue;
    const digits = line.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 14 && !/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(line)) {
      candidates.push(digits);
    }
  }
  return candidates.sort((a, b) => b.length - a.length)[0] ?? "";
}

function splitList(value: string) {
  return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function fieldScore(field: typeof FIELDS[number], confidence: number) {
  const patternBonus = ["numero_lot", "dlc_ddm", "type_date", "code_barres"].includes(field) ? 12 : 4;
  return Math.min(98, Math.round(confidence + patternBonus));
}
