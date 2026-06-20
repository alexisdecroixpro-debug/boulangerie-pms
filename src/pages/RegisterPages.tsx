import { Archive, Check, Download, FileText, Plus, ScanLine, Search, Thermometer, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CleaningPlanTask, CleaningTask, HygieneData, InternalBatch, NonConformity, RawMaterialOpening, TemperatureCheck } from "../domain/types";
import { Field, Input, Textarea } from "../components/FormFields";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { cleaningScope, withGeneratedCleaningTasks } from "../domain/cleaningSchedule";
import { uploadAttachments } from "../utils/attachments";
import { filterByPeriod, type ExportPeriod } from "../utils/dateFilters";
import { exportCsv } from "../utils/exportCsv";
import { exportPdf } from "../utils/exportPdf";
import type { QuickForm } from "../types/navigation";

type RegisterKind = "openings" | "batches" | "temperatures";

export function RegisterPage({
  kind,
  data,
  openForm,
  setData,
  operatorName = "Utilisateur",
  onScan,
}: {
  kind: RegisterKind;
  data: HygieneData;
  openForm: (form: QuickForm) => void;
  setData?: (updater: (data: HygieneData) => HygieneData) => void;
  operatorName?: string;
  onScan?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const config = {
    openings: {
      title: "Ouvertures matières premières",
      description: "Produits ouverts, DLC internes et lots fournisseurs.",
      button: "Nouvelle ouverture",
      form: "opening" as QuickForm,
      rows: data.openings,
    },
    batches: {
      title: "Fabrications & lots internes",
      description: "Traçabilité des productions fabriquées dans l’atelier.",
      button: "Nouvelle fabrication",
      form: "batch" as QuickForm,
      rows: data.batches,
    },
    temperatures: {
      title: "Suivi des températures",
      description: "Contrôles des équipements froids et actions correctives.",
      button: "Nouveau relevé",
      form: "temperature" as QuickForm,
      rows: data.temperatureChecks,
    },
  }[kind];

  const rows = useMemo<unknown[]>(() => filterByPeriod(config.rows as unknown[], period, from, to)
    .filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [config.rows, search, period, from, to]);

  return (
    <>
      <header className="page-header">
        <div><p className="page-date">Registre PMS</p><h1>{config.title}</h1><p>{config.description}</p></div>
        <div className="page-header__actions">
          {kind === "openings" && onScan && <button className="button button--primary" onClick={onScan}><ScanLine size={20} /> Scanner une étiquette</button>}
          <button className="button button--secondary" onClick={() => openForm(config.form)}><Plus size={20} /> {config.button}</button>
        </div>
      </header>
      <section className="toolbar">
        <label className="search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher produit, lot, personne…" /></label>
        <div className="toolbar-actions">
          <PeriodFields period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <button className="button button--secondary" onClick={() => exportCsv(`pack-hygiene-${kind}.csv`, rows as unknown as Array<Record<string, unknown>>)}><Download size={18} /> CSV</button>
          <button className="button button--secondary" onClick={() => exportPdf(config.title, "Registre PMS", rows as unknown as Array<Record<string, unknown>>, operatorName)}><FileText size={18} /> PDF</button>
        </div>
      </section>
      <section className="panel register-panel">
        <div className="table-wrap">
          {kind === "openings" && <OpeningsTable rows={rows as RawMaterialOpening[]} />}
          {kind === "batches" && <BatchesTable rows={rows as InternalBatch[]} />}
          {kind === "temperatures" && <TemperaturesTable rows={rows as TemperatureCheck[]} createNc={setData ? (row) => createTemperatureNc(row, setData, operatorName) : undefined} />}
        </div>
        <footer className="table-footer"><span>{rows.length} enregistrement{rows.length > 1 ? "s" : ""}</span><span><Archive size={15} /> Historique conservé, suppression désactivée</span></footer>
      </section>
    </>
  );
}

function OpeningsTable({ rows }: { rows: RawMaterialOpening[] }) {
  return <table><thead><tr><th>Ouverture</th><th>Matière première</th><th>Fournisseur</th><th>Lot interne</th><th>DLC interne</th><th>Opérateur</th><th>Statut</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{formatDate(row.openedAt)}</td><td><strong>{row.materialName}</strong><small>{row.category} · {row.quantity} {row.unit}</small></td><td>{row.supplier}<small>{row.noSupplierLot ? "Lot interne uniquement" : row.supplierLot}</small></td><td><code>{row.internalLot}</code></td><td>{formatShortDate(row.internalExpiry)}</td><td>{row.operator}</td><td><StatusBadge status={row.status} /></td></tr>)}</tbody></table>;
}

