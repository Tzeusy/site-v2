import type { Metadata } from "next";
import { IBM_Plex_Serif, Inter } from "next/font/google";
import { Masthead } from "@/components/layout/masthead";
import { SiteFooter } from "@/components/layout/site-footer";
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
  const key = "site-theme";
  const saved = localStorage.getItem(key);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
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
        <div className="min-h-screen">
          <Masthead />
          <main className="mx-auto w-full max-w-[75ch] px-6 py-16 sm:px-8 sm:py-20">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
