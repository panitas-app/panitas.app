import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { OrganizationSchema, SoftwareApplicationSchema, WebSiteSchema } from "@/lib/seo/schema";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Panitas – Gestiona tu negocio, vende online, organiza tus citas y escala",
    template: "%s | Panitas",
  },
  description:
    "SaaS venezolano todo-en-uno para gestionar tu negocio: tienda online, agenda de citas, CRM y control B2B. Sin complicaciones técnicas, adaptado a Venezuela.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/faviconnew.jpeg", type: "image/jpeg" }],
    apple: "/faviconnew.jpeg",
    shortcut: "/faviconnew.jpeg",
  },
  appleWebApp: {
    capable: true,
    title: "Panitas",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "Panitas",
    title: "Panitas – Gestiona tu negocio, vende online, organiza tus citas y escala",
    description:
      "SaaS venezolano todo-en-uno para gestionar tu negocio: tienda online, agenda de citas, CRM y control B2B.",
    url: baseUrl,
    images: [{ url: `${baseUrl}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panitas – Gestiona tu negocio, vende online, organiza tus citas y escala",
    description:
      "SaaS venezolano todo-en-uno para gestionar tu negocio: tienda online, agenda de citas, CRM y control B2B.",
    images: [`${baseUrl}/og-image.png`],
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
        <link rel="canonical" href={baseUrl} />
        <script dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TDP569Q9');`,
        }} />
        <OrganizationSchema />
        <SoftwareApplicationSchema />
        <WebSiteSchema />
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
