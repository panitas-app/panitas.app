import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { OrganizationSchema, SoftwareApplicationSchema, WebSiteSchema, LocalBusinessSchema, WebPageSchema } from "@/lib/seo/schema";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FFB92E",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Panitas | Software Administrativo para Negocios en Venezuela",
    template: "%s | Panitas",
  },
  description:
    "Software administrativo en la nube para controlar inventario, vender online con POS, agendar citas y administrar clientes. Diseñado para negocios venezolanos. Prueba gratis 14 días.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Panitas",
    statusBarStyle: "black-translucent",
  },
  alternates: {
    canonical: "/",
    languages: {
      "es-VE": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "Panitas",
    title: "Panitas | Software Administrativo para Negocios en Venezuela",
    description:
      "Software administrativo en la nube para controlar inventario, vender online con POS, agendar citas y administrar clientes. Diseñado para negocios venezolanos.",
    url: baseUrl,
    images: [{ url: `${baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Panitas – Software administrativo para negocios en Venezuela" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@panitasapp",
    creator: "@panitasapp",
    title: "Panitas | Software Administrativo para Negocios en Venezuela",
    description:
      "Software administrativo en la nube para controlar inventario, vender online con POS, agendar citas y administrar clientes. Diseñado para negocios venezolanos.",
    images: [`${baseUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  other: {
    "theme-color": "#FFB92E",
    "application-name": "Panitas",
  },
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
        <script dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TDP569Q9');`,
        }} />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-MFZ0PXLDRY"></script>
        <script dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-MFZ0PXLDRY');`,
        }} />
        <OrganizationSchema />
        <SoftwareApplicationSchema />
        <WebSiteSchema />
        <LocalBusinessSchema />
        <WebPageSchema title="Panitas | Software Administrativo para Negocios en Venezuela" description="Software administrativo en la nube para controlar inventario, vender online con POS, agendar citas y administrar clientes. Diseñado para negocios venezolanos. Prueba gratis 14 días." path="" />
      </head>
      <body className="min-h-full flex flex-col font-body bg-white text-[#050505]">
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TDP569Q9"
height={0} width={0} style={{ display: "none", visibility: "hidden" }}></iframe></noscript>
        <SessionProvider>
          {children}
        </SessionProvider>
        <CookieConsentBanner />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
