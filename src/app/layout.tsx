import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConceptThemeProvider } from "@/components/ConceptThemeProvider";

export const metadata: Metadata = {
  title: "おこづかいアプリ",
  description: "家族のおこづかい管理アプリ",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#E60012",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 既存フォント */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Fredoka:wght@400;600;700&family=M+PLUS+Rounded+1c:wght@400;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* コンセプトフォント: cosmic=Space Grotesk+JetBrains, pixel=Press Start 2P+DotGothic16, workshop=Fraunces+Inter, arcade=Bungee+Plus Jakarta Sans */}
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Press+Start+2P&family=DotGothic16&family=Fraunces:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@400;500;600;700&family=Bungee&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body className="min-h-full" style={{ background: "var(--background)" }}>
        <ConceptThemeProvider>
          {children}
        </ConceptThemeProvider>
        {/* コンセプトを初回ロード時にflashなしで適用するインラインスクリプト */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var c=localStorage.getItem('okozukai-concept');if(c)document.documentElement.setAttribute('data-concept',c);})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
