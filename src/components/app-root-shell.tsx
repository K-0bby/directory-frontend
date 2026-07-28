import type { Metadata } from "next";
import localFont from "next/font/local";
import LayoutWrapper from "@/components/layout-wrapper";
import { ProductionAnalytics } from "@/components/analytics/production-analytics";
import { CookieConsent } from "@/components/ui/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import { WhatsAppFloater } from "@/components/whatsapp-floater";
import { AuthProvider } from "@/context/auth-context";
import { BookmarkProvider } from "@/context/bookmark-context";
import { getProductionAnalyticsConfig } from "@/lib/analytics/config";

const gilroy = localFont({
  src: [
    {
      path: "../../public/fonts/Gilroy/Gilroy-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/Gilroy/Gilroy-ExtraBold.otf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-gilroy",
  display: "swap",
});

export const siteMetadata: Metadata = {
  metadataBase: new URL("https://www.mefiedirectory.com"),
  title: {
    template: "%s | Me-fie Directory",
    default: "Me-fie Directory",
  },
  description:
    "Mefie Directory | Discover Ghanaian Businesses, Events & Services Worldwide Discover trusted Ghanaian businesses, cultural events, communities, and services across the diaspora and beyond. Connect, promote, and grow with Mefie Directory.",
  keywords: [
    "Me-fie Directory",
    "African owned businesses",
    "Cultural events",
    "Services",
    "Diaspora",
    "Back home",
  ],
  authors: [{ name: "Me-fie" }],
  creator: "Me-fie",
  publisher: "Me-fie",
  icons: {
    icon: [
      {
        url: "/images/logos/logo-light.png",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/logos/main-logo.PNG",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: [
      {
        url: "/images/logos/logo-light.png",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/logos/main-logo.PNG",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [
      {
        url: "/images/logos/logo-light.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/logos/main-logo.PNG",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.mefiedirectory.com",
    siteName: "Me-fie Directory",
    title: "Me-fie Directory",
    description:
      "Mefie Directory | Discover Ghanaian Businesses, Events & Services Worldwide Discover trusted Ghanaian businesses, cultural events, communities, and services across the diaspora and beyond. Connect, promote, and grow with Mefie Directory.",
    images: [
      {
        url: "https://www.mefiedirectory.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Me-fie Directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Me-fie",
    description:
      "Mefie Directory | Discover Ghanaian Businesses, Events & Services Worldwide Discover trusted Ghanaian businesses, cultural events, communities, and services across the diaspora and beyond. Connect, promote, and grow with Mefie Directory.",
    images: ["https://www.mefiedirectory.com/og-image.jpg"],
    creator: "@mefie",
  },
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://www.mefiedirectory.com",
  },
};

interface AppRootShellProps {
  children: React.ReactNode;
  includeClarity: boolean;
  routeScope: "public" | "private";
}

export function AppRootShell({
  children,
  includeClarity,
  routeScope,
}: AppRootShellProps) {
  const analytics = getProductionAnalyticsConfig(includeClarity);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${gilroy.variable} antialiased`}>
        {analytics ? (
          <ProductionAnalytics
            allowedHosts={analytics.allowedHosts}
            clarityProjectId={analytics.clarityProjectId}
            gaMeasurementId={analytics.gaMeasurementId}
            routeScope={routeScope}
          />
        ) : null}
        <AuthProvider>
          <BookmarkProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
            <CookieConsent />
            <WhatsAppFloater />
            <Toaster
              closeButton
              visibleToasts={3}
              duration={4000}
              position="top-center"
              toastOptions={{
                classNames: {
                  toast: "!rounded-xl !shadow-lg !text-sm !font-medium !gap-2",
                  title: "!font-semibold",
                  description: "!text-xs !opacity-80",
                  closeButton: "!rounded-lg",
                },
              }}
            />
          </BookmarkProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
