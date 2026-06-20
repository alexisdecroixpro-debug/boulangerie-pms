import {
  AlertTriangle,
  BookOpen,
  Boxes,
  ChevronLeft,
  ClipboardCheck,
  FileWarning,
  LayoutDashboard,
  Menu,
  PackageOpen,
  Settings2,
  Sparkles,
  ClipboardList,
  Thermometer,
  Truck,
  Cloud,
  CloudOff,
  Home,
  LogOut,
  UserCog,
  Users,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { HygienePageId } from "../types/navigation";
import type { SyncStatus } from "../hooks/useHygieneData";

const primary = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "openings", label: "Ouvertures matières", icon: PackageOpen },
  { id: "batches", label: "Fabrications & lots", icon: Boxes },
  { id: "temperatures", label: "Températures", icon: Thermometer },
  { id: "cleaning", label: "Nettoyage du jour", icon: Sparkles },
  { id: "deliveries", label: "Réceptions", icon: Truck },
  { id: "nonconformities", label: "Non-conformités", icon: FileWarning },
  { id: "shelfLife", label: "DLC internes", icon: AlertTriangle },
  { id: "procedures", label: "Procédures PMS", icon: BookOpen },
] as const;

const adminCleaning = [
  { id: "cleaningPlan", label: "Plan nettoyage", icon: ClipboardList },
  { id: "cleaningHistory", label: "Historique nettoyage", icon: ClipboardCheck },
] as const;

const settings = [
  { id: "inspection", label: "Mode contrôle", icon: ShieldCheck },
  { id: "account", label: "Mon compte", icon: UserCog },
] as const;

export function AppShell({
  page,
  setPage,
  onHome,
  syncStatus,
  userEmail,
  operatorName,
  isAdmin,
  onSignOut,
  children,
}: {
  page: HygienePageId;
  setPage: (page: HygienePageId) => void;
  onHome: () => void;
  syncStatus: SyncStatus;
  userEmail?: string;
  operatorName: string;
  isAdmin: boolean;
  onSignOut?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? " sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand__mark"><ClipboardCheck size={23} /></div>
          <div><strong>Pack Hygiène</strong><span>PMS numérique</span></div>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X /></button>
        </div>
        <nav className="nav">
          <button className="nav-home" onClick={() => { onHome(); setOpen(false); }}>
            <Home size={20} />
            <span>Accueil général</span>
          </button>
          <span className="nav__label">Registres</span>
          {primary.map((item) => (
            <button
              key={item.id}
              className={page === item.id || (item.id === "openings" && page === "openingOcr") ? "active" : ""}
              onClick={() => { setPage(item.id); setOpen(false); }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
          {isAdmin && adminCleaning.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => { setPage(item.id); setOpen(false); }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
          <span className="nav__label nav__label--future">Paramètres</span>
          {settings.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => { setPage(item.id); setOpen(false); }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
          {isAdmin && (
            <button
              className={page === "users" ? "active" : ""}
              onClick={() => { setPage("users"); setOpen(false); }}
            >
              <Users size={20} />
              <span>Utilisateurs</span>
            </button>
          )}
        </nav>
        <div className={`sync-state sync-state--${syncStatus}`}>
          {syncStatus === "error" ? <CloudOff size={17} /> : <Cloud size={17} />}
          <span>{syncLabel(syncStatus)}</span>
        </div>
        <div className="sidebar__footer">
          <Settings2 size={18} />
          <div><strong>{operatorName}</strong><span>{userEmail || "Mode démonstration local"}</span></div>
          {onSignOut ? <button className="sign-out" onClick={onSignOut} aria-label="Se déconnecter"><LogOut size={17} /></button> : <ChevronLeft size={16} />}
        </div>
      </aside>
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
      <main className="main">{children}</main>
    </div>
  );
}

function syncLabel(status: SyncStatus) {
  if (status === "local") return "Données locales";
  if (status === "loading") return "Chargement du cloud…";
  if (status === "syncing") return "Synchronisation…";
  if (status === "offline") return "Mode hors ligne";
  if (status === "pending") return "Saisies en attente";
  if (status === "error") return "Erreur de synchronisation";
  return "Données synchronisées";
}
