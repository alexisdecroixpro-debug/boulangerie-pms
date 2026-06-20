import { CalendarDays, ChevronRight, ClipboardCheck } from "lucide-react";
import { bakeryModules } from "../config/modules";
import { ModuleCard } from "../components/ModuleCard";

export function MainDashboardPage({
  operatorName,
  onNavigate,
}: {
  operatorName: string;
  onNavigate: (path: string) => void;
}) {
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <header className="portal-header">
        <div>
          <p className="portal-date"><CalendarDays size={16} /> {today}</p>
          <h1>Bonjour {operatorName}</h1>
          <p>Accédez rapidement aux outils de votre atelier.</p>
        </div>
        <button className="portal-shortcut" onClick={() => onNavigate("/hygiene")}>
          <ClipboardCheck size={22} />
          <span><small>Accès rapide</small><strong>Pack Hygiène</strong></span>
          <ChevronRight size={19} />
        </button>
      </header>
      <section className="portal-intro">
        <div>
          <h2>Vos modules métier</h2>
          <p>Une seule application pour organiser la production, la conformité et la gestion de la boulangerie.</p>
        </div>
        <span>7 modules</span>
      </section>
      <section className="modules-grid">
        {bakeryModules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            featured={module.id === "hygiene"}
            onOpen={() => onNavigate(`/${module.id}`)}
          />
        ))}
      </section>
    </>
  );
}
