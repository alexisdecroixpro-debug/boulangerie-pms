import { AuthScreen } from "./components/AuthScreen";
import { EmptyModuleState } from "./components/EmptyModuleState";
import { MainLayout } from "./components/MainLayout";
import { PwaPrompt } from "./components/PwaPrompt";
import { moduleById, type ModuleId } from "./config/modules";
import { useAppRouter } from "./hooks/useAppRouter";
import { useAuth } from "./hooks/useAuth";
import { HygieneModule } from "./pages/HygieneModule";
import { MainDashboardPage } from "./pages/MainDashboardPage";

export default function App() {
  const auth = useAuth();
  const { path, navigate } = useAppRouter();
  const operatorName = auth.session?.user.user_metadata?.username
    || auth.session?.user.user_metadata?.full_name
    || auth.session?.user.email?.split("@")[0]
    || "Utilisateur";

  if (auth.configured && (auth.loading || !auth.session)) {
    return (
      <>
        <AuthScreen loading={auth.loading} onSignedIn={() => navigate("/", { replace: true })} />
        <PwaPrompt />
      </>
    );
  }

  if (path === "/hygiene" || path.startsWith("/hygiene/")) {
    return (
      <>
        <HygieneModule
          path={path}
          navigate={navigate}
          session={auth.session}
          role={auth.role}
          onSignOut={auth.configured ? auth.signOut : undefined}
        />
        <PwaPrompt />
      </>
    );
  }

  const moduleId = getModuleId(path);

  return (
    <>
      <MainLayout
        activeModule={moduleId}
        operatorName={operatorName}
        userEmail={auth.session?.user.email}
        onNavigate={navigate}
        onSignOut={auth.configured ? auth.signOut : undefined}
      >
        {moduleId
          ? <EmptyModuleState module={moduleById[moduleId]} onBack={() => navigate("/")} />
          : <MainDashboardPage operatorName={operatorName} onNavigate={navigate} />}
      </MainLayout>
      <PwaPrompt />
    </>
  );
}

function getModuleId(path: string): Exclude<ModuleId, "hygiene"> | undefined {
  const id = path.slice(1) as ModuleId;
  if (id && id !== "hygiene" && id in moduleById) return id;
  return undefined;
}
