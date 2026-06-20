import { Download, RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (needRefresh) {
    return (
      <div className="pwa-prompt">
        <RefreshCw size={18} />
        <span>Une mise à jour de Pack Hygiène est disponible.</span>
        <button onClick={() => updateServiceWorker(true)}>Mettre à jour</button>
        <button className="pwa-prompt__close" onClick={() => setNeedRefresh(false)} aria-label="Fermer"><X size={17} /></button>
      </div>
    );
  }

  if (!installPrompt) return null;

  const install = async () => {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="pwa-prompt">
      <Download size={18} />
      <span>Installer Pack Hygiène sur cet appareil.</span>
      <button onClick={install}>Installer</button>
      <button className="pwa-prompt__close" onClick={() => setInstallPrompt(null)} aria-label="Fermer"><X size={17} /></button>
    </div>
  );
}
