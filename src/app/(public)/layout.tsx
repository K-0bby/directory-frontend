import "../globals.css";
import {
  AppRootShell,
  siteMetadata,
} from "@/components/app-root-shell";

export const metadata = siteMetadata;

export default function PublicRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppRootShell includeClarity routeScope="public">
      {children}
    </AppRootShell>
  );
}
