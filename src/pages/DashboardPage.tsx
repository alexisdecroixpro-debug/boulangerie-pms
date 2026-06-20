import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  Clock3,
  PackageOpen,
  Sparkles,
  Thermometer,
  FileWarning,
  ShieldCheck,
} from "lucide-react";
import type { HygieneData, HygieneDashboard } from "../domain/types";
import { StatusBadge } from "../components/StatusBadge";
import type { HygienePageId, QuickForm } from "../types/navigation";

export function DashboardPage({
  data,
  dashboard,
  setPage,
  openForm,
}: {
  data: HygieneData;
  dashboard: HygieneDashboard;
  setPage: (page: HygienePageId) => void;
  openForm: (form: QuickForm) => void;
}) {
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
  const tasks = [
    ...data.temperatureChecks.slice(-2).map((item) => ({
      id: item.id,
      icon: Thermometer,
      title: item.equipmentName,
      detail: `${item.temperature} °C relevé à ${item.checkedAt.slice(11, 16)}`,
      status: item.status,
    })),
    ...data.cleaningTasks.slice(0, 3).map((item) => ({
      id: item.id,
      icon: Sparkles,
      title: item.title,
      detail: `${item.zone} · ${item.plannedAt.slice(11, 16)}`,
      status: item.status,
    })),
  ];
  const alerts = [
    ...data.temperatureChecks.filter((item) => !item.compliant).map((item) => ({
      id: item.id, danger: true, title: `${item.equipmentName} à ${item.temperature} °C`,
      detail: `Seuil maximal : ${item.maxThreshold} °C`,
    })),
    ...data.cleaningTasks.filter((item) => item.status === "En retard").map((item) => ({
      id: item.id, danger: false, title: item.title, detail: `${item.zone} · ${item.plannedAt.slice(11, 16)}`,
    })),
  ].slice(0, 3);
  const activities = [
    ...data.batches.map((item) => ({
      id: item.id, at: item.manufacturedAt, title: `Lot ${item.internalLot}`,
      detail: `Créé par ${item.responsible} · ${item.manufacturedAt.slice(11, 16)}`,
    })),
    ...data.openings.map((item) => ({
      id: item.id, at: item.openedAt, title: `${item.materialName} ouvert`,
      detail: `Lot ${item.internalLot} · ${item.openedAt.slice(11, 16)}`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-date">{todayLabel}</p>
          <h1>Tableau de bord hygiène</h1>
          <p>Les contrôles essentiels de l’atelier, au même endroit.</p>
        </div>
        <button className="button button--primary" onClick={() => setPage("inspection")}><ShieldCheck size={20} /> Mode contrôle sanitaire</button>
      </header>

      <section className="status-strip" aria-label="Synthèse des contrôles">
        <Summary icon={Clock3} label="À faire" value={dashboard.todo} tone="todo" />
        <Summary icon={Check} label="Terminés" value={dashboard.done} tone="done" />
        <Summary icon={AlertTriangle} label="En retard" value={dashboard.overdue} tone="late" />
        <Summary icon={AlertTriangle} label="Non conformes" value={dashboard.nonCompliant} tone="danger" />
      </section>

      <h2 className="quick-title">Actions rapides</h2>
      <section className="quick-actions quick-actions--five">
        <Quick icon={Thermometer} label="Relever une température" onClick={() => openForm("temperature")} />
        <Quick icon={Sparkles} label="Valider un nettoyage" onClick={() => setPage("cleaning")} />
        <Quick icon={PackageOpen} label="Ouvrir une matière première" onClick={() => openForm("opening")} />
        <Quick icon={Boxes} label="Créer une fabrication / lot" onClick={() => openForm("batch")} />
        <Quick icon={FileWarning} label="Déclarer une non-conformité" onClick={() => openForm("nonconformity")} />
      </section>

      <section className="dashboard-indicators">
        <Indicator label="Températures non saisies" value={dashboard.missingTemperatures} onClick={() => setPage("temperatures")} />
        <Indicator label="Nettoyages non validés" value={dashboard.cleaningPending} onClick={() => setPage("cleaning")} />
        <Indicator label="DLC proches" value={dashboard.expiringSoon} onClick={() => setPage("shelfLife")} />
        <Indicator label="Non-conformités ouvertes" value={dashboard.openNonConformities} onClick={() => setPage("nonconformities")} />
      </section>

      <div className="dashboard-grid">
        <section className="panel panel--main">
          <div className="section-heading">
            <div><h2>Contrôles du jour</h2><p>{tasks.length} opérations enregistrées ou planifiées</p></div>
            <button className="text-button" onClick={() => setPage("cleaning")}>Tout afficher <ArrowRight size={17} /></button>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-row" key={task.id}>
                <div className="task-row__icon"><task.icon size={20} /></div>
                <div className="task-row__body"><strong>{task.title}</strong><span>{task.detail}</span></div>
                <StatusBadge status={task.status} />
              </article>
            ))}
          </div>
        </section>

        <aside className="dashboard-aside">
          <section className="panel alert-panel">
            <div className="section-heading"><div><h2>Alertes</h2><p>À traiter aujourd’hui</p></div></div>
            {alerts.length ? alerts.map((alert) => (
              <div className={`alert-item${alert.danger ? " alert-item--danger" : ""}`} key={alert.id}>
                {alert.danger ? <AlertTriangle size={19} /> : <Clock3 size={19} />}
                <div><strong>{alert.title}</strong><span>{alert.detail}</span></div>
              </div>
            )) : <p className="empty-state">Aucune alerte active.</p>}
          </section>
          <section className="panel">
            <div className="section-heading"><div><h2>Dernières activités</h2><p>Traçabilité récente</p></div></div>
            {activities.length ? activities.map((activity) => (
              <div className="activity" key={activity.id}><span className="activity__dot" /><div><strong>{activity.title}</strong><span>{activity.detail}</span></div></div>
            )) : <p className="empty-state">Aucune activité enregistrée.</p>}
          </section>
        </aside>
      </div>
    </>
  );
}

function Summary({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: number; tone: string }) {
  return <div className={`summary summary--${tone}`}><div className="summary__icon"><Icon size={21} /></div><div><strong>{value}</strong><span>{label}</span></div></div>;
}

function Quick({ icon: Icon, label, onClick }: { icon: typeof Clock3; label: string; onClick: () => void }) {
  return <button className="quick" onClick={onClick}><Icon size={22} /><span>{label}</span><ArrowRight size={17} /></button>;
}

function Indicator({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return <button className={value ? "indicator indicator--alert" : "indicator"} onClick={onClick}><strong>{value}</strong><span>{label}</span></button>;
}
