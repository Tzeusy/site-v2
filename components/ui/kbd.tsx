"use client";

import { useEffect, useState } from "react";

export function useModKey() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);
  return isMac ? "⌘" : "Ctrl+";
}

export function Kbd({ shortcut }: { shortcut: string }) {
  const mod = useModKey();

  return (
    <kbd className="rounded border border-rule px-1.5 py-0.5 font-sans text-xs">
      {mod}{shortcut}
    </kbd>
  );
}