function BatchesTable({ rows }: { rows: InternalBatch[] }) {
  return <table><thead><tr><th>Fabrication</th><th>Produit</th><th>Lot interne</th><th>Conservation</th><th>DLC / DDM</th><th>Responsable</th><th>Statut</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{formatDate(row.manufacturedAt)}</td><td><strong>{row.productName}</strong><small>{row.family} · {row.quantity} {row.unit}</small></td><td><code>{row.internalLot}</code></td><td>{row.conservation}<small>{row.frozen ? "Produit surgelé" : "Non surgelé"}</small></td><td>{formatShortDate(row.internalExpiry)}</td><td>{row.responsible}</td><td><StatusBadge status={row.status} /></td></tr>)}</tbody></table>;
}

function TemperaturesTable({ rows, createNc }: { rows: TemperatureCheck[]; createNc?: (row: TemperatureCheck) => void }) {
  return <table><thead><tr><th>Contrôle</th><th>Équipement</th><th>Température</th><th>Plage attendue</th><th>Action corrective</th><th>Contrôleur</th><th>Statut</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{formatDate(row.checkedAt)}</td><td><strong>{row.equipmentName}</strong><small>{row.equipmentType}</small></td><td><span className={`temperature-value${row.compliant ? "" : " temperature-value--danger"}`}>{row.compliant ? <Thermometer size={17} /> : <TriangleAlert size={17} />}{row.temperature} °C</span></td><td>{row.minThreshold} à {row.maxThreshold} °C</td><td>{row.correctiveAction || "—"}</td><td>{row.operator}</td><td><StatusBadge status={row.status} /></td><td>{!row.compliant && createNc && <button className="text-button danger-text" onClick={() => createNc(row)}>Créer NC</button>}</td></tr>)}</tbody></table>;
}

export function CleaningPage({
  data,
  setData,
  operatorName,
  isAdmin,
  setPage,
}: {
  data: HygieneData;
  setData: (updater: (data: HygieneData) => HygieneData) => void;
  operatorName: string;
  isAdmin: boolean;
  setPage: (page: "cleaningPlan" | "cleaningHistory") => void;
}) {
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [validationMode, setValidationMode] = useState<"validée" | "non réalisée">("validée");
  const [selectedZone, setSelectedZone] = useState("Toutes zones");
  const now = new Date();
  const activeTasks = data.cleaningTasks
    .filter((task) => task.status !== "Archivé")
    .sort((a, b) => a.plannedAt.localeCompare(b.plannedAt));
  const zones = ["Toutes zones", ...Array.from(new Set(activeTasks.map((task) => task.zone))).sort((a, b) => a.localeCompare(b))];
  const zoneTasks = selectedZone === "Toutes zones" ? activeTasks : activeTasks.filter((task) => task.zone === selectedZone);
  const todayRows = zoneTasks.filter((task) => cleaningScope(task, now) === "today");
  const weekRows = zoneTasks.filter((task) => cleaningScope(task, now) === "week");
  const monthRows = zoneTasks.filter((task) => cleaningScope(task, now) === "month");
  const remaining = zoneTasks.filter((task) => ["À faire", "En retard"].includes(task.status)).length;

  useEffect(() => {
    setData((current) => withGeneratedCleaningTasks(current, operatorName));
  }, [operatorName, setData]);

  return (
    <>
      <header className="page-header">
        <div><p className="page-date">Saisie terrain</p><h1>Nettoyage du jour</h1><p>{remaining} tâche{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}. Les tâches sont générées depuis le plan de nettoyage.</p></div>
        {isAdmin && <div className="page-header__actions">
          <button className="button button--secondary" onClick={() => setPage("cleaningHistory")}><FileText size={18} /> Historique</button>
          <button className="button button--primary" onClick={() => setPage("cleaningPlan")}><Plus size={18} /> Plan de nettoyage</button>
        </div>}
      </header>
      <div className="cleaning-kpis">
        <strong>{todayRows.filter(isTodo).length}</strong><span>Aujourd’hui</span>
        <strong>{weekRows.filter(isTodo).length}</strong><span>Cette semaine</span>
        <strong>{monthRows.filter(isTodo).length}</strong><span>Ce mois-ci</span>
      </div>
      <section className="zone-picker" aria-label="Sélection de la zone de travail">
        <div>
          <h2>Choisir sa zone</h2>
          <p>Les tâches affichées se limitent à la zone sélectionnée.</p>
        </div>
        <div className="zone-picker__buttons">
          {zones.map((zone) => {
            const count = zone === "Toutes zones"
              ? activeTasks.filter(isTodo).length
              : activeTasks.filter((task) => task.zone === zone && isTodo(task)).length;
            return <button
              type="button"
              key={zone}
              className={selectedZone === zone ? "active" : ""}
              onClick={() => setSelectedZone(zone)}
            >
              <strong>{zone}</strong>
              <span>{count} restante{count > 1 ? "s" : ""}</span>
            </button>;
          })}
        </div>
      </section>
      <CleaningSection title="Aujourd’hui" rows={todayRows} open={(task, mode) => { setSelectedTask(task); setValidationMode(mode); }} />
      <CleaningSection title="Cette semaine" rows={weekRows} open={(task, mode) => { setSelectedTask(task); setValidationMode(mode); }} />
      <CleaningSection title="Ce mois-ci" rows={monthRows} open={(task, mode) => { setSelectedTask(task); setValidationMode(mode); }} />
      {selectedTask && <CleaningValidation task={selectedTask} mode={validationMode} operatorName={operatorName} setData={setData} close={() => setSelectedTask(null)} />}
    </>
  );
}

