"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
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

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  const docTheme = document.documentElement.dataset.theme;
  if (docTheme === "light" || docTheme === "dark") {
    return docTheme;
  }

  return getInitialTheme();
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === "data-theme")) {
      onStoreChange();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => observer.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    () => "light",
  );

  const mod = useModKey();
  const isDark = theme === "dark";

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setThemeOnDocument(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  }, [theme]);

  useEffect(() => {
    const docTheme = document.documentElement.dataset.theme;
    if (docTheme === "light" || docTheme === "dark") {
      return;
    }

    const initialTheme = getInitialTheme();
    setThemeOnDocument(initialTheme);
    localStorage.setItem(THEME_KEY, initialTheme);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        toggleTheme();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-14 items-center rounded-full border p-0.5 text-foreground transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 ${
        isDark
          ? "border-[#3f3a34] bg-[#2a2621]"
          : "border-[#d6d3d1] bg-[#f4f4f3]"
      }`}
      aria-label={`Toggle theme (${mod}J)`}
      aria-pressed={isDark}
      title={`${isDark ? "Switch to day mode" : "Switch to night mode"} (${mod}J)`}
    >
      <span aria-hidden className="absolute left-1.5 text-[10px] text-[#f59e0b]">
        {"\u2600"}
      </span>
      <span aria-hidden className="absolute right-1.5 text-[10px] text-[#94a3b8]">
        {"\u263e"}
      </span>
      <span
        className={`relative z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-out ${
          isDark ? "translate-x-6" : "translate-x-0"
        }`}
      >
        <span suppressHydrationWarning>{isDark ? "\u263e" : "\u2600"}</span>
      </span>
    </button>
  );
}
