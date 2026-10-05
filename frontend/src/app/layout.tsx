import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieBanner } from "@/components/cookie-banner";
import { PWARegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Emanus IA | O teu professor",
  description: "Construído em Angola. Para o mundo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-AO" suppressHydrationWarning>
      <head>
        {/* ── Favicon Emanus IA ── */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="shortcut icon" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        
        {/* ── PWA & App Download ── */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B0F17" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Emanus IA" />
        <meta name="application-name" content="Emanus IA" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* ── Fontes ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-dark text-text font-sans" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieBanner />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
