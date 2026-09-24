"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemePreference = "light" | "dark" | "system";

const options: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System settings", Icon: Monitor },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function applyTheme(preference: ThemePreference) {
    const useDark = preference === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : preference === "dark";
    document.documentElement.classList.toggle("dark", useDark);
    setDark(useDark);
  }

  useEffect(() => {
    const stored = localStorage.getItem("cv-deck-theme");
    const preference: ThemePreference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setTheme(preference);
    applyTheme(preference);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => { if ((localStorage.getItem("cv-deck-theme") || "system") === "system") applyTheme("system"); };
    mediaQuery.addEventListener("change", followSystem);
    const closeOnOutsideClick = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => { mediaQuery.removeEventListener("change", followSystem); document.removeEventListener("mousedown", closeOnOutsideClick); };
  }, []);

  function selectTheme(preference: ThemePreference) {
    localStorage.setItem("cv-deck-theme", preference);
    setTheme(preference);
    applyTheme(preference);
    setOpen(false);
  }

  const TriggerIcon = theme === "system" ? Monitor : dark ? Moon : Sun;
  return <div ref={menuRef} className="relative"><Button variant="ghost" size="icon" onClick={() => setOpen((current) => !current)} aria-label={`Select theme. Current preference: ${theme}`} aria-expanded={open}><TriggerIcon className="h-5 w-5" /></Button>{open && <div role="menu" aria-label="Theme options" className="absolute right-0 top-full z-50 mt-2 w-44 rounded-lg border bg-white p-1 shadow-lg dark:bg-gray-900">{options.map(({ value, label, Icon }) => <button key={value} type="button" role="menuitemradio" aria-checked={theme === value} onClick={() => selectTheme(value)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"><Icon className="h-4 w-4" /><span className="flex-1">{label}</span>{theme === value && <Check className="h-4 w-4 text-blue-600" />}</button>)}</div>}</div>;
}