function CleaningSection({ title, rows, open }: { title: string; rows: CleaningTask[]; open: (task: CleaningTask, mode: "validée" | "non réalisée") => void }) {
  return <section className="cleaning-section">
    <div className="section-heading"><div><h2>{title}</h2><p>{rows.length ? `${rows.length} tâche(s)` : "Aucune tâche prévue"}</p></div></div>
    <div className="cleaning-list">
      {rows.map((task) => <article className={`cleaning-card${task.status === "En retard" ? " cleaning-card--late" : ""}`} key={task.id}>
        <div className="cleaning-card__time"><strong>{task.plannedAt.slice(11, 16)}</strong><span>{task.frequency}</span></div>
        <div className="cleaning-card__body">
          <span className="zone">{task.zone}</span><h3>{task.title}</h3><p>{task.method}</p>
          <div className="cleaning-meta"><span>Produit : <strong>{task.product}</strong></span><span>Surface : <strong>{task.materialSurface || "—"}</strong></span><span>Photo : <strong>{task.photoRequired ? "Obligatoire" : "Non"}</strong></span></div>
        </div>
        <div className="cleaning-card__actions">
          <StatusBadge status={task.status} />
          {isTodo(task) && <><button className="button button--complete" onClick={() => open(task, "validée")}><Check size={18} /> Valider</button><button className="button button--secondary" onClick={() => open(task, "non réalisée")}>Non réalisé</button></>}
        </div>
      </article>)}
    </div>
  </section>;
}

function CleaningValidation({ task, mode, operatorName, setData, close }: {
  task: CleaningTask;
  mode: "validée" | "non réalisée";
  operatorName: string;
  setData: (updater: (data: HygieneData) => HygieneData) => void;
  close: () => void;
}) {
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const completedAt = new Date().toISOString();
      const recordId = crypto.randomUUID();
      if (mode === "validée" && task.photoRequired && !photo) throw new Error("Une photo est obligatoire pour cette tâche.");
      const attachments = await uploadAttachments(recordId, [photo]);
      const nextStatus = mode === "validée" ? "Validée" : "Non réalisée";
      setData((current) => ({
        ...current,
        cleaningTasks: current.cleaningTasks.map((item) => item.id === task.id
          ? { ...item, status: nextStatus, updatedAt: completedAt, updatedBy: operatorName, comments: comment }
          : item),
        cleaningRecords: [{
          id: recordId, taskId: task.id, completedAt, signature: operatorName,
          validationComment: comment, attachments,
          createdAt: completedAt, updatedAt: completedAt, createdBy: operatorName,
          updatedBy: operatorName, status: nextStatus, comments: comment,
        }, ...current.cleaningRecords],
      }));
      close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={mode === "validée" ? "Valider le nettoyage" : "Marquer non réalisé"} onClose={close}>
    <form className="form-grid" onSubmit={submit}>
      <Field label="Tâche"><Input value={`${task.zone} · ${task.title}`} readOnly /></Field>
      <Field label="Initiales / opérateur"><Input value={operatorName} readOnly /></Field>
      <Field label={`Photo après nettoyage${mode === "validée" && task.photoRequired ? " *" : ""}`} wide><Input type="file" accept="image/*" capture="environment" required={mode === "validée" && task.photoRequired} onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></Field>
      <Field label="Commentaire de validation" wide><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Facultatif" /></Field>
      {error && <p className="form-error field--wide" role="alert">{error}</p>}
      <div className="form-actions field--wide">
        <button type="button" className="button button--secondary" onClick={close}>Annuler</button>
        <button className="button button--primary" disabled={saving}>{saving ? "Enregistrement…" : mode === "validée" ? "Valider" : "Confirmer non réalisé"}</button>
      </div>
    </form>
  </Modal>;
}

