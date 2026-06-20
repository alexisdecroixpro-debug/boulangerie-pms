import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { BakeryModule } from "../config/modules";

export function ModuleCard({
  module,
  featured = false,
  onOpen,
}: {
  module: BakeryModule;
  featured?: boolean;
  onOpen: () => void;
}) {
  const Icon = module.icon;

  return (
    <article
      className={`module-card${featured ? " module-card--featured" : ""}`}
      style={{ "--module-color": module.color, "--module-soft": module.softColor } as CSSProperties}
    >
      <div className="module-card__top">
        <div className="module-card__icon"><Icon size={featured ? 30 : 26} /></div>
        <span className={`module-status module-status--${statusClass(module.status)}`}>{module.status}</span>
      </div>
      <div className="module-card__content">
        <h2>{module.title}</h2>
        <p>{module.description}</p>
      </div>
      {featured && (
        <div className="module-card__features" aria-label="Fonctionnalités principales">
          {module.features.slice(0, 4).map((feature) => <span key={feature}>{feature}</span>)}
        </div>
      )}
      <button className="module-card__button" onClick={onOpen}>
        Ouvrir <ArrowRight size={18} />
      </button>
    </article>
  );
}

function statusClass(status: BakeryModule["status"]) {
  if (status === "Disponible") return "available";
  if (status === "En développement") return "development";
  return "soon";
}
