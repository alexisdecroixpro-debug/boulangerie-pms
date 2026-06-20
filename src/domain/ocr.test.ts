import { describe, expect, it } from "vitest";
import { extractStructuredLabel } from "./localOcr";
import { isUncertain, normalizeOcrResult, validateOpeningDraft } from "./ocr";
import { applyProductMemory } from "./productMemory";
import type { RawMaterialOpening } from "./types";

describe("normalizeOcrResult", () => {
  it("normalise une date française et borne les scores", () => {
    const result = normalizeOcrResult({
      produit: " Crème entière ",
      marque: "Laiterie test",
      numero_lot: "LOT-2406",
      dlc_ddm: "18/06/2026",
      type_date: "DLC",
      allergenes: [" lait ", ""],
      code_barres: "3 760123 456789",
      scores_par_champ: { produit: 105, numero_lot: 68 },
      score_confiance_global: 82.4,
      qualite_image: "lisible",
    });

    expect(result.produit).toBe("Crème entière");
    expect(result.dlc_ddm).toBe("2026-06-18");
    expect(result.allergenes).toEqual(["lait"]);
    expect(result.code_barres).toBe("3760123456789");
    expect(result.scores_par_champ.produit).toBe(100);
    expect(result.score_confiance_global).toBe(82);
    expect(isUncertain(result, "numero_lot")).toBe(true);
  });

  it("laisse vide ce qui n'est pas détecté", () => {
    const result = normalizeOcrResult({ produit: null, type_date: "inconnu" });
    expect(result.produit).toBe("");
    expect(result.dlc_ddm).toBe("");
    expect(result.type_date).toBe("Non précisé");
  });
});

describe("validateOpeningDraft", () => {
  it("accepte les absences justifiées", () => {
    expect(validateOpeningDraft({
      produit: "Farine locale",
      numeroLot: "",
      dateFournisseur: "",
      justificationLot: "Produit local sans lot fournisseur",
      justificationDate: "DDM non indiquée",
    })).toEqual([]);
  });

  it("bloque les champs critiques sans valeur ni justification", () => {
    expect(validateOpeningDraft({
      produit: "",
      numeroLot: "",
      dateFournisseur: "",
      justificationLot: "",
      justificationDate: "",
    })).toHaveLength(3);
  });
});

describe("extractStructuredLabel", () => {
  it("structure une étiquette fournisseur sans inventer les champs absents", () => {
    const result = extractStructuredLabel(`
      LAITERIE DES ALPES
      CRÈME ENTIÈRE 35% MG
      Poids net : 1 L
      LOT : LA260615-42
      À CONSOMMER JUSQU'AU : 22/06/2026
      À conserver entre 0°C et +4°C.
      Après ouverture : conserver au froid et utiliser sous 3 jours.
      Ingrédients : CRÈME de LAIT, stabilisant : carraghénanes.
      ALLERGÈNES : LAIT
      3 760123 456789
    `, 86);

    expect(result.produit).toBe("CRÈME ENTIÈRE 35% MG");
    expect(result.marque).toBe("LAITERIE DES ALPES");
    expect(result.numero_lot).toBe("LA260615-42");
    expect(result.dlc_ddm).toBe("2026-06-22");
    expect(result.type_date).toBe("DLC");
    expect(result.temperature_conservation).toContain("0°C");
    expect(result.allergenes).toEqual(["LAIT"]);
    expect(result.conditionnement).toContain("1 L");
    expect(result.code_barres).toBe("3760123456789");
    expect(result.fournisseur).toBe("");
  });
});

describe("applyProductMemory", () => {
  const learnedOpening: RawMaterialOpening = {
    id: "opening-1",
    createdAt: "2026-06-15T10:00:00Z",
    updatedAt: "2026-06-15T10:00:00Z",
    createdBy: "Alexis",
    status: "Fait",
    openedAt: "2026-06-15T10:00",
    materialName: "Crème entière 35% MG",
    brand: "Laiterie des Alpes",
    category: "Crème",
    productType: "Frais",
    supplier: "Grossiste Alpes",
    supplierLot: "ANCIEN-LOT",
    noSupplierLot: false,
    supplierExpiry: "2026-06-20",
    storageTemperature: "Entre 0°C et +4°C",
    afterOpeningStorage: "Utiliser sous 3 jours",
    allergens: ["Lait"],
    ingredients: "Crème de lait",
    packaging: "1 L",
    barcode: "3760123456789",
    quantity: 1,
    unit: "L",
    internalExpiry: "2026-06-18",
    storageZone: "Froid positif",
    internalLot: "MP-TEST",
    operator: "Alexis",
    validationStatus: "Validé",
  };

  it("réutilise les corrections stables avec un code-barres identique", () => {
    const ocr = normalizeOcrResult({
      produit: "CREME ENTIERE",
      numero_lot: "NOUVEAU-LOT",
      dlc_ddm: "2026-07-01",
      type_date: "DLC",
      code_barres: "3 760123 456789",
      scores_par_champ: { produit: 62, numero_lot: 90, dlc_ddm: 91, code_barres: 95 },
      champs_incertains: ["produit", "fournisseur"],
      score_confiance_global: 64,
    });

    const match = applyProductMemory(ocr, [learnedOpening]);
    expect(match?.matchType).toBe("code_barres");
    expect(match?.result.produit).toBe("Crème entière 35% MG");
    expect(match?.result.fournisseur).toBe("Grossiste Alpes");
    expect(match?.result.numero_lot).toBe("NOUVEAU-LOT");
    expect(match?.result.dlc_ddm).toBe("2026-07-01");
    expect(match?.storageZone).toBe("Froid positif");
  });

  it("refuse une correspondance produit trop faible", () => {
    const ocr = normalizeOcrResult({ produit: "Farine de seigle", marque: "Moulin Central" });
    expect(applyProductMemory(ocr, [learnedOpening])).toBeNull();
  });
});
