import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConceptThemeProvider } from "@/components/ConceptThemeProvider";

export const metadata: Metadata = {
  title: "おこづかいアプリ",
  description: "家族のおこづかい管理アプリ",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0068B7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full" data-concept="workshop">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@400;500;600;700&family=M+PLUS+Rounded+1c:wght@400;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body className="min-h-full" style={{ background: "var(--c-bg)" }}>
        <ConceptThemeProvider>
          {children}
        </ConceptThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}`,
          }}
        />
      </body>
    </html>
  );
}
