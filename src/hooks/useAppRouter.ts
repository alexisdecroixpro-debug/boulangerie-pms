import { useCallback, useEffect, useState } from "react";

function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
}

export function useAppRouter() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const handlePopState = () => setPath(currentPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((nextPath: string, options?: { replace?: boolean }) => {
    const normalized = nextPath === "/" ? "/" : nextPath.replace(/\/+$/, "");
    if (options?.replace) window.history.replaceState({}, "", normalized);
    else window.history.pushState({}, "", normalized);
    setPath(normalized);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { path, navigate };
}
