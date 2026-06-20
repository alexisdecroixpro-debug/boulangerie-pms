import { Archive, Download, FileText, Plus, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import type { DeliveryCheck, HygieneData, NonConformity, ProcedureDocument, ShelfLifeRule } from "../domain/types";
import { StatusBadge } from "../components/StatusBadge";
import { exportCsv } from "../utils/exportCsv";
import { exportPdf } from "../utils/exportPdf";
import { filterByPeriod, type ExportPeriod } from "../utils/dateFilters";
import type { HygienePageId, QuickForm } from "../types/navigation";
import { PeriodFields } from "./RegisterPages";

type OperationalKind = "deliveries" | "nonconformities" | "shelfLife" | "procedures";

export function OperationalPage({ kind, data, openForm, setData, operatorName }: {
  kind: OperationalKind; data: HygieneData; openForm: (form: QuickForm) => void;
  setData: (updater: (data: HygieneData) => HygieneData) => void; operatorName: string;
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const configs = {
    deliveries: { title: "Réceptions marchandises", description: "Contrôles des livraisons, températures et conditionnements.", button: "Nouvelle réception", form: "delivery" as QuickForm, rows: data.deliveryChecks },
    nonconformities: { title: "Non-conformités", description: "Écarts, actions immédiates et suivi de clôture.", button: "Déclarer", form: "nonconformity" as QuickForm, rows: data.nonConformities },
    shelfLife: { title: "DLC internes", description: "Bibliothèque des durées de conservation de l’atelier.", button: "Nouvelle règle", form: "shelfLife" as QuickForm, rows: data.shelfLifeRules },
    procedures: { title: "Procédures PMS", description: "Documents et consignes applicables dans l’atelier.", button: "Nouvelle procédure", form: "procedure" as QuickForm, rows: data.procedures },
  } as const;
  const config = configs[kind];
  const rows = useMemo<unknown[]>(() => filterByPeriod(config.rows as unknown[], period, from, to)
    .filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [config.rows, search, period, from, to]);
  const exportRows = rows as unknown as Array<Record<string, unknown>>;
  return <>
    <header className="page-header"><div><p className="page-date">Registre PMS</p><h1>{config.title}</h1><p>{config.description}</p></div>
      <button className="button button--primary" onClick={() => openForm(config.form)}><Plus size={20} /> {config.button}</button></header>
    <section className="toolbar">
      <label className="search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher produit, lot, fournisseur…" /></label>
      <div className="toolbar-actions">
        <PeriodFields period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
        <button className="button button--secondary" onClick={() => exportCsv(`pack-hygiene-${kind}.csv`, exportRows)}><Download size={17} /> CSV</button>
        <button className="button button--secondary" onClick={() => exportPdf(config.title, "Registre complet", exportRows, operatorName)}><FileText size={17} /> PDF</button>
      </div>
    </section>
    <section className="panel register-panel"><div className="table-wrap">
      {kind === "deliveries" && <DeliveriesTable rows={rows as DeliveryCheck[]} createNc={(row) => createDeliveryNc(row, setData, operatorName)} />}
      {kind === "nonconformities" && <NonConformitiesTable rows={rows as NonConformity[]} setData={setData} operatorName={operatorName} />}
      {kind === "shelfLife" && <ShelfLifeTable rows={rows as ShelfLifeRule[]} />}
      {kind === "procedures" && <ProceduresTable rows={rows as ProcedureDocument[]} />}
    </div><footer className="table-footer"><span>{rows.length} enregistrement(s)</span><span><Archive size={15} /> Historique conservé, suppression définitive désactivée</span></footer></section>
  </>;
}

function DeliveriesTable({ rows, createNc }: { rows: DeliveryCheck[]; createNc: (row: DeliveryCheck) => void }) {
  return <table><thead><tr><th>Réception</th><th>Produit</th><th>Fournisseur</th><th>Lot</th><th>Contrôle</th><th>Action</th><th>Statut</th><th></th></tr></thead><tbody>{rows.map((row) =>
    <tr key={row.id}><td>{formatDate(row.receivedAt)}</td><td><strong>{row.product}</strong><small>{row.productType} · {row.quantity} {row.unit}</small></td><td>{row.supplier}</td><td><code>{row.internalLot}</code></td><td>{row.temperature != null ? `${row.temperature} °C` : "—"}<small>{row.packagingState}</small></td><td>{row.actionTaken}</td><td><StatusBadge status={row.status} /></td><td>{!row.compliant && <button className="text-button danger-text" onClick={() => createNc(row)}><TriangleAlert size={15} /> Créer NC</button>}</td></tr>
  )}</tbody></table>;
}
function NonConformitiesTable({ rows, setData, operatorName }: { rows: NonConformity[]; setData: (updater: (data: HygieneData) => HygieneData) => void; operatorName: string }) {
  const close = (id: string) => setData((data) => ({ ...data, nonConformities: data.nonConformities.map((item) => item.id === id ? { ...item, status: "Clôturée", closedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: operatorName } : item) }));
  return <table><thead><tr><th>Date</th><th>Type</th><th>Problème</th><th>Produit / lot</th><th>Gravité</th><th>Responsable</th><th>Statut</th><th></th></tr></thead><tbody>{rows.map((row) =>
    <tr key={row.id}><td>{formatDate(row.occurredAt)}</td><td>{row.type}</td><td><strong>{row.description}</strong><small>{row.immediateAction}</small></td><td>{row.product || "—"}<small>{row.lot || ""}</small></td><td>{row.severity}</td><td>{row.owner}</td><td><StatusBadge status={row.status} /></td><td>{!["Clôturée","Archivé"].includes(row.status) && <button className="text-button" onClick={() => close(row.id)}>Clôturer</button>}</td></tr>
  )}</tbody></table>;
}
function ShelfLifeTable({ rows }: { rows: ShelfLifeRule[] }) {
  return <table><thead><tr><th>Produit / règle</th><th>Famille</th><th>Conservation</th><th>Durée</th><th>Sensible</th><th>Allergènes</th><th>Statut</th></tr></thead><tbody>{rows.map((row) =>
    <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.family}</td><td>{row.conservation}</td><td>{row.durationValue} {row.durationUnit.toLowerCase()}</td><td>{row.sensitive ? "Oui" : "Non"}</td><td>{row.allergens || "—"}</td><td><StatusBadge status={row.status} /></td></tr>
  )}</tbody></table>;
}
function ProceduresTable({ rows }: { rows: ProcedureDocument[] }) {
  return <table><thead><tr><th>Procédure</th><th>Catégorie</th><th>Version</th><th>Mise à jour</th><th>Validation</th><th>Statut</th></tr></thead><tbody>{rows.map((row) =>
    <tr key={row.id}><td><strong>{row.title}</strong><small>{row.content.slice(0, 90)}{row.content.length > 90 ? "…" : ""}</small></td><td>{row.category}</td><td>{row.version}</td><td>{formatShortDate(row.updatedOn)}</td><td>{row.approvedBy || "—"}</td><td>{row.documentStatus}</td></tr>
  )}</tbody></table>;
}

export function InspectionPage({ data, setPage, operatorName }: { data: HygieneData; setPage: (page: HygienePageId) => void; operatorName: string }) {
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const links: Array<{ page: HygienePageId; label: string; count: number }> = [
    { page: "temperatures", label: "Registre températures", count: data.temperatureChecks.length },
    { page: "cleaning", label: "Registre nettoyage", count: data.cleaningTasks.length },
    { page: "openings", label: "Traçabilité matières", count: data.openings.length },
    { page: "batches", label: "Fabrications / lots", count: data.batches.length },
    { page: "deliveries", label: "Réceptions", count: data.deliveryChecks.length },
    { page: "nonconformities", label: "Non-conformités", count: data.nonConformities.length },
    { page: "shelfLife", label: "DLC internes", count: data.shelfLifeRules.length },
    { page: "procedures", label: "Procédures PMS", count: data.procedures.length },
  ];
  const allRows = filterByPeriod([
    ...data.temperatureChecks, ...data.cleaningRecords, ...data.openings, ...data.batches,
    ...data.deliveryChecks, ...data.nonConformities, ...data.shelfLifeRules,
  ] as unknown as Array<Record<string, unknown>>, period, from, to);
  return <>
    <header className="page-header inspection-header"><div><p className="eyeline">Présentation immédiate</p><h1>Mode contrôle sanitaire</h1><p>Accès rapide aux preuves et registres de l’établissement.</p></div><ShieldCheck size={48} /></header>
    <section className="inspection-actions">
      {links.map((item) => <button key={item.page} className="inspection-card" onClick={() => setPage(item.page)}><strong>{item.label}</strong><span>{item.count} élément(s)</span></button>)}
    </section>
    <section className="panel inspection-export"><div><h2>Export global</h2><p>Données PMS de la période sélectionnée.</p></div><div className="toolbar-actions">
      <PeriodFields period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
      <button className="button button--secondary" onClick={() => exportCsv("pack-hygiene-controle-sanitaire.csv", allRows)}><Download size={17} /> CSV</button>
      <button className="button button--primary" onClick={() => exportPdf("Pack Hygiène · Contrôle sanitaire", "Ensemble des registres PMS", allRows, operatorName)}><FileText size={17} /> PDF</button>
    </div></section>
  </>;
}

function createDeliveryNc(row: DeliveryCheck, setData: (updater: (data: HygieneData) => HygieneData) => void, operatorName: string) {
  const now = new Date().toISOString();
  const nc: NonConformity = {
    id: crypto.randomUUID(), createdAt: now, updatedAt: now, createdBy: operatorName, updatedBy: operatorName,
    status: "Ouverte", occurredAt: row.receivedAt, type: "Réception",
    description: row.nonConformityReason || `Réception non conforme : ${row.product}`,
    product: row.product, lot: row.supplierLot || row.internalLot, supplier: row.supplier, severity: "Moyenne",
    productIsolated: row.actionTaken === "Isolé", productDestroyed: row.actionTaken === "Destruction",
    affectedQuantity: row.quantity, immediateAction: row.actionTaken, owner: operatorName,
    sourceType: "delivery", sourceId: row.id,
  };
  setData((data) => ({ ...data, nonConformities: [nc, ...data.nonConformities] }));
}
const formatDate = (value: string) => `${formatShortDate(value)} · ${value.slice(11, 16)}`;
const formatShortDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
