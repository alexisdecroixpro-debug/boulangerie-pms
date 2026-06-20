import { Home, LogOut, Menu, Store, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { bakeryModules, type ModuleId } from "../config/modules";

export function MainLayout({
  activeModule,
  operatorName,
  userEmail,
  onNavigate,
  onSignOut,
  children,
}: {
  activeModule?: ModuleId;
  operatorName: string;
  userEmail?: string;
  onNavigate: (path: string) => void;
  onSignOut?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const go = (path: string) => {
    onNavigate(path);
    setOpen(false);
  };

  return (
    <div className="main-layout">
      <aside className={`main-sidebar${open ? " main-sidebar--open" : ""}`}>
        <div className="main-brand">
          <div className="main-brand__mark"><Store size={23} /></div>
          <div><strong>Mon Atelier</strong><span>Boulangerie & pâtisserie</span></div>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X /></button>
        </div>
        <nav className="main-nav">
          <button className={!activeModule ? "active" : ""} onClick={() => go("/")}>
            <Home size={20} /><span>Accueil</span>
          </button>
          <span className="nav__label">Modules</span>
          {bakeryModules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                className={activeModule === module.id ? "active" : ""}
                onClick={() => go(`/${module.id}`)}
              >
                <Icon size={20} />
                <span>{module.title}</span>
                {module.status === "Disponible" && <i aria-label="Disponible" />}
              </button>
            );
          })}
        </nav>
        <div className="main-sidebar__footer">
          <div className="avatar">{operatorName.slice(0, 1).toUpperCase()}</div>
          <div><strong>{operatorName}</strong><span>{userEmail || "Mode démonstration"}</span></div>
          {onSignOut && <button className="sign-out" onClick={onSignOut} aria-label="Se déconnecter"><LogOut size={17} /></button>}
        </div>
      </aside>
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
      <main className="main-content">{children}</main>
    </div>
  );
}
