"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () =>
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC")
    ? "⌘"
    : "Ctrl+";
const getServerSnapshot = () => "⌘";

export function useModKey() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function Kbd({ shortcut }: { shortcut: string }) {
  const mod = useModKey();

  return (
    <kbd className="rounded border border-rule px-1.5 py-0.5 font-sans text-xs">
      {mod}{shortcut}
    </kbd>
  );
}