export function CleaningPlanPage({ data, setData, operatorName }: { data: HygieneData; setData: (updater: (data: HygieneData) => HygieneData) => void; operatorName: string }) {
  const [editing, setEditing] = useState<CleaningPlanTask | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = [...data.cleaningPlanTasks].sort((a, b) => Number(b.active) - Number(a.active) || a.zone.localeCompare(b.zone));
  const toggle = (task: CleaningPlanTask) => {
    const updatedAt = new Date().toISOString();
    setData((current) => ({ ...current, cleaningPlanTasks: current.cleaningPlanTasks.map((item) => item.id === task.id ? { ...item, active: !item.active, status: !item.active ? "Active" : "Inactif", updatedAt, updatedBy: operatorName } : item) }));
  };
  return <>
    <header className="page-header"><div><p className="page-date">Responsable</p><h1>Plan de nettoyage</h1><p>Créer une fois les tâches fixes. Les occurrences sont générées selon la fréquence.</p></div><button className="button button--primary" onClick={() => setCreating(true)}><Plus size={18} /> Ajouter une tâche</button></header>
    <section className="panel register-panel"><div className="table-wrap"><table><thead><tr><th>Tâche</th><th>Zone</th><th>Action</th><th>Fréquence</th><th>Produit</th><th>Photo</th><th>Statut</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.materialSurface}</small></td><td>{row.zone}</td><td>{row.actionType}</td><td>{row.frequency}<small>{row.suggestedDay || row.scheduledDate || ""}</small></td><td>{row.product}</td><td>{row.photoRequired ? "Oui" : "Non"}</td><td><StatusBadge status={row.status} /></td><td><button className="text-button" onClick={() => setEditing(row)}>Modifier</button><button className="text-button" onClick={() => toggle(row)}>{row.active ? "Désactiver" : "Activer"}</button></td></tr>)}</tbody></table></div><footer className="table-footer"><span>{rows.length} tâche(s) de plan</span><span><Archive size={15} /> Désactivation au lieu de suppression</span></footer></section>
    {(creating || editing) && <CleaningPlanModal task={editing} operatorName={operatorName} close={() => { setCreating(false); setEditing(null); }} setData={setData} />}
  </>;
}

