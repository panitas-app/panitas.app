import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panitas - Monta tu tienda en línea en minutos",
  description:
    "Sin complicaciones técnicas, adaptado a los métodos de pago en Venezuela y diseñado para hacer crecer tu negocio entre panas.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
  appleWebApp: { capable: true, title: "Panitas", statusBarStyle: "black-translucent" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="es"
        className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}
        suppressHydrationWarning
      >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col font-body">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
        <CookieConsentBanner />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
