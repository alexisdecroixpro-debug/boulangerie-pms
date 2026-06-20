import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type {
  CleaningTask, DeliveryCheck, HygieneData, InternalBatch, NonConformity,
  ProcedureDocument, RawMaterialOpening, ShelfLifeRule, TemperatureCheck,
} from "../domain/types";
import { generateDeliveryLot, generateInternalBatchLot, generateRawMaterialLot } from "../domain/lotRules";
import { uploadAttachments } from "../utils/attachments";
import { Field, Input, Select, Textarea } from "./FormFields";
import { Modal } from "./Modal";
import type { QuickForm } from "../types/navigation";

const dateTime = () => new Date().toISOString().slice(0, 16);
const today = () => new Date().toISOString().slice(0, 10);
const option = (value: string) => <option value={value} key={value}>{value}</option>;
const PRODUCT_TYPES = ["Sec", "Frais", "Surgelé", "Produit d’origine animale", "Fruit / légume local", "Autre"];

const makeAudit = (status: RawMaterialOpening["status"], operatorName: string, id = crypto.randomUUID()) => ({
  id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  createdBy: operatorName, updatedBy: operatorName, status,
});

export function QuickForms({ form, data, close, setData, operatorName }: {
  form: QuickForm | null; data: HygieneData; close: () => void;
  setData: (updater: (data: HygieneData) => HygieneData) => void; operatorName: string;
}) {
  if (!form) return null;
  const props = { close, setData, operatorName };
  if (form === "opening") return <OpeningForm {...props} />;
  if (form === "batch") return <BatchForm {...props} data={data} />;
  if (form === "temperature") return <TemperatureForm {...props} data={data} />;
  if (form === "cleaning") return <CleaningForm {...props} />;
  if (form === "delivery") return <DeliveryForm {...props} />;
  if (form === "nonconformity") return <NonConformityForm {...props} />;
  if (form === "shelfLife") return <ShelfLifeForm {...props} />;
  return <ProcedureForm {...props} />;
}

