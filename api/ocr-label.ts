import { authenticatedUser, HttpError, sendError } from "./_supabase.js";
import type { ApiRequest, ApiResponse } from "./_types.js";

declare const process: { env: Record<string, string | undefined> };

const OCR_SCHEMA = {
  type: "object",
  properties: {
    produit: { type: "string" },
    marque: { type: "string" },
    fournisseur: { type: "string" },
    numero_lot: { type: "string" },
    dlc_ddm: { type: "string", description: "Date ISO YYYY-MM-DD, ou chaîne vide." },
    type_date: { type: "string", enum: ["DLC", "DDM", "Non précisé"] },
    temperature_conservation: { type: "string" },
    conservation_apres_ouverture: { type: "string" },
    allergenes: { type: "array", items: { type: "string" } },
    ingredients: { type: "string" },
    conditionnement: { type: "string" },
    code_barres: { type: "string" },
    mentions_tracabilite: { type: "string" },
    champs_incertains: { type: "array", items: { type: "string" } },
    scores_par_champ: {
      type: "object",
      properties: {
        produit: { type: "integer", minimum: 0, maximum: 100 },
        marque: { type: "integer", minimum: 0, maximum: 100 },
        fournisseur: { type: "integer", minimum: 0, maximum: 100 },
        numero_lot: { type: "integer", minimum: 0, maximum: 100 },
        dlc_ddm: { type: "integer", minimum: 0, maximum: 100 },
        type_date: { type: "integer", minimum: 0, maximum: 100 },
        temperature_conservation: { type: "integer", minimum: 0, maximum: 100 },
        conservation_apres_ouverture: { type: "integer", minimum: 0, maximum: 100 },
        allergenes: { type: "integer", minimum: 0, maximum: 100 },
        ingredients: { type: "integer", minimum: 0, maximum: 100 },
        conditionnement: { type: "integer", minimum: 0, maximum: 100 },
        code_barres: { type: "integer", minimum: 0, maximum: 100 },
        mentions_tracabilite: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: [
        "produit", "marque", "fournisseur", "numero_lot", "dlc_ddm", "type_date",
        "temperature_conservation", "conservation_apres_ouverture", "allergenes",
        "ingredients", "conditionnement", "code_barres", "mentions_tracabilite",
      ],
      additionalProperties: false,
    },
    score_confiance_global: { type: "integer", minimum: 0, maximum: 100 },
    qualite_image: { type: "string", enum: ["lisible", "partielle", "illisible"] },
  },
  required: [
    "produit", "marque", "fournisseur", "numero_lot", "dlc_ddm", "type_date",
    "temperature_conservation", "conservation_apres_ouverture", "allergenes",
    "ingredients", "conditionnement", "code_barres", "mentions_tracabilite",
    "champs_incertains", "scores_par_champ", "score_confiance_global", "qualite_image",
  ],
  additionalProperties: false,
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  try {
    await authenticatedUser(request);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new HttpError(503, "Le service OCR n’est pas configuré.");

    const images = Array.isArray(request.body?.images)
      ? request.body.images.filter((item): item is string => typeof item === "string")
      : [];
    if (!images.length) throw new HttpError(400, "Ajoutez au moins une photo.");
    if (images.length > 4) throw new HttpError(400, "Quatre photos maximum par analyse.");
    if (images.some((image) => !/^data:image\/(jpeg|png|webp);base64,/i.test(image))) {
      throw new HttpError(400, "Format d’image non pris en charge.");
    }

    const content = [
      {
        type: "input_text",
        text: [
          "Analyse ces photos d’une même étiquette ou d’un même emballage fournisseur.",
          "Extrais uniquement les informations réellement visibles. N’invente et ne déduis aucune valeur absente.",
          "Une chaîne vide signifie non détecté. Une date doit être au format YYYY-MM-DD ou vide.",
          "Distingue DLC (à consommer jusqu’au) et DDM (à consommer de préférence avant).",
          "Ajoute aux champs incertains toute valeur floue, partielle, ambiguë ou issue d’un code-barres non parfaitement lisible.",
          "Un score de 0 signifie absent/illisible, 100 parfaitement explicite.",
          "Si les photos sont globalement trop floues pour la traçabilité, utilise qualite_image=illisible.",
        ].join(" "),
      },
      ...images.map((image) => ({ type: "input_image", image_url: image, detail: "high" })),
    ];

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_OCR_MODEL || "gpt-5.5",
        store: false,
        reasoning: { effort: "low" },
        input: [{ role: "user", content }],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "bakery_label_ocr",
            strict: true,
            schema: OCR_SCHEMA,
          },
        },
      }),
    });

    const payload = await openAiResponse.json() as Record<string, unknown>;
    if (!openAiResponse.ok) {
      const apiError = payload.error as { message?: string } | undefined;
      throw new HttpError(502, apiError?.message || "Le service OCR n’a pas répondu.");
    }
    const outputText = extractOutputText(payload);
    if (!outputText) throw new HttpError(502, "Réponse OCR vide.");
    response.status(200).json(JSON.parse(outputText));
  } catch (error) {
    sendError(response, error);
  }
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  return "";
}
