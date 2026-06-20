import { create } from "zustand";

interface ThemeStore {
  theme: "dark" | "light";
  toggle: () => void;
  setTheme: (t: "dark" | "light") => void;
}

function getPersistedTheme(): "dark" | "light" {
  const saved = localStorage.getItem("kamism_theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: string) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("kamism_theme", t);
}

applyTheme(getPersistedTheme());

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  theme: getPersistedTheme(),
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    applyTheme(next);
  },
  setTheme: (t) => {
    set({ theme: t });
    applyTheme(t);
  },
}));

export function applyStoredTheme() {
  applyTheme(getPersistedTheme());
}
