"use client";

import { useEffect, useState } from "react";
import { useModKey } from "@/components/ui/kbd";

type Theme = "light" | "dark";

const THEME_KEY = "site-theme";

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setThemeOnDocument(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const docTheme = document.documentElement.dataset.theme;
    if (docTheme === "light" || docTheme === "dark") {
      return docTheme;
    }

    return getInitialTheme();
  });

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setThemeOnDocument(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        handleToggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const mod = useModKey();

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="text-foreground"
      aria-label={`Toggle theme (${mod}J)`}
      title={`Toggle theme (${mod}J)`}
    >
      <span suppressHydrationWarning>
        {theme === "dark" ? "\u2600" : "\u263e"}
      </span>
    </button>
  );
}
