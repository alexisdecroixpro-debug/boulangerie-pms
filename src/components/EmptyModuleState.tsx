import { ArrowLeft, Clock3 } from "lucide-react";
import type { CSSProperties } from "react";
import type { BakeryModule } from "../config/modules";

export function EmptyModuleState({
  module,
  onBack,
}: {
  module: BakeryModule;
  onBack: () => void;
}) {
  const Icon = module.icon;

  return (
    <div className="empty-module">
      <header className="module-page-header">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Retour à l’accueil</button>
        <div className="module-page-heading" style={{ "--module-color": module.color, "--module-soft": module.softColor } as CSSProperties}>
          <div className="module-page-heading__icon"><Icon size={30} /></div>
          <div>
            <span>{module.status}</span>
            <h1>Module {module.title}</h1>
            <p>{module.description}</p>
          </div>
        </div>
      </header>
      <section className="empty-module__panel">
        <div className="empty-module__message">
          <div className="empty-module__clock"><Clock3 size={28} /></div>
          <h2>Ce module se prépare</h2>
          <p>La page est prête à accueillir les futures fonctionnalités sans interrompre votre travail dans le Pack Hygiène.</p>
        </div>
        <div className="empty-module__features">
          <h3>Fonctionnalités prévues</h3>
          <div>
            {module.features.map((feature) => <span key={feature}>{feature}</span>)}
          </div>
        </div>
      </section>
    </div>
  );
}
