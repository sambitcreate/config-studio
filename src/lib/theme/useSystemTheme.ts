import { useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

function getMediaQueryList(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function subscribe(onChange: () => void): () => void {
  const mql = getMediaQueryList();
  if (!mql) {
    return () => {};
  }
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): ThemeMode {
  return getMediaQueryList()?.matches ? "dark" : "light";
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export function useSystemTheme(): ThemeMode {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("jse-theme-dark", theme === "dark");
  }, [theme]);

  return theme;
}
