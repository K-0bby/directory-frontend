import "../globals.css";
import {
  AppRootShell,
  siteMetadata,
} from "@/components/app-root-shell";

export const metadata = siteMetadata;

export default function PrivateRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppRootShell includeClarity={false} routeScope="private">
      {children}
    </AppRootShell>
  );
}
