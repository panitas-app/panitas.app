import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

export const metadata: Metadata = {
  title: "Panitas - Monta tu tienda en línea en minutos",
  description:
    "Sin complicaciones técnicas, adaptado a los métodos de pago en Venezuela y diseñado para hacer crecer tu negocio entre panas.",
  manifest: "/manifest.json",
  icons: { icon: "/faviconnew.jpeg", apple: "/faviconnew.jpeg" },
  appleWebApp: { capable: true, title: "Panitas", statusBarStyle: "black-translucent" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="es" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.prod.website-files.com" />
        <link rel="dns-prefetch" href="https://cdn.prod.website-files.com" />
      </head>
      <body className="min-h-full flex flex-col font-body bg-white text-[#050505]">
        <SessionProvider>
          {children}
        </SessionProvider>
        <CookieConsentBanner />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
