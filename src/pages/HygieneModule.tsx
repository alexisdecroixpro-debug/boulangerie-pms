import type { Session } from "@supabase/supabase-js";
import { WifiOff } from "lucide-react";
import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { QuickForms } from "../components/QuickForms";
import { useHygieneData } from "../hooks/useHygieneData";
import type { HygienePageId, QuickForm } from "../types/navigation";
import { DashboardPage } from "./DashboardPage";
import { InspectionPage, OperationalPage } from "./OperationalPages";
import { CleaningPage, RegisterPage } from "./RegisterPages";
import { CleaningHistoryPage, CleaningPlanPage } from "./RegisterPages";
import { OpeningOcrPage } from "./OpeningOcrPage";
import { AccountPage, UsersPage } from "./SettingsPages";

const pagePaths: Record<HygienePageId, string> = {
  dashboard: "/hygiene",
  openings: "/hygiene/openings",
  openingOcr: "/hygiene/openings/ocr",
  batches: "/hygiene/batches",
  temperatures: "/hygiene/temperatures",
  cleaning: "/hygiene/cleaning",
  cleaningPlan: "/hygiene/cleaning/plan",
  cleaningHistory: "/hygiene/cleaning/history",
  deliveries: "/hygiene/deliveries",
  nonconformities: "/hygiene/nonconformities",
  shelfLife: "/hygiene/shelf-life",
  procedures: "/hygiene/procedures",
  inspection: "/hygiene/inspection",
  account: "/hygiene/account",
  users: "/hygiene/users",
};

const pathPages = Object.fromEntries(
  Object.entries(pagePaths).map(([page, path]) => [path, page]),
) as Record<string, HygienePageId>;

export function HygieneModule({
  path,
  navigate,
  session,
  role,
  onSignOut,
}: {
  path: string;
  navigate: (path: string) => void;
  session: Session | null;
  role: string | null;
  onSignOut?: () => void;
}) {
  const page = pathPages[path] ?? "dashboard";
  const setPage = (nextPage: HygienePageId) => navigate(pagePaths[nextPage]);
  const [quickForm, setQuickForm] = useState<QuickForm | null>(null);
  const operatorName = session?.user.user_metadata?.username
    || session?.user.user_metadata?.full_name
    || session?.user.email?.split("@")[0]
    || "Utilisateur tablette";
  const isAdmin = role === "owner";
  const { data, setData, dashboard, syncStatus, syncError, pendingCount, online } = useHygieneData(session?.user.id);

  return (
    <AppShell
      page={page}
      setPage={setPage}
      onHome={() => navigate("/")}
      syncStatus={syncStatus}
      userEmail={session?.user.email}
      operatorName={operatorName}
      isAdmin={isAdmin}
      onSignOut={onSignOut}
    >
      {!online && (
        <div className="offline-banner">
          <WifiOff size={18} />
          <span>Mode hors ligne. Vos saisies restent sur cet appareil et seront synchronisées automatiquement.</span>
          {pendingCount > 0 && <strong>{pendingCount} en attente</strong>}
        </div>
      )}
      {syncError && <div className="sync-error" role="alert">{syncError}</div>}
      {page === "dashboard" && <DashboardPage data={data} dashboard={dashboard} setPage={setPage} openForm={setQuickForm} />}
      {page === "openings" && <RegisterPage kind="openings" data={data} openForm={setQuickForm} operatorName={operatorName} onScan={() => setPage("openingOcr")} />}
      {page === "openingOcr" && <OpeningOcrPage data={data} setData={setData} operatorName={operatorName} onBack={() => setPage("openings")} onSaved={() => setPage("openings")} />}
      {page === "batches" && <RegisterPage kind="batches" data={data} openForm={setQuickForm} operatorName={operatorName} />}
      {page === "temperatures" && <RegisterPage kind="temperatures" data={data} openForm={setQuickForm} setData={setData} operatorName={operatorName} />}
      {page === "cleaning" && <CleaningPage data={data} setData={setData} operatorName={operatorName} isAdmin={isAdmin} setPage={setPage} />}
      {page === "cleaningPlan" && isAdmin && <CleaningPlanPage data={data} setData={setData} operatorName={operatorName} />}
      {page === "cleaningHistory" && isAdmin && <CleaningHistoryPage data={data} operatorName={operatorName} />}
      {page === "deliveries" && <OperationalPage kind="deliveries" data={data} openForm={setQuickForm} setData={setData} operatorName={operatorName} />}
      {page === "nonconformities" && <OperationalPage kind="nonconformities" data={data} openForm={setQuickForm} setData={setData} operatorName={operatorName} />}
      {page === "shelfLife" && <OperationalPage kind="shelfLife" data={data} openForm={setQuickForm} setData={setData} operatorName={operatorName} />}
      {page === "procedures" && <OperationalPage kind="procedures" data={data} openForm={setQuickForm} setData={setData} operatorName={operatorName} />}
      {page === "inspection" && <InspectionPage data={data} setPage={setPage} operatorName={operatorName} />}
      {page === "account" && <AccountPage session={session} onUpdated={onSignOut || (() => undefined)} />}
      {page === "users" && isAdmin && <UsersPage session={session} />}
      <QuickForms form={quickForm} data={data} close={() => setQuickForm(null)} setData={setData} operatorName={operatorName} />
    </AppShell>
  );
}
