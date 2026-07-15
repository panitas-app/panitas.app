import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";
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
        <Script
          id="gtm-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TDP569Q9');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body bg-white text-[#050505]">
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TDP569Q9"
            height={0} width={0} style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        <SessionProvider>
          {children}
        </SessionProvider>
        <CookieConsentBanner />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