function OpeningForm({ close, setData, operatorName }: FormProps) {
  const [openedAt, setOpenedAt] = useState(dateTime());
  const [name, setName] = useState("");
  const [productType, setProductType] = useState("Frais");
  const [noSupplierLot, setNoSupplierLot] = useState(false);
  const lot = useMemo(() => generateRawMaterialLot(openedAt, name), [openedAt, name]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const id = crypto.randomUUID();
    const attachments = await uploadAttachments(id, [
      file(values, "labelPhoto"), file(values, "productPhoto"), file(values, "deliveryPhoto"),
    ]);
    const record: RawMaterialOpening = {
      ...makeAudit("Fait", operatorName, id), attachments, openedAt, materialName: name,
      category: String(values.get("category")), productType: productType as RawMaterialOpening["productType"],
      supplier: String(values.get("supplier")), supplierLot: String(values.get("supplierLot") || ""),
      noSupplierLot, producerName: String(values.get("producerName") || ""),
      receivedAt: String(values.get("receivedAt") || ""), harvestedAt: String(values.get("harvestedAt") || ""),
      supplierExpiry: String(values.get("supplierExpiry")), sanitaryApproval: String(values.get("sanitaryApproval") || ""),
      receptionTemperature: optionalNumber(values.get("receptionTemperature")), quantity: Number(values.get("quantity")),
      unit: String(values.get("unit")), internalExpiry: String(values.get("internalExpiry")),
      storageZone: String(values.get("storageZone")), internalLot: lot, operator: operatorName,
      comments: String(values.get("comments") || ""),
    };
    setData((current) => ({ ...current, openings: [record, ...current.openings] })); close();
  };
  return <Modal title="Ouverture matière première" onClose={close}><form onSubmit={(event) => void submit(event)} className="form-grid">
    <FormSection title="Informations générales">
      <Field label="Date et heure *"><Input type="datetime-local" required value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} /></Field>
      <Field label="Matière première *"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Type de produit *"><Select value={productType} onChange={(e) => setProductType(e.target.value)}>{PRODUCT_TYPES.map(option)}</Select></Field>
      <Field label="Catégorie *"><Select name="category">{["Farine","Produits laitiers","Œufs","Fruits","Fruits locaux","Chocolat","Crème","Beurre","Garniture","Autre"].map(option)}</Select></Field>
      <Field label="Fournisseur *"><Input name="supplier" required /></Field>
      <Field label="Date de réception *"><Input name="receivedAt" type="date" required /></Field>
      {(productType === "Frais" || productType === "Surgelé") && <Field label="Température à réception (°C)"><Input name="receptionTemperature" type="number" step="0.1" /></Field>}
      {productType === "Produit d’origine animale" && <Field label="Agrément / estampille sanitaire *"><Input name="sanitaryApproval" required /></Field>}
    </FormSection>
    <FormSection title="Traçabilité">
      <label className="check field--wide"><input type="checkbox" checked={noSupplierLot} onChange={(e) => setNoSupplierLot(e.target.checked)} /><span>Pas de numéro de lot fournisseur</span></label>
      {!noSupplierLot
        ? <Field label="Lot fournisseur *"><Input name="supplierLot" required /></Field>
        : <><Field label="Nom du producteur *"><Input name="producerName" required /></Field><Field label="Date de récolte"><Input name="harvestedAt" type="date" /></Field></>}
      <Field label="DLC / DDM fournisseur *"><Input name="supplierExpiry" type="date" required /></Field>
      <Field label="Lot interne généré"><Input value={lot} readOnly className="generated-value" /></Field>
    </FormSection>
    <FormSection title="Conservation">
      <Field label="Quantité ouverte *"><div className="input-pair"><Input name="quantity" type="number" min="0.001" step="0.001" required /><Select name="unit">{["kg","g","L","pièce","seau","carton"].map(option)}</Select></div></Field>
      <Field label="Zone de stockage *"><Select name="storageZone">{["Sec","Froid positif","Froid négatif","Laboratoire","Réserve"].map(option)}</Select></Field>
      <Field label="DLC interne après ouverture *"><Input name="internalExpiry" type="date" required /></Field>
      <OperatorField operatorName={operatorName} />
    </FormSection>
    <FormSection title="Photos">
      <PhotoField name="labelPhoto" label="Étiquette fournisseur" required />
      <PhotoField name="productPhoto" label="Produit ouvert" required />
      <PhotoField name="deliveryPhoto" label="Bon de livraison" />
    </FormSection>
    <FormSection title="Commentaire"><Field label="Note corrective ou commentaire" wide><Textarea name="comments" /></Field></FormSection>
    <FormActions close={close} />
  </form></Modal>;
}

