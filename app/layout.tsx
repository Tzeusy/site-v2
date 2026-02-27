import type { Metadata } from "next";
import { IBM_Plex_Serif, Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Masthead } from "@/components/layout/masthead";
import { SiteFooter } from "@/components/layout/site-footer";
import { CommandPaletteProvider } from "@/components/ui/command-palette-provider";
import { WeatherEffects } from "@/components/ui/weather-effects";
import "./tailwind.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tze.how"),
  title: {
    default: "Tze How",
    template: "%s | Tze How",
  },
  description: "Personal publication site of Tze How.",
  alternates: {
    types: {
      "application/rss+xml": "https://tze.how/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    siteName: "Tze How",
    title: "Tze How",
    description: "Personal publication site of Tze How.",
    url: "https://tze.how",
  },
  twitter: {
    card: "summary",
    title: "Tze How",
    description: "Personal publication site of Tze How.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const themeScript = `
(() => {
  const themeKey = "site-theme";
  const saved = localStorage.getItem(themeKey);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;

  const weatherKey = "site-weather";
  const savedWeather = localStorage.getItem(weatherKey);
  const weather = savedWeather === "rain" || savedWeather === "snow" || savedWeather === "aurora" || savedWeather === "meteor" || savedWeather === "sun" ? savedWeather : "sun";
  document.documentElement.dataset.weather = weather;
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} ${ibmPlexSerif.variable} bg-background text-foreground antialiased`}
      >
        <WeatherEffects />
        <div className="min-h-screen">
          <Masthead />
          <main className="mx-auto w-full max-w-[75ch] px-6 py-16 sm:px-8 sm:py-20">
            {children}
          </main>
          <SiteFooter />
        </div>
        <CommandPaletteProvider />
      </body>
      <GoogleAnalytics gaId="G-R2H8ES2JKZ" />
    </html>
  );
}
