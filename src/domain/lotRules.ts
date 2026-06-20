const FAMILY_CODES: Record<string, string> = {
  pain: "BOU",
  boulangerie: "BOU",
  viennoiserie: "VIE",
  pâtisserie: "PAT",
  snacking: "SNK",
  confiture: "CONF",
  biscuiterie: "DIV",
  "pièce montée": "PM",
  autre: "DIV",
  divers: "DIV",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const compactDate = (value: string) => {
  const localDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const [year, month, day] = (localDate ?? new Date(value).toISOString().slice(0, 10)).split("-");
  return `${day}${month}${year.slice(2)}`;
};

const compactTime = (value: string) => {
  const localTime = value.match(/T(\d{2}):(\d{2})/)?.slice(1, 3);
  if (localTime) return localTime.join("");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000";
  return `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
};

export const generateRawMaterialLot = (date: string, product: string) =>
  `MP-${compactDate(date)}-${normalize(product || "PRODUIT")}`;

export const generateInternalBatchLot = (
  family: string,
  date: string,
  product: string,
) =>
  `${FAMILY_CODES[family.toLowerCase()] ?? "DIV"}-${compactDate(date)}-${compactTime(date)}-${normalize(product || "PRODUIT")}`;

export const generateDeliveryLot = (date: string, supplier: string, product: string) =>
  `REC-${compactDate(date)}-${normalize(supplier || "FOURNISSEUR")}-${normalize(product || "PRODUIT")}`;