function BatchForm({ close, setData, operatorName, data }: FormProps & { data: HygieneData }) {
  const [manufacturedAt, setManufacturedAt] = useState(dateTime());
  const [family, setFamily] = useState("Pâtisserie");
  const [name, setName] = useState("");
  const [frozen, setFrozen] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const matchingRule = data.shelfLifeRules.find((rule) => rule.status === "Active" && (
    rule.name.toLowerCase() === name.toLowerCase() || rule.family.toLowerCase() === family.toLowerCase()
  ));
  const suggestedExpiry = matchingRule ? addDuration(manufacturedAt, matchingRule.durationValue, matchingRule.durationUnit) : "";
  const lot = useMemo(() => generateInternalBatchLot(family, manufacturedAt, name), [family, manufacturedAt, name]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); const id = crypto.randomUUID();
    const attachments = await uploadAttachments(id, [file(values, "productPhoto")]);
    const record: InternalBatch = {
      ...makeAudit("Fait", operatorName, id), attachments, manufacturedAt, family, productName: name,
      quantity: Number(values.get("quantity")), unit: String(values.get("unit")), internalLot: lot,
      rawMaterials: String(values.get("rawMaterials")), rawMaterialLots: String(values.get("rawMaterialLots")),
      plannedSaleDate: String(values.get("plannedSaleDate") || ""), internalExpiry: String(values.get("internalExpiry")),
      conservation: String(values.get("conservation")), frozen, frozenAt: String(values.get("frozenAt") || ""),
      frozenUseBy: String(values.get("frozenUseBy") || ""), thawedAt: String(values.get("thawedAt") || ""),
      thawedSaleBy: String(values.get("thawedSaleBy") || ""), sensitive,
      allergens: String(values.get("allergens") || ""), destination: String(values.get("destination")),
      responsible: operatorName, comments: String(values.get("comments") || ""),
    };
    setData((current) => ({ ...current, batches: [record, ...current.batches] })); close();
  };
  return <Modal title="Nouvelle fabrication / lot" onClose={close}><form onSubmit={(event) => void submit(event)} className="form-grid">
    <FormSection title="Informations générales">
      <Field label="Date et heure *"><Input type="datetime-local" required value={manufacturedAt} onChange={(e) => setManufacturedAt(e.target.value)} /></Field>
      <Field label="Famille produit *"><Select value={family} onChange={(e) => setFamily(e.target.value)}>{["Boulangerie","Viennoiserie","Pâtisserie","Snacking","Confiture","Pièce montée","Divers"].map(option)}</Select></Field>
      <Field label="Nom du produit *"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Quantité fabriquée *"><div className="input-pair"><Input name="quantity" type="number" min="0.001" step="0.001" required /><Select name="unit">{["kg","g","L","pièce","plaque","bac"].map(option)}</Select></div></Field>
      <Field label="Destination *"><Select name="destination">{["Vente boutique","Commande client","Client professionnel","Stock interne","Surgélation"].map(option)}</Select></Field>
      <OperatorField operatorName={operatorName} label="Responsable" />
    </FormSection>
    <FormSection title="Traçabilité">
      <Field label="Matières premières utilisées *" wide><Textarea name="rawMaterials" required /></Field>
      <Field label="Lots matières premières *" wide><Textarea name="rawMaterialLots" required placeholder="Lots séparés par une virgule" /></Field>
      <Field label="Allergènes présents"><Input name="allergens" defaultValue={matchingRule?.allergens || ""} placeholder="Gluten, lait, œufs…" /></Field>
      <Field label="Lot interne généré"><Input value={lot} readOnly className="generated-value" /></Field>
    </FormSection>
    <FormSection title="Conservation">
      <Field label="Mise en vente prévue"><Input name="plannedSaleDate" type="date" /></Field>
      <Field label="DLC / DDM interne *"><Input name="internalExpiry" type="date" required defaultValue={suggestedExpiry} /></Field>
      {matchingRule && <p className="field-help field--wide">DLC proposée selon la règle « {matchingRule.name} ».</p>}
      <Field label="Conservation *"><Select name="conservation">{["Ambiant","Froid positif","Froid négatif","Surgelé"].map(option)}</Select></Field>
      <label className="check"><input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} /><span>Produit sensible</span></label>
      <label className="check"><input type="checkbox" checked={frozen} onChange={(e) => setFrozen(e.target.checked)} /><span>Produit mis en surgélation</span></label>
      {frozen && <><Field label="Date de surgélation *"><Input name="frozenAt" type="date" required /></Field><Field label="Limite d’utilisation après surgélation *"><Input name="frozenUseBy" type="date" required /></Field></>}
      <Field label="Date de décongélation"><Input name="thawedAt" type="date" /></Field>
      <Field label="Limite de vente après décongélation"><Input name="thawedSaleBy" type="date" /></Field>
    </FormSection>
    <FormSection title="Photos"><PhotoField name="productPhoto" label="Produit ou étiquette interne" /></FormSection>
    <FormSection title="Commentaire"><Field label="Commentaire" wide><Textarea name="comments" /></Field></FormSection>
    <FormActions close={close} />
  </form></Modal>;
}

