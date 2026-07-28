"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { normalizeRole, ROLE_BASE_PATH, type UserRole } from "@/lib/roles";
import { Newspaper, Icon, SquaresFourIcon, Files, BookmarkSimple, QuestionMarkIcon, LifebuoyIcon } from '@phosphor-icons/react';

export type { UserRole };

export interface MenuItem {
  title: string;
  // Parent (dropdown) items have no url of their own — only their children navigate.
  url?: string;
  icon: string | Icon;
  roles: UserRole[];
  children?: MenuItem[];
}

const MENU_CONFIG: MenuItem[] = [
  // ─── Home / Dashboard ───
  {
    title: "Home",
    url: "/dashboard",
    icon: "/images/icons/home.svg",
    roles: ["vendor"],
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: "/images/icons/home.svg",
    roles: ["admin"],
  },

  // ─── Listings ───
  {
    title: "My Listings",
    url: "/dashboard/my-listing",
    icon: "/images/icons/listings.svg",
    roles: ["vendor", "listing_agent"],
  },
  {
    title: "Listings",
    url: "/dashboard/listings",
    icon: "/images/icons/listings.svg",
    roles: ["admin"],
  },

  // ─── Users (Admin) ───
  {
    title: "Users",
    url: "/dashboard/users",
    icon: "/images/icons/users.svg",
    roles: ["admin"],
  },

  // ─── Claims (Admin) ───
  {
    title: "Claims",
    url: "/dashboard/claim",
    icon: Files,
    roles: ["admin"],
  },

  // ─── Categories (Admin) ───
  {
    title: "Categories",
    url: "/dashboard/categories",
    icon: SquaresFourIcon,
    roles: ["admin"],
  },

  // ─── Curated Collections (Admin) ───
  {
    title: "Collections",
    url: "/dashboard/collections",
    icon: BookmarkSimple,
    roles: ["admin"],
  },

  // ─── News Post (Admin) ───
  {
    title: "News Post",
    url: "/dashboard/news-post",
    icon: Newspaper,
    roles: ["admin"],
  },

  // ─── Support (Admin) ───
  {
    title: "Support",
    icon: LifebuoyIcon,
    roles: ["admin"],
    children: [
      {
        title: "FAQs",
        url: "/dashboard/faqs",
        icon: QuestionMarkIcon,
        roles: ["admin"],
      },
    ],
  },

  // ─── Inquiries ───
  {
    title: "Inquiries",
    url: "/dashboard/inquiries",
    icon: "/images/icons/chat.svg",
    roles: ["vendor"],
  },

  // ─── My Claims (Customer + Vendor) ───
  {
    title: "My Claims",
    url: "/dashboard/my-claims",
    icon: Files,
    roles: ["customer", "vendor"],
  },

  // ─── Bookmarks (Customer) ───
  {
    title: "Bookmarks",
    url: "/dashboard/bookmarks",
    icon: "/images/icons/bookmark.svg",
    roles: ["customer"],
  },

  // ─── My Events (Customer) ───
  {
    title: "My Events",
    url: "/dashboard/my-events",
    icon: "/images/icons/d-calendar.svg",
    roles: ["customer"],
  },

  // ─── Reviews ───
  {
    title: "Reviews",
    url: "/dashboard/reviews",
    icon: "/images/icons/review.svg",
    roles: ["customer", "admin", "vendor" ],
  },

  // ─── Monetization (Admin) ───
  {
    title: "Monetization",
    url: "/dashboard/monetization",
    icon: "/images/icons/money.svg",
    roles: ["admin"],
  },

  // ─── Analytics (Vendor) ───
  // {
  //   title: "Analytics",
  //   url: "/dashboard/analytics",
  //   icon: "/images/icons/home.svg",
  //   roles: ["vendor"],
  // },

  // ─── Settings ───
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: "/images/icons/setting.svg",
    roles: ["vendor", "customer"],
  },
];

export default function useDashboardNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = normalizeRole(user?.role ?? "customer");

  const isActive = (path?: string) => !!path && pathname === path;

  // Filter items by current role, then filter each dropdown's children by role
  // too, dropping any parent left with no reachable children. URLs are absolute.
  const items = MENU_CONFIG.filter((item) => item.roles.includes(role))
    .map((item) => {
      if (!item.children) return item;
      const children = item.children.filter((child) =>
        child.roles.includes(role),
      );
      return { ...item, children };
    })
    .filter(
      (item) => item.url || (item.children && item.children.length > 0),
    );

  const handleCloseSidebar = () => {
    const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]');
    if (sidebarTrigger) (sidebarTrigger as HTMLElement).click();

    document.querySelectorAll("button").forEach((button) => {
      if (
        button.getAttribute("data-state") === "open" ||
        button.getAttribute("aria-expanded") === "true"
      ) {
        button.click();
      }
    });

    const sidebar =
      document.querySelector('[data-sidebar="sidebar"]') ||
      document.querySelector(".sidebar") ||
      document.querySelector('[data-collapsible="icon"]');

    if (sidebar) {
      sidebar.setAttribute("data-state", "collapsed");
      sidebar.classList.add("collapsed");
    }
  };

  return {
    items,
    role,
    basePath: ROLE_BASE_PATH,
    isActive,
    handleCloseSidebar,
  };
}
