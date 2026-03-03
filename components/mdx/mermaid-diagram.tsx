"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type ThemeColors = {
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  lineColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  background: string;
  mainBkg: string;
  nodeBorder: string;
  clusterBkg: string;
  titleColor: string;
  edgeLabelBackground: string;
};

const lightColors: ThemeColors = {
  primaryColor: "#f5f5f4",
  primaryTextColor: "#1c1917",
  primaryBorderColor: "#d6d3d1",
  lineColor: "#78716c",
  secondaryColor: "#e7e5e4",
  tertiaryColor: "#fafaf9",
  background: "#fafaf9",
  mainBkg: "#f5f5f4",
  nodeBorder: "#d6d3d1",
  clusterBkg: "#fafaf9",
  titleColor: "#1c1917",
  edgeLabelBackground: "#fafaf9",
};

const darkColors: ThemeColors = {
  primaryColor: "#292524",
  primaryTextColor: "#e7e5e4",
  primaryBorderColor: "#44403c",
  lineColor: "#78716c",
  secondaryColor: "#1c1917",
  tertiaryColor: "#171412",
  background: "#171412",
  mainBkg: "#292524",
  nodeBorder: "#44403c",
  clusterBkg: "#1c1917",
  titleColor: "#e7e5e4",
  edgeLabelBackground: "#1c1917",
};

function getTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

let idCounter = 0;

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const chartRef = useRef(chart);
  chartRef.current = chart;

  const render = useCallback(async () => {
    const mermaid = (await import("mermaid")).default;
    const theme = getTheme();
    const colors = theme === "dark" ? darkColors : lightColors;

    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: colors,
      flowchart: { useMaxWidth: true },
    });

    const id = `mermaid-${++idCounter}`;
    const { svg: rendered } = await mermaid.render(id, chartRef.current);
    setSvg(rendered);
  }, []);

  useEffect(() => {
    render();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          render();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [render]);

  if (!svg) {
    return (
      <div className="my-6 flex items-center justify-center py-12 text-sm text-muted">
        Loading diagram…
      </div>
    );
  }

  return (
    <div className="mermaid-breakout my-6">
      <div
        ref={containerRef}
        className="overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
