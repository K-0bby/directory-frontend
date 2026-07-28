// app/dashboard/layout.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Header from "@/components/dashboard/header";
import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { pusherService } from "@/lib/pusher";
import { ROLE_CHANGED_EVENT } from "@/hooks/useRealtimeRole";
import { normalizeRole } from "@/lib/roles";
import { Monitor, X } from "lucide-react";

function MobileDashboardBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth < 1024 &&
      !sessionStorage.getItem("dashboardMobileBannerDismissed")
    );
  });

  const dismiss = () => {
    sessionStorage.setItem("dashboardMobileBannerDismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm">
      <Monitor className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      <p className="flex-1 leading-snug">
        <span className="font-semibold">Better on desktop.</span> For the best
        dashboard experience, we recommend opening this on a PC or laptop.
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 text-amber-600 hover:text-amber-900 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refetchUser } = useAuth();
  const [sidebarKey, setSidebarKey] = useState(0);

  // Initialize Pusher when user is available
  useEffect(() => {
    if (user?.id && user?.email) {
      // Use email as user ID if that's what Laravel uses
      const userId = user.email; // or user.id if you have numeric ID

      pusherService.initialize(userId, (data) => {
        // Dispatch custom event for components to listen to
        window.dispatchEvent(
          new CustomEvent(ROLE_CHANGED_EVENT, {
            detail: {
              oldRole: data.old_role,
              newRole: data.new_role,
              userId: data.user_id,
            },
          }),
        );

        // Force sidebar remount
        setSidebarKey((prev) => prev + 1);

        // Refetch user data to ensure consistency
        refetchUser();
      });
    }

    // Cleanup on unmount
    return () => {
      pusherService.disconnect();
    };
  }, [user?.id, user?.email, refetchUser]);

  // Redirect to login if not authenticated, preserving the intended route.
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#93C01F] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRole = normalizeRole(user.role);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar key={sidebarKey} role={userRole} />

        <main className="flex-1 flex flex-col overflow-y-auto max-w-8xl w-full">
          <div className="shrink-0">
            <div className="flex items-center justify-between pt-4">
              <SidebarTrigger />
              <Header />
            </div>
            <div className="border-b border-gray-100 pt-2" />
            <MobileDashboardBanner />
          </div>
          <div className="flex-1 px-2 pb-2">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
