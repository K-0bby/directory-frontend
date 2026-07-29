// components/app-sidebar.tsx
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRealtimeRole } from "@/hooks/useRealtimeRole";
import { useEffect, useState } from "react";
import useDashboardNavigation, {
  type MenuItem,
} from "@/hooks/useDashboardNavigation";
import { normalizeRole, ROLE_HOME, type UserRole } from "@/lib/roles";

interface AppSidebarProps {
  role: UserRole;
}

export function AppSidebar({ role: initialRole }: AppSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [showRoleNotification, setShowRoleNotification] = useState(false);

  const { items, isActive, handleCloseSidebar } = useDashboardNavigation();

  // Use the realtime role hook
  const { isRoleChanging } = useRealtimeRole({
    enableLogging: true,
    onRoleChange: (_oldRole, newRole) => {
      const normalizedNewRole = normalizeRole(newRole);
      setCurrentRole(normalizedNewRole);
      setShowRoleNotification(true);

      setTimeout(() => setShowRoleNotification(false), 3000);

      // Redirect to the new role's home page
      router.push(ROLE_HOME[normalizedNewRole]);
    },
  });

  // Update role if initial role changes
  useEffect(() => {
    setCurrentRole(initialRole);
  }, [initialRole]);

  if (!user) return null;

  // Renders either an SVG path (string icon) or a Phosphor icon component.
  const renderIcon = (icon: MenuItem["icon"], title: string) => {
    if (typeof icon === "string") {
      return (
        <Image
          src={icon}
          alt={title}
          width={20}
          height={20}
          className="w-5 h-5"
        />
      );
    }
    const IconComponent = icon;
    // !text-white beats the sidebar's built-in [&>svg]:text-sidebar-accent-foreground
    // rule (dark on our dark-blue sidebar), which otherwise wins on specificity.
    return <IconComponent weight="fill" className="w-5 h-5 text-white!" />;
  };

  const closeOnMobile = () => {
    if (window.innerWidth < 768) handleCloseSidebar();
  };

  return (
    <>
      {/* Role change notification */}
      {showRoleNotification && (
        <div className="fixed top-4 right-4 z-50 bg-[#93C01F] text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-top">
          <p className="text-sm font-medium">
            Role updated to {currentRole}
            {isRoleChanging && " ⚡"}
          </p>
        </div>
      )}

      <Sidebar
        variant="inset"
        collapsible="icon"
        className="bg-[#1C3C59] text-white h-screen"
      >
        <SidebarHeader className="bg-[#1C3C59] px-2 py-1 -mt-10">
          <div className="flex items-center justify-between w-full">
            <div className="shrink-0 group-data-[collapsible=icon]:hidden">
              <Link href="/">
                <Image
                  src="/images/logos/main-logo.PNG"
                  alt="MeFie Logo"
                  width={200}
                  height={100}
                  className="h-40 w-auto"
                />
              </Link>
            </div>

            <button
              onClick={handleCloseSidebar}
              className="md:hidden p-2 rounded-md hover:bg-white/10 text-white cursor-pointer transition-colors flex items-center justify-center"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent className="bg-[#1C3C59] -mt-12">
          <SidebarGroup className="bg-[#1C3C59]">
            <SidebarGroupContent className="bg-[#1C3C59]">
              <SidebarMenu className="pt-4 space-y-2">
                {items.map((item) =>
                  item.children && item.children.length > 0 ? (
                    // ─── Dropdown group (e.g. Support → FAQs) ───
                    <Collapsible
                      key={item.title}
                      defaultOpen={item.children.some((child) =>
                        isActive(child.url),
                      )}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="flex items-center gap-3 px-3 py-4 rounded-lg hover:bg-white/10 text-white transition-colors data-[state=open]:bg-white/5">
                            {renderIcon(item.icon, item.title)}
                            <span className="text-sm font-medium text-white">
                              {item.title}
                            </span>
                            <ChevronDown className="ml-auto w-4 h-4 text-white transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="border-white/10">
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild>
                                  <Link
                                    href={child.url ?? "#"}
                                    onClick={closeOnMobile}
                                    className={`flex items-center gap-3 px-3 py-4 rounded-lg text-white hover:bg-white/10 hover:text-white transition-colors ${
                                      isActive(child.url) ? "bg-[#93C01F]" : ""
                                    }`}
                                  >
                                    {renderIcon(child.icon, child.title)}
                                    <span className="text-sm font-medium text-white">
                                      {child.title}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    // ─── Single link item ───
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          href={item.url ?? "#"}
                          className={`flex items-center gap-3 px-3 py-4 rounded-lg hover:bg-white/10 text-white transition-colors ${
                            isActive(item.url) ? "bg-[#93C01F]" : ""
                          }`}
                          onClick={closeOnMobile}
                        >
                          {renderIcon(item.icon, item.title)}
                          <span className="text-sm font-medium text-white">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