function TemperatureForm({ close, data, setData, operatorName }: FormProps & { data: HygieneData }) {
  const [equipmentId, setEquipmentId] = useState(data.equipment[0]?.id || "");
  const [temperature, setTemperature] = useState("");
  const equipment = data.equipment.find((item) => item.id === equipmentId) ?? data.equipment[0];
  if (!equipment) return null;
  const numericTemperature = Number(temperature);
  const compliant = temperature === "" || (numericTemperature >= equipment.minThreshold && numericTemperature <= equipment.maxThreshold);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    if (!compliant && !String(values.get("correctiveAction") || "").trim()) return;
    const id = crypto.randomUUID(); const attachments = await uploadAttachments(id, [file(values, "displayPhoto")]);
    const record: TemperatureCheck = {
      ...makeAudit(compliant ? "Fait" : "Non conforme", operatorName, id), attachments,
      checkedAt: String(values.get("checkedAt")), equipmentId, equipmentName: equipment.name,
      equipmentType: equipment.type, temperature: numericTemperature, minThreshold: equipment.minThreshold,
      maxThreshold: equipment.maxThreshold, compliant, correctiveAction: String(values.get("correctiveAction") || ""),
      productImpacted: values.get("productImpacted") === "on", productIsolated: values.get("productIsolated") === "on",
      managerNotified: values.get("managerNotified") === "on", operator: operatorName,
    };
    setData((current) => ({ ...current, temperatureChecks: [record, ...current.temperatureChecks] })); close();
  };
  return <Modal title="Relevé de température" onClose={close}><form onSubmit={(event) => void submit(event)} className="form-grid">
    <p className="form-notice field--wide">Les relevés doivent être réalisés au moins une fois par jour.</p>
    <Field label="Date et heure *"><Input name="checkedAt" type="datetime-local" defaultValue={dateTime()} required /></Field>
    <Field label="Équipement *"><Select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>{data.equipment.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
    <Field label="Type d’équipement"><Input value={equipment.type} readOnly className="generated-value" /></Field>
    <Field label="Température relevée (°C) *"><Input value={temperature} onChange={(e) => setTemperature(e.target.value)} type="number" step="0.1" required inputMode="decimal" /></Field>
    <Field label="Seuils configurés"><Input value={`${equipment.minThreshold} à ${equipment.maxThreshold} °C`} readOnly className="generated-value" /></Field>
    <Field label="Conformité"><Input value={compliant ? "Conforme" : "NON CONFORME"} readOnly className={compliant ? "generated-value" : "danger-value"} /></Field>
    {!compliant && <Field label="Action corrective *" wide><Select name="correctiveAction" required defaultValue=""><option value="" disabled>Choisir une action</option>{["Contrôle immédiat de l’équipement","Déplacement des produits","Isolement des produits","Appel maintenance","Destruction des produits si risque avéré","Nouveau relevé dans 30 minutes"].map(option)}</Select></Field>}
    {!compliant && <div className="checks-row field--wide"><CheckBox name="productImpacted" label="Produit impacté" /><CheckBox name="productIsolated" label="Produit isolé" /><CheckBox name="managerNotified" label="Responsable prévenu" /></div>}
    <PhotoField name="displayPhoto" label="Photo de l’afficheur" />
    <OperatorField operatorName={operatorName} label="Personne ayant contrôlé" />
    <FormActions close={close} />
  </form></Modal>;
}

function CleaningForm({ close, setData, operatorName }: FormProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    const record: CleaningTask = {
      ...makeAudit("À faire", operatorName), zone: String(values.get("zone")), title: String(values.get("title")),
      frequency: String(values.get("frequency")) as CleaningTask["frequency"], product: String(values.get("product")),
      method: String(values.get("method")), contactTime: String(values.get("contactTime")),
      responsible: operatorName, plannedAt: String(values.get("plannedAt")),
    };
    setData((current) => ({ ...current, cleaningTasks: [...current.cleaningTasks, record] })); close();
  };
  return <Modal title="Nouvelle tâche de nettoyage" onClose={close}><form onSubmit={submit} className="form-grid">
    <Field label="Zone *"><Select name="zone">{["Fournil","Pâtisserie","Plonge","Réserve","Boutique","Chambre froide","Matériel","Sol","Murs","Vitrines","Sanitaires"].map(option)}</Select></Field>
    <Field label="Tâche *"><Input name="title" required /></Field>
    <Field label="Fréquence *"><Select name="frequency">{["Quotidien","Hebdomadaire","Mensuel","Trimestriel"].map(option)}</Select></Field>
    <Field label="Produit utilisé *"><Input name="product" required /></Field>
    <Field label="Méthode *" wide><Textarea name="method" required /></Field>
    <Field label="Temps de contact *"><Input name="contactTime" required /></Field>
    <OperatorField operatorName={operatorName} label="Responsable" />
    <Field label="Date prévue *"><Input name="plannedAt" type="datetime-local" required defaultValue={dateTime()} /></Field>
    <FormActions close={close} />
  </form></Modal>;
}

