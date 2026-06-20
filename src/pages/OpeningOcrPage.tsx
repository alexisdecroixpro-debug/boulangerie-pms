import {
  Camera, CheckCircle2, ImagePlus, LoaderCircle, RotateCcw, ScanLine, TriangleAlert, X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import { EMPTY_OCR_RESULT, isUncertain, validateOpeningDraft, type LabelOcrResult } from "../domain/ocr";
import { applyProductMemory, type ProductMemoryMatch } from "../domain/productMemory";
import { generateRawMaterialLot } from "../domain/lotRules";
import type { HygieneData, RawMaterialOpening } from "../domain/types";
import { analyzeLabelPhotos } from "../utils/imageOcr";
import { uploadAttachments } from "../utils/attachments";

const nowLocal = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function OpeningOcrPage({
  data,
  setData,
  operatorName,
  onBack,
  onSaved,
}: {
  data: HygieneData;
  setData: (updater: (data: HygieneData) => HygieneData) => void;
  operatorName: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [result, setResult] = useState<LabelOcrResult | null>(null);
  const [memoryMatch, setMemoryMatch] = useState<ProductMemoryMatch | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    setPhotos((current) => [...current, ...selected].slice(0, 4));
    setError("");
    event.target.value = "";
  };

  const analyze = async () => {
    if (!photos.length) {
      setError("Ajoutez au moins une photo de l’étiquette.");
      return;
    }
    setAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStatus("Chargement du moteur OCR local");
    setError("");
    try {
      const next = await analyzeLabelPhotos(photos, (progress, status) => {
        setAnalysisProgress(progress);
        setAnalysisStatus(status);
      });
      if (next.qualite_image === "illisible") {
        setResult(null);
        setError("Photo illisible, veuillez reprendre une photo.");
        return;
      }
      const learned = applyProductMemory(next, data.openings);
      setMemoryMatch(learned);
      setResult(learned?.result ?? next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analyse OCR impossible.");
    } finally {
      setAnalyzing(false);
      setAnalysisStatus("");
    }
  };

  const reset = () => {
    setPhotos([]);
    setResult(null);
    setMemoryMatch(null);
    setError("");
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-date">Traçabilité assistée</p>
          <h1>OCR ouverture matière première</h1>
          <p>La photo préremplit le registre. Rien n’est enregistré avant votre validation.</p>
        </div>
        <button className="button button--secondary" onClick={onBack}>Retour au registre</button>
      </header>

      <section className="ocr-layout">
        <div className="panel ocr-capture">
          <div className="ocr-title"><ScanLine size={23} /><div><h2>Scanner une étiquette</h2><p>Cadrez le nom, le lot et la DLC/DDM. Ajoutez plusieurs faces si nécessaire.</p></div></div>
          <div className="camera-guide">
            {previews.length
              ? <div className="photo-grid">{previews.map((preview, index) => (
                <figure key={preview}>
                  <img src={preview} alt={`Étiquette ${index + 1}`} />
                  <button type="button" aria-label={`Retirer la photo ${index + 1}`} onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={17} /></button>
                </figure>
              ))}</div>
              : <div className="camera-guide__empty"><Camera size={42} /><strong>Placez l’étiquette dans le cadre</strong><span>Évitez les reflets et vérifiez la netteté.</span></div>}
          </div>
          <div className="ocr-actions">
            <label className="button button--primary file-button"><Camera size={19} /> Prendre une photo<Input type="file" accept="image/*" capture="environment" onChange={addPhotos} /></label>
            <label className="button button--secondary file-button"><ImagePlus size={19} /> Importer<Input type="file" accept="image/*" multiple onChange={addPhotos} /></label>
            {photos.length > 0 && <button className="button button--secondary" type="button" onClick={reset}><RotateCcw size={18} /> Reprendre</button>}
          </div>
          <button className="button button--primary ocr-analyze" type="button" disabled={!photos.length || analyzing} onClick={() => void analyze()}>
            {analyzing ? <><LoaderCircle className="spin" size={19} /> {analysisStatus} · {analysisProgress}%</> : <><ScanLine size={19} /> Analyser {photos.length > 1 ? `${photos.length} photos` : "l’étiquette"}</>}
          </button>
          {error && <p className="ocr-error" role="alert"><TriangleAlert size={18} /> {error}</p>}
          <p className="ocr-privacy">OCR gratuit exécuté sur cet appareil : les photos ne sont envoyées à aucun service d’analyse. Les photos source sont liées au registre uniquement après validation.</p>
        </div>

        <div className="panel ocr-result">
          {result
            ? <OpeningReviewForm
                result={result}
                memoryMatch={memoryMatch}
                photos={photos}
                operatorName={operatorName}
                saving={saving}
                setSaving={setSaving}
                setError={setError}
                setData={setData}
                onSaved={onSaved}
              />
            : <div className="ocr-placeholder"><ScanLine size={44} /><h2>Résultat OCR</h2><p>Analysez une photo ou choisissez « Saisie manuelle » pour compléter le formulaire vous-même.</p><button className="button button--secondary" onClick={() => { setMemoryMatch(null); setResult({ ...EMPTY_OCR_RESULT }); }}>Saisie manuelle</button></div>}
        </div>
      </section>
    </>
  );
}

function OpeningReviewForm({
  result,
  memoryMatch,
  photos,
  operatorName,
  saving,
  setSaving,
  setError,
  setData,
  onSaved,
}: {
  result: LabelOcrResult;
  memoryMatch: ProductMemoryMatch | null;
  photos: File[];
  operatorName: string;
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string) => void;
  setData: (updater: (data: HygieneData) => HygieneData) => void;
  onSaved: () => void;
}) {
  const [openedAt, setOpenedAt] = useState(nowLocal());
  const [produit, setProduit] = useState(result.produit);
  const [numeroLot, setNumeroLot] = useState(result.numero_lot);
  const [dateFournisseur, setDateFournisseur] = useState(result.dlc_ddm);
  const [justificationLot, setJustificationLot] = useState("");
  const [justificationDate, setJustificationDate] = useState("");
  const internalLot = useMemo(() => generateRawMaterialLot(openedAt, produit), [openedAt, produit]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors = validateOpeningDraft({ produit, numeroLot, dateFournisseur, justificationLot, justificationDate });
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    if (!photos.length) {
      setError("La photo source est obligatoire avant validation.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const id = crypto.randomUUID();
      const attachments = await uploadAttachments(id, photos);
      const now = new Date().toISOString();
      const record: RawMaterialOpening = {
        id,
        createdAt: now,
        updatedAt: now,
        createdBy: operatorName,
        updatedBy: operatorName,
        status: "Fait",
        attachments,
        openedAt,
        materialName: produit.trim(),
        brand: String(form.get("marque") || "").trim(),
        category: String(form.get("category") || "Autre"),
        productType: String(form.get("productType") || "Autre") as RawMaterialOpening["productType"],
        supplier: String(form.get("fournisseur") || "").trim(),
        supplierLot: numeroLot.trim(),
        noSupplierLot: !numeroLot.trim(),
        missingLotJustification: justificationLot.trim(),
        supplierExpiry: dateFournisseur || undefined,
        dateType: String(form.get("typeDate")) as RawMaterialOpening["dateType"],
        missingExpiryJustification: justificationDate.trim(),
        storageTemperature: String(form.get("temperatureConservation") || "").trim(),
        afterOpeningStorage: String(form.get("conservationApresOuverture") || "").trim(),
        allergens: String(form.get("allergenes") || "").split(",").map((item) => item.trim()).filter(Boolean),
        ingredients: String(form.get("ingredients") || "").trim(),
        packaging: String(form.get("conditionnement") || "").trim(),
        barcode: String(form.get("codeBarres") || "").trim(),
        traceabilityNotes: String(form.get("mentionsTracabilite") || "").trim(),
        quantity: Number(form.get("quantity")),
        unit: String(form.get("unit")),
        internalExpiry: String(form.get("internalExpiry")),
        storageZone: String(form.get("storageZone")),
        internalLot,
        operator: operatorName,
        validationStatus: "Validé",
        ocrConfidence: result.score_confiance_global,
        ocrFieldConfidences: result.scores_par_champ,
        ocrUncertainFields: result.champs_incertains,
        comments: String(form.get("comments") || "").trim(),
      };
      setData((current) => ({ ...current, openings: [record, ...current.openings] }));
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible. La photo est conservée à l’écran.");
    } finally {
      setSaving(false);
    }
  };

  return <form className="form-grid ocr-form" onSubmit={(event) => void submit(event)}>
    <div className="ocr-result__header field--wide">
      <div><h2>Vérifier les informations</h2><p>Corrigez chaque valeur avant validation.</p></div>
      <span className={`confidence confidence--${result.score_confiance_global >= 70 ? "good" : "warning"}`}>{result.score_confiance_global}% confiance</span>
    </div>
    {memoryMatch && <p className="memory-notice field--wide"><CheckCircle2 size={17} /> Produit reconnu grâce à une validation précédente ({memoryMatch.matchType === "code_barres" ? "code-barres identique" : `${memoryMatch.confidence}% de correspondance`}). Vérifiez le lot et la date, qui ne sont jamais mémorisés.</p>}
    {result.champs_incertains.length > 0 && <p className="form-notice field--wide"><TriangleAlert size={17} /> Champs à vérifier : {result.champs_incertains.join(", ")}.</p>}
    <OcrField label="Produit *" field="produit" result={result}><Input required value={produit} onChange={(event) => setProduit(event.target.value)} /></OcrField>
    <OcrField label="Marque" field="marque" result={result}><Input name="marque" defaultValue={result.marque} /></OcrField>
    <OcrField label="Fournisseur" field="fournisseur" result={result}><Input name="fournisseur" defaultValue={result.fournisseur} /></OcrField>
    <Field label="Date et heure d’ouverture *"><Input type="datetime-local" required value={openedAt} onChange={(event) => setOpenedAt(event.target.value)} /></Field>
    <OcrField label="Numéro de lot" field="numero_lot" result={result}><Input value={numeroLot} onChange={(event) => setNumeroLot(event.target.value)} /></OcrField>
    {!numeroLot.trim() && <Field label="Justification absence de lot *"><Input required value={justificationLot} onChange={(event) => setJustificationLot(event.target.value)} placeholder="Ex. produit local sans lot fournisseur" /></Field>}
    <OcrField label="DLC / DDM fournisseur" field="dlc_ddm" result={result}><Input type="date" value={dateFournisseur} onChange={(event) => setDateFournisseur(event.target.value)} /></OcrField>
    {!dateFournisseur && <Field label="Justification absence de date *"><Input required value={justificationDate} onChange={(event) => setJustificationDate(event.target.value)} placeholder="Ex. date illisible sur l’emballage" /></Field>}
    <Field label="Type de date"><Select name="typeDate" defaultValue={result.type_date}><option>DLC</option><option>DDM</option><option>Non précisé</option></Select></Field>
    <OcrField label="Température de conservation" field="temperature_conservation" result={result}><Input name="temperatureConservation" defaultValue={result.temperature_conservation} /></OcrField>
    <OcrField label="Après ouverture" field="conservation_apres_ouverture" result={result} wide><Textarea name="conservationApresOuverture" defaultValue={result.conservation_apres_ouverture} /></OcrField>
    <OcrField label="Allergènes" field="allergenes" result={result} wide><Input name="allergenes" defaultValue={result.allergenes.join(", ")} /></OcrField>
    <OcrField label="Ingrédients" field="ingredients" result={result} wide><Textarea name="ingredients" defaultValue={result.ingredients} rows={5} /></OcrField>
    <OcrField label="Conditionnement / poids net" field="conditionnement" result={result}><Input name="conditionnement" defaultValue={result.conditionnement} /></OcrField>
    <OcrField label="Code-barres" field="code_barres" result={result}><Input name="codeBarres" inputMode="numeric" defaultValue={result.code_barres} /></OcrField>
    <OcrField label="Mentions utiles à la traçabilité" field="mentions_tracabilite" result={result} wide><Textarea name="mentionsTracabilite" defaultValue={result.mentions_tracabilite} /></OcrField>
    <Field label="Type de produit *"><Select name="productType" defaultValue={memoryMatch?.productType ?? "Sec"}>{["Sec", "Frais", "Surgelé", "Produit d’origine animale", "Fruit / légume local", "Autre"].map((value) => <option key={value}>{value}</option>)}</Select></Field>
    <Field label="Catégorie *"><Select name="category" defaultValue={memoryMatch?.category ?? "Farine"}>{withLearnedOption(["Farine", "Produits laitiers", "Œufs", "Fruits", "Fruits locaux", "Chocolat", "Crème", "Beurre", "Garniture", "Autre"], memoryMatch?.category).map((value) => <option key={value}>{value}</option>)}</Select></Field>
    <Field label="Quantité ouverte *"><div className="input-pair"><Input name="quantity" type="number" min="0.001" step="0.001" defaultValue="1" required /><Select name="unit">{["kg", "g", "L", "pièce", "seau", "carton"].map((value) => <option key={value}>{value}</option>)}</Select></div></Field>
    <Field label="Zone de stockage *"><Select name="storageZone" defaultValue={memoryMatch?.storageZone ?? "Sec"}>{["Sec", "Froid positif", "Froid négatif", "Laboratoire", "Réserve"].map((value) => <option key={value}>{value}</option>)}</Select></Field>
    <Field label="DLC interne après ouverture *"><Input name="internalExpiry" type="date" required /></Field>
    <Field label="Lot interne généré"><Input value={internalLot} readOnly className="generated-value" /></Field>
    <Field label="Remarques" wide><Textarea name="comments" /></Field>
    <p className="human-validation field--wide"><CheckCircle2 size={18} /> En cliquant sur « Valider l’ouverture », vous confirmez avoir contrôlé les informations sensibles et réglementaires.</p>
    <div className="form-actions field--wide">
      <button className="button button--primary" disabled={saving} type="submit">{saving ? "Enregistrement…" : "Valider l’ouverture"}</button>
    </div>
  </form>;
}

function OcrField({
  label,
  field,
  result,
  children,
  wide = false,
}: {
  label: string;
  field: string;
  result: LabelOcrResult;
  children: ReactNode;
  wide?: boolean;
}) {
  const uncertain = isUncertain(result, field);
  return <div className={`ocr-field${wide ? " field--wide" : ""}${uncertain ? " ocr-field--uncertain" : ""}`}>
    <div className="ocr-field__label"><span>{label}</span><small>{result.scores_par_champ[field] ?? 0}%</small></div>
    {children}
    {uncertain && <span className="ocr-field__warning"><TriangleAlert size={14} /> À vérifier</span>}
  </div>;
}

function withLearnedOption(options: string[], learned?: string) {
  return learned && !options.includes(learned) ? [learned, ...options] : options;
}
