"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type ThemePreference = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [dark, setDark] = useState(false);

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
    return () => mediaQuery.removeEventListener("change", followSystem);
  }, []);

  function selectTheme(preference: ThemePreference) {
    localStorage.setItem("cv-deck-theme", preference);
    setTheme(preference);
    applyTheme(preference);
  }

  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Select theme. Current preference: ${theme}`}>{theme === "system" ? <Monitor className="h-5 w-5" /> : dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuLabel>Theme</DropdownMenuLabel><DropdownMenuRadioGroup value={theme} onValueChange={(value) => selectTheme(value as ThemePreference)}><DropdownMenuRadioItem value="light"><Sun className="h-4 w-4" /> Light</DropdownMenuRadioItem><DropdownMenuRadioItem value="dark"><Moon className="h-4 w-4" /> Dark</DropdownMenuRadioItem><DropdownMenuRadioItem value="system"><Monitor className="h-4 w-4" /> System settings</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>;
}