function DeliveryForm({ close, setData, operatorName }: FormProps) {
  const [receivedAt, setReceivedAt] = useState(dateTime());
  const [supplier, setSupplier] = useState(""); const [product, setProduct] = useState("");
  const [productType, setProductType] = useState("Frais"); const [compliant, setCompliant] = useState(true);
  const lot = useMemo(() => generateDeliveryLot(receivedAt, supplier, product), [receivedAt, supplier, product]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); const id = crypto.randomUUID();
    const attachments = await uploadAttachments(id, [file(values, "labelPhoto"), file(values, "deliveryPhoto")]);
    const record: DeliveryCheck = {
      ...makeAudit(compliant ? "Fait" : "Non conforme", operatorName, id), attachments, receivedAt, supplier, product,
      category: String(values.get("category")), productType: productType as DeliveryCheck["productType"],
      quantity: Number(values.get("quantity")), unit: String(values.get("unit")),
      supplierLot: String(values.get("supplierLot") || ""), supplierExpiry: String(values.get("supplierExpiry") || ""),
      temperature: optionalNumber(values.get("temperature")), packagingState: String(values.get("packagingState")),
      sanitaryStamp: values.get("sanitaryStamp") === "on", compliant,
      nonConformityReason: String(values.get("nonConformityReason") || ""), actionTaken: String(values.get("actionTaken")),
      controller: operatorName, internalLot: lot, comments: String(values.get("comments") || ""),
    };
    setData((current) => ({ ...current, deliveryChecks: [record, ...current.deliveryChecks] })); close();
  };
  return <Modal title="Réception marchandises" onClose={close}><form onSubmit={(event) => void submit(event)} className="form-grid">
    <FormSection title="Livraison">
      <Field label="Date et heure *"><Input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required /></Field>
      <Field label="Fournisseur *"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} required /></Field>
      <Field label="Produit reçu *"><Input value={product} onChange={(e) => setProduct(e.target.value)} required /></Field>
      <Field label="Catégorie *"><Input name="category" required /></Field>
      <Field label="Type de produit *"><Select value={productType} onChange={(e) => setProductType(e.target.value)}>{PRODUCT_TYPES.map(option)}</Select></Field>
      <Field label="Quantité *"><div className="input-pair"><Input name="quantity" type="number" min="0.001" step="0.001" required /><Select name="unit">{["kg","g","L","pièce","seau","carton"].map(option)}</Select></div></Field>
    </FormSection>
    <FormSection title="Contrôles">
      <Field label="Lot fournisseur *"><Input name="supplierLot" required /></Field>
      <Field label="DLC / DDM *"><Input name="supplierExpiry" type="date" required /></Field>
      {(productType === "Frais" || productType === "Surgelé") && <Field label="Température à réception (°C) *"><Input name="temperature" type="number" step="0.1" required /></Field>}
      <Field label="État du conditionnement *"><Select name="packagingState">{["Conforme","Abîmé","Ouvert","Sale","Refusé"].map(option)}</Select></Field>
      {productType === "Produit d’origine animale" && <CheckBox name="sanitaryStamp" label="Estampille sanitaire présente" />}
      <Field label="Conformité *"><Select value={compliant ? "oui" : "non"} onChange={(e) => setCompliant(e.target.value === "oui")}><option value="oui">Conforme</option><option value="non">Non conforme</option></Select></Field>
      {!compliant && <Field label="Motif de non-conformité *" wide><Textarea name="nonConformityReason" required /></Field>}
      <Field label="Action prise *"><Select name="actionTaken">{["Accepté","Accepté sous réserve","Refusé","Isolé","Retour fournisseur","Destruction"].map(option)}</Select></Field>
      <Field label="Lot réception généré"><Input value={lot} readOnly className="generated-value" /></Field>
      <OperatorField operatorName={operatorName} label="Contrôleur" />
    </FormSection>
    <FormSection title="Photos"><PhotoField name="labelPhoto" label="Étiquette" required /><PhotoField name="deliveryPhoto" label="Bon de livraison" required /></FormSection>
    <FormSection title="Commentaire"><Field label="Commentaire" wide><Textarea name="comments" /></Field></FormSection>
    <FormActions close={close} />
  </form></Modal>;
}

