"use client";

import { useState } from "react";

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

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="text-foreground"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? "\u2600" : "\u263e"}
    </button>
  );
}
