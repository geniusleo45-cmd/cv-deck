"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("cv-deck-theme");
    const useDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", useDark);
    setDark(useDark);
  }, []);
  function toggle() { const next = !dark; document.documentElement.classList.toggle("dark", next); localStorage.setItem("cv-deck-theme", next ? "dark" : "light"); setDark(next); }
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} theme`}><Sun className={`h-5 w-5 ${dark ? "hidden" : ""}`} /><Moon className={`h-5 w-5 ${dark ? "" : "hidden"}`} /></Button>;
}