function NonConformityForm({ close, setData, operatorName }: FormProps) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); const id = crypto.randomUUID();
    const attachments = await uploadAttachments(id, [file(values, "photo")]);
    const record: NonConformity = {
      ...makeAudit("Ouverte", operatorName, id), attachments, occurredAt: String(values.get("occurredAt")),
      type: String(values.get("type")), description: String(values.get("description")),
      product: String(values.get("product") || ""), lot: String(values.get("lot") || ""),
      supplier: String(values.get("supplier") || ""), severity: String(values.get("severity")) as NonConformity["severity"],
      productIsolated: values.get("productIsolated") === "on", productDestroyed: values.get("productDestroyed") === "on",
      affectedQuantity: optionalNumber(values.get("affectedQuantity")), immediateAction: String(values.get("immediateAction")),
      correctiveAction: String(values.get("correctiveAction") || ""), owner: operatorName,
      sourceType: "manual", comments: String(values.get("comments") || ""),
    };
    setData((current) => ({ ...current, nonConformities: [record, ...current.nonConformities] })); close();
  };
  return <Modal title="Nouvelle non-conformité" onClose={close}><form onSubmit={(event) => void submit(event)} className="form-grid">
    <Field label="Date et heure *"><Input name="occurredAt" type="datetime-local" defaultValue={dateTime()} required /></Field>
    <Field label="Type *"><Select name="type">{["Réception","Matière première","Température","Fabrication","Nettoyage","Produit fini","Allergène","Client","Matériel","Autre"].map(option)}</Select></Field>
    <Field label="Description du problème *" wide><Textarea name="description" required /></Field>
    <Field label="Produit concerné"><Input name="product" /></Field><Field label="Lot concerné"><Input name="lot" /></Field>
    <Field label="Fournisseur"><Input name="supplier" /></Field>
    <Field label="Gravité *"><Select name="severity">{["Faible","Moyenne","Élevée","Critique"].map(option)}</Select></Field>
    <Field label="Quantité concernée"><Input name="affectedQuantity" type="number" min="0" step="0.001" /></Field>
    <div className="checks-row field--wide"><CheckBox name="productIsolated" label="Produit isolé" /><CheckBox name="productDestroyed" label="Produit détruit" /></div>
    <Field label="Action immédiate *" wide><Textarea name="immediateAction" required /></Field>
    <Field label="Action corrective" wide><Textarea name="correctiveAction" /></Field>
    <OperatorField operatorName={operatorName} label="Responsable" /><PhotoField name="photo" label="Photo" />
    <Field label="Commentaire" wide><Textarea name="comments" /></Field><FormActions close={close} />
  </form></Modal>;
}

function ShelfLifeForm({ close, setData, operatorName }: FormProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    const record: ShelfLifeRule = {
      ...makeAudit("Active", operatorName), family: String(values.get("family")), name: String(values.get("name")),
      conservation: String(values.get("conservation")), durationValue: Number(values.get("durationValue")),
      durationUnit: String(values.get("durationUnit")) as ShelfLifeRule["durationUnit"],
      afterOpeningRule: String(values.get("afterOpeningRule") || ""), afterProductionRule: String(values.get("afterProductionRule") || ""),
      afterFreezingRule: String(values.get("afterFreezingRule") || ""), afterThawingRule: String(values.get("afterThawingRule") || ""),
      sensitive: values.get("sensitive") === "on", allergens: String(values.get("allergens") || ""),
      comments: String(values.get("comments") || ""),
    };
    setData((current) => ({ ...current, shelfLifeRules: [record, ...current.shelfLifeRules] })); close();
  };
  return <Modal title="Nouvelle règle DLC interne" onClose={close}><form onSubmit={submit} className="form-grid">
    <Field label="Famille produit *"><Input name="family" required /></Field><Field label="Nom du produit / règle *"><Input name="name" required /></Field>
    <Field label="Conservation *"><Select name="conservation">{["Ambiant","Froid positif","Froid négatif","Surgelé"].map(option)}</Select></Field>
    <Field label="Durée de vie *"><div className="input-pair"><Input name="durationValue" type="number" min="1" required /><Select name="durationUnit">{["Heures","Jours","Mois"].map(option)}</Select></div></Field>
    <Field label="Après ouverture" wide><Textarea name="afterOpeningRule" /></Field><Field label="Après fabrication" wide><Textarea name="afterProductionRule" /></Field>
    <Field label="Après surgélation" wide><Textarea name="afterFreezingRule" /></Field><Field label="Après décongélation" wide><Textarea name="afterThawingRule" /></Field>
    <CheckBox name="sensitive" label="Produit sensible" /><Field label="Allergènes habituels"><Input name="allergens" /></Field>
    <Field label="Commentaire" wide><Textarea name="comments" /></Field><FormActions close={close} />
  </form></Modal>;
}