function CleaningPlanModal({ task, operatorName, setData, close }: { task: CleaningPlanTask | null; operatorName: string; setData: (updater: (data: HygieneData) => HygieneData) => void; close: () => void }) {
  const [frequency, setFrequency] = useState(task?.frequency || "Quotidien");
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const next: CleaningPlanTask = {
      id: task?.id || crypto.randomUUID(), createdAt: task?.createdAt || now, updatedAt: now,
      createdBy: task?.createdBy || operatorName, updatedBy: operatorName, status: values.get("active") === "on" ? "Active" : "Inactif",
      name: String(values.get("name")), zone: String(values.get("zone")), materialSurface: String(values.get("materialSurface")),
      actionType: String(values.get("actionType")) as CleaningPlanTask["actionType"], frequency: frequency as CleaningPlanTask["frequency"],
      suggestedDay: String(values.get("suggestedDay") || ""), scheduledDate: String(values.get("scheduledDate") || ""),
      product: String(values.get("product")), method: String(values.get("method")),
      defaultResponsible: String(values.get("defaultResponsible") || ""), photoRequired: values.get("photoRequired") === "on",
      active: values.get("active") === "on", comments: String(values.get("comments") || ""),
    };
    setData((current) => ({ ...current, cleaningPlanTasks: task ? current.cleaningPlanTasks.map((item) => item.id === task.id ? next : item) : [next, ...current.cleaningPlanTasks] }));
    close();
  };
  return <Modal title={task ? "Modifier la tâche fixe" : "Ajouter une tâche fixe"} onClose={close}><form className="form-grid" onSubmit={submit}>
    <Field label="Nom de la tâche *"><Input name="name" required defaultValue={task?.name} /></Field>
    <Field label="Zone *"><select name="zone" defaultValue={task?.zone || "Fournil"}>{["Fournil","Pâtisserie","Économat","Boutique","Réserve","Sanitaires","Autre"].map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Matériel ou surface *"><Input name="materialSurface" required defaultValue={task?.materialSurface} /></Field>
    <Field label="Type d’action *"><select name="actionType" defaultValue={task?.actionType || "Nettoyage-désinfection"}>{["Nettoyage","Désinfection","Nettoyage-désinfection","Aspiration","Contrôle visuel"].map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Fréquence *"><select value={frequency} onChange={(event) => setFrequency(event.target.value as CleaningPlanTask["frequency"])}>{["Quotidien","Hebdomadaire","Mensuel","Ponctuel"].map((value) => <option key={value}>{value}</option>)}</select></Field>
    {frequency === "Hebdomadaire" && <Field label="Jour conseillé"><select name="suggestedDay" defaultValue={task?.suggestedDay || "Lundi"}>{["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"].map((value) => <option key={value}>{value}</option>)}</select></Field>}
    {frequency === "Mensuel" && <Field label="Jour du mois conseillé"><Input name="suggestedDay" type="number" min="1" max="31" defaultValue={task?.suggestedDay || "1"} /></Field>}
    {frequency === "Ponctuel" && <Field label="Date prévue *"><Input name="scheduledDate" type="date" required defaultValue={task?.scheduledDate} /></Field>}
    <Field label="Produit utilisé *"><Input name="product" required defaultValue={task?.product} /></Field>
    <Field label="Responsable par défaut"><Input name="defaultResponsible" defaultValue={task?.defaultResponsible} /></Field>
    <Field label="Méthode courte *" wide><Textarea name="method" required defaultValue={task?.method} /></Field>
    <div className="checks-row field--wide"><label className="check"><input name="photoRequired" type="checkbox" defaultChecked={task?.photoRequired} /><span>Photo obligatoire</span></label><label className="check"><input name="active" type="checkbox" defaultChecked={task?.active ?? true} /><span>Tâche active</span></label></div>
    <Field label="Commentaire interne" wide><Textarea name="comments" defaultValue={task?.comments} /></Field>
    <div className="form-actions field--wide"><button type="button" className="button button--secondary" onClick={close}>Annuler</button><button className="button button--primary">Enregistrer</button></div>
  </form></Modal>;
}

export function CleaningHistoryPage({ data, operatorName }: { data: HygieneData; operatorName: string }) {
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [zone, setZone] = useState("Toutes");
  const [status, setStatus] = useState("Tous");
  const [frequency, setFrequency] = useState("Toutes");
  const [employee, setEmployee] = useState("");
  const [search, setSearch] = useState("");
  const recordsByTask = new Map(data.cleaningRecords.map((record) => [record.taskId, record]));
  const rows = filterByPeriod(data.cleaningTasks, period, from, to)
    .map((task) => ({ task, record: recordsByTask.get(task.id) }))
    .filter(({ task }) => zone === "Toutes" || task.zone === zone)
    .filter(({ task }) => status === "Tous" || task.status === status)
    .filter(({ task }) => frequency === "Toutes" || task.frequency === frequency)
    .filter(({ record }) => !employee || (record?.signature || "").toLowerCase().includes(employee.toLowerCase()))
    .filter(({ task }) => !search || task.title.toLowerCase().includes(search.toLowerCase()));
  const exportRows = rows.map(({ task, record }) => ({
    date_prevue: task.plannedAt, date_validation: record?.completedAt || "", employe: record?.signature || "",
    tache: task.title, zone: task.zone, frequence: task.frequency, statut: task.status,
    commentaire: record?.validationComment || task.comments || "", photo: record?.attachments?.length ? `${record.attachments.length} pièce(s)` : "",
  }));
  const zones = ["Toutes", ...Array.from(new Set(data.cleaningTasks.map((task) => task.zone)))];
  return <>
    <header className="page-header"><div><p className="page-date">Responsable</p><h1>Historique nettoyage</h1><p>Registre des tâches prévues, validées ou non réalisées.</p></div></header>
    <section className="toolbar"><label className="search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une tâche…" /></label><div className="toolbar-actions"><PeriodFields period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} /><button className="button button--secondary" onClick={() => exportCsv("pack-hygiene-nettoyage.csv", exportRows)}><Download size={18} /> Excel CSV</button><button className="button button--secondary" onClick={() => exportPdf("Registre nettoyage", "Plan de nettoyage PMS", exportRows, operatorName)}><FileText size={18} /> PDF</button></div></section>
    <section className="toolbar cleaning-filters"><select value={zone} onChange={(e) => setZone(e.target.value)}>{zones.map((value) => <option key={value}>{value}</option>)}</select><select value={frequency} onChange={(e) => setFrequency(e.target.value)}>{["Toutes","Quotidien","Hebdomadaire","Mensuel","Ponctuel"].map((value) => <option key={value}>{value}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}>{["Tous","À faire","Validée","En retard","Non réalisée","Fait"].map((value) => <option key={value}>{value}</option>)}</select><input value={employee} onChange={(e) => setEmployee(e.target.value)} placeholder="Employé" /></section>
    <section className="panel register-panel"><div className="table-wrap"><table><thead><tr><th>Date prévue</th><th>Validation</th><th>Employé</th><th>Tâche</th><th>Zone</th><th>Statut</th><th>Commentaire</th><th>Photo</th></tr></thead><tbody>{rows.map(({ task, record }) => <tr key={task.id}><td>{formatDate(task.plannedAt)}</td><td>{record?.completedAt ? formatDate(record.completedAt) : "—"}</td><td>{record?.signature || "—"}</td><td><strong>{task.title}</strong><small>{task.frequency}</small></td><td>{task.zone}</td><td><StatusBadge status={task.status} /></td><td>{record?.validationComment || task.comments || "—"}</td><td>{record?.attachments?.length ? "Oui" : "—"}</td></tr>)}</tbody></table></div><footer className="table-footer"><span>{rows.length} ligne(s)</span><span><Archive size={15} /> Historique PMS conservé</span></footer></section>
  </>;
}

function isTodo(task: CleaningTask) {
  return ["À faire", "En retard"].includes(task.status);
}

export function PeriodFields({ period, setPeriod, from, setFrom, to, setTo }: {
  period: ExportPeriod; setPeriod: (period: ExportPeriod) => void;
  from: string; setFrom: (value: string) => void; to: string; setTo: (value: string) => void;
}) {
  return <>
    <select className="period-select" aria-label="Période" value={period} onChange={(event) => setPeriod(event.target.value as ExportPeriod)}>
      <option value="today">Aujourd’hui</option><option value="week">Cette semaine</option>
      <option value="month">Ce mois</option><option value="all">Tout</option><option value="custom">Personnalisée</option>
    </select>
    {period === "custom" && <>
      <input className="period-date" aria-label="Date de début" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
      <input className="period-date" aria-label="Date de fin" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
    </>}
  </>;
}

const formatDate = (value: string) => `${formatShortDate(value)} · ${value.slice(11, 16)}`;
const formatShortDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));

function createTemperatureNc(row: TemperatureCheck, setData: (updater: (data: HygieneData) => HygieneData) => void, operatorName: string) {
  const now = new Date().toISOString();
  const record: NonConformity = {
    id: crypto.randomUUID(), createdAt: now, updatedAt: now, createdBy: operatorName, updatedBy: operatorName,
    status: "Ouverte", occurredAt: row.checkedAt, type: "Température",
    description: `${row.equipmentName} hors seuil : ${row.temperature} °C`,
    severity: row.temperature > row.maxThreshold + 3 ? "Élevée" : "Moyenne",
    productIsolated: row.productIsolated, productDestroyed: false,
    immediateAction: row.correctiveAction || "Contrôle immédiat de l’équipement",
    correctiveAction: row.correctiveAction, owner: operatorName, sourceType: "temperature", sourceId: row.id,
  };
  setData((data) => ({ ...data, nonConformities: [record, ...data.nonConformities] }));
}
