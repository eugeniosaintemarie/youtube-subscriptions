import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "YouTube Subscriptions",
  description: "Viewer de suscripciones de YouTube para uso personal",
  manifest: "/manifest.json",
  themeColor: "#3ea6ff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YouTube Subscriptions"
  },
  formatDetection: {
    telephone: false
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="YT Subs" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%233ea6ff' width='192' height='192'/><path fill='white' d='M66 77l44 28-44 28V77m126-45H0v154h192V32zm-38 112c0 11-9 20-20 20H54c-11 0-20-9-20-20V76c0-11 9-20 20-20h114c11 0 20 9 20 20v68z'/></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%233ea6ff' width='192' height='192'/><path fill='white' d='M66 77l44 28-44 28V77m126-45H0v154h192V32zm-38 112c0 11-9 20-20 20H54c-11 0-20-9-20-20V76c0-11 9-20 20-20h114c11 0 20 9 20 20v68z'/></svg>" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `
          }}
        />
      </head>
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