function ProcedureForm({ close, setData, operatorName }: FormProps) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); const id = crypto.randomUUID();
    const attachments = await uploadAttachments(id, [file(values, "document")]);
    const record: ProcedureDocument = {
      ...makeAudit("Fait", operatorName, id), attachments, title: String(values.get("title")),
      category: String(values.get("category")), version: String(values.get("version")), createdOn: today(),
      updatedOn: today(), content: String(values.get("content")), approvedBy: String(values.get("approvedBy") || ""),
      documentStatus: String(values.get("documentStatus")) as ProcedureDocument["documentStatus"],
    };
    setData((current) => ({ ...current, procedures: [record, ...current.procedures] })); close();
  };
  return <Modal title="Nouvelle procédure PMS" onClose={close}><form onSubmit={(event) => void submit(event)} className="form-grid">
    <Field label="Titre *"><Input name="title" required /></Field><Field label="Version *"><Input name="version" defaultValue="1.0" required /></Field>
    <Field label="Catégorie *"><Select name="category">{["Bonnes pratiques d’hygiène","Lavage des mains","Tenue du personnel","Réception des marchandises","Stockage","Maîtrise des fabrications","Refroidissement rapide","Surgélation","Décongélation","Traçabilité","Allergènes","Nettoyage et désinfection","Gestion des non-conformités","Formation du personnel","Contrôles et autocontrôles","Gestion des nuisibles","Gestion des déchets"].map(option)}</Select></Field>
    <Field label="Statut *"><Select name="documentStatus">{["Brouillon","Validé","Archivé"].map(option)}</Select></Field>
    <Field label="Responsable validation"><Input name="approvedBy" /></Field><PhotoField name="document" label="Fichier joint" accept=".pdf,image/*" />
    <Field label="Texte de la procédure *" wide><Textarea name="content" required rows={8} /></Field><FormActions close={close} />
  </form></Modal>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <details className="form-section field--wide" open><summary>{title}</summary><div className="form-section__grid">{children}</div></details>;
}
function PhotoField({ name, label, required = false, accept = "image/*" }: { name: string; label: string; required?: boolean; accept?: string }) {
  return <Field label={`${label}${required ? " *" : ""}`}><Input name={name} type="file" accept={accept} capture={accept === "image/*" ? "environment" : undefined} required={required} /></Field>;
}
function OperatorField({ operatorName, label = "Opérateur" }: { operatorName: string; label?: string }) {
  return <Field label={label}><Input value={operatorName} readOnly className="generated-value" /></Field>;
}
function CheckBox({ name, label }: { name: string; label: string }) {
  return <label className="check"><input name={name} type="checkbox" /><span>{label}</span></label>;
}
function FormActions({ close }: { close: () => void }) {
  return <div className="form-actions field--wide"><button type="button" className="button button--secondary" onClick={close}>Annuler</button><button className="button button--primary" type="submit">Enregistrer</button></div>;
}
function file(values: FormData, name: string) { const value = values.get(name); return value instanceof File ? value : null; }
function optionalNumber(value: FormDataEntryValue | null) { return value === "" || value == null ? undefined : Number(value); }
function addDuration(value: string, amount: number, unit: ShelfLifeRule["durationUnit"]) {
  const date = new Date(value);
  if (unit === "Heures") date.setHours(date.getHours() + amount);
  if (unit === "Jours") date.setDate(date.getDate() + amount);
  if (unit === "Mois") date.setMonth(date.getMonth() + amount);
  return date.toISOString().slice(0, 10);
}
type FormProps = { close: () => void; setData: (updater: (data: HygieneData) => HygieneData) => void; operatorName: string };
