"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// --- Interfaces ---

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  link?: string;
}

interface RawNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  created_at: string;
  read_at: string | null;
}

// Helper type to handle the missing property without changing global context
interface UserWithPlan {
  name: string;
  email: string;
  image?: string;
  role: string;
  subscription_plan?: string; // Explicitly add the missing property here
}

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

 

  // Cast user to the extended interface to access 'subscription_plan'
  const currentUser = user as unknown as UserWithPlan;

  // Now we can safely access subscription_plan without TS errors
  const isPremium =
    currentUser?.subscription_plan === "Premium" ||
    currentUser?.subscription_plan === "Pro";

  // --- Role Check Logic ---
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isVendor = currentUser?.role?.toLowerCase() === "vendor"; // Assuming 'vendor' is the role string
  const isListingAgent =
    currentUser?.role?.toLowerCase() === "listing_agent";

  // --- State ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // --- Helpers ---

  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("authToken");
    }
    return null;
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
  };

  const getDashboardUrl = () => {
    if (!user) return "/auth/login";
    return "/dashboard/settings";
  };

  // --- API Actions ---

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/notifications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to load notifications");

      const json = await response.json();
      const rawData: RawNotification[] = json.data || json;

      const mappedData: Notification[] = rawData.map((item) => ({
        id: item.id,
        title: item.title || "New Notification",
        message: item.message || "",
        time: formatNotificationTime(item.created_at),
        isRead: !!item.read_at,
        link: item.link || "",
      }));

      setNotifications(mappedData);
    } catch (error) {
      console.error("Notification Error:", error);
    }
  }, [currentUser]); // Dependency updated

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const token = getAuthToken();
      await fetch(`/api/notifications/mark-all-read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to mark all as read", error);
      fetchNotifications();
    }
  };

  const handleViewInquiry = async (id: string, link?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );

    try {
      const token = getAuthToken();
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (link) {
        router.push(link);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleViewAll = () => {
    router.push("/dashboard/notifications");
  };

   const settingsBaseUrl = "/dashboard/settings";

  return (
    <div className="flex items-center justify-end px-4 lg:px-10 py-1">
      {currentUser && (
        <div className="flex items-center gap-4">
          {/* Plan Badge */}
          {/* <div>
            {isPremium ? (
              <Badge className="bg-[#FACC15] text-white px-2 py-2 shadow-sm gap-1 hover:bg-[#FACC15]/90">
                <Image
                  src="/images/icons/diamond.svg"
                  alt="diamond"
                  width={16}
                  height={16}
                />
                Premium
              </Badge>
            ) : (
              <Badge className="bg-[#419E6A] text-white px-2 py-2 shadow-sm gap-1 hover:bg-[#419E6A]/90">
                <Image
                  src="/images/icons/bulb.svg"
                  alt="bulb"
                  width={16}
                  height={16}
                />
                Basic
              </Badge>
            )}
          </div> */}

          {/* Notifications Dropdown */}
          <div className="flex items-center rounded-full bg-[#E9F0F6] p-2 cursor-pointer relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <Bell className="h-5 w-5 text-gray-900" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="rounded-lg mt-2 w-80 p-0 shadow-lg border border-gray-100"
                align="end"
              >
                <div className="flex flex-row items-center justify-between px-4 py-3 bg-white rounded-t-lg">
                  <DropdownMenuLabel className="text-lg font-semibold p-0">
                    Notifications
                  </DropdownMenuLabel>
                  <Button
                    variant="link"
                    className="text-[#93C01F] text-xs p-0 h-auto font-normal hover:no-underline"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all as read
                  </Button>
                </div>

                <Separator />

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        className={`flex items-start gap-3 px-4 py-3 cursor-default border-b border-gray-50 last:border-0 focus:bg-gray-50 ${
                          !item.isRead ? "bg-blue-50/50" : "bg-white"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#1e293b] flex items-center justify-center shrink-0 mt-1">
                          <Bell className="w-5 h-5 text-[#93C01F]" />
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-gray-900 leading-none">
                              {item.title}
                            </p>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-snug line-clamp-2">
                            {item.message}
                          </p>
                          <button
                            className="text-xs text-[#93C01F] hover:underline font-medium mt-1 cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewInquiry(item.id, item.link);
                            }}
                          >
                            View update
                          </button>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        No new notifications
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        You&apos;re all caught up! Check back later.
                      </p>
                    </div>
                  )}
                </div>

                <Separator />
                <div className="bg-[#F8FAFC] text-center w-full py-2 rounded-b-lg">
                  <Button
                    variant="link"
                    className="text-gray-600 text-sm font-normal hover:no-underline h-auto p-0"
                    onClick={handleViewAll}
                  >
                    View all notifications
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer">
                <Avatar className="w-10 h-10 border border-gray-200">
                  <AvatarImage
                    src={currentUser.image}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                    {currentUser.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-semibold text-gray-900">
                    {currentUser.name}
                  </span>
                  {/* <Badge className="text-[10px] bg-[#FF8D2826] text-[#FF8D28] px-2 py-0 mt-1 hover:bg-[#FF8D2826]">
                    {currentUser.role}
                  </Badge> */}
                  <div>
                    {isAdmin ? (
                      <Badge className="text-[10px] bg-[#FF8D2826] text-[#FF8D28] px-2 py-0 mt-1 hover:bg-[#FF8D2826]">
                        Admin
                      </Badge>
                    ) : isVendor ? (
                      isPremium ? (
                        <Badge className="bg-[#FACC15] text-white text-[10px] px-2 py-0.5 mt-1 gap-1 hover:bg-[#FACC15]/90">
                          <Image
                            src="/images/icons/diamond.svg"
                            alt="diamond"
                            width={10}
                            height={10}
                          />
                          Premium
                        </Badge>
                      ) : (
                        <Badge className="bg-[#419E6A] text-white text-[10px] px-2 py-0.5 mt-1 gap-1 hover:bg-[#419E6A]/90">
                          <Image
                            src="/images/icons/bulb.svg"
                            alt="bulb"
                            width={10}
                            height={10}
                          />
                          Basic
                        </Badge>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="rounded-lg mt-2 w-60 p-2"
              align="end"
            >
              <div className="flex items-center gap-3 p-2 mb-2 bg-gray-50 rounded-md">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={currentUser.image} />
                  <AvatarFallback>{currentUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
                    {currentUser.email || "user@example.com"}
                  </span>
                </div>
              </div>

              <Separator className="mb-2" />

              <DropdownMenuItem asChild>
                <Link
                  href={getDashboardUrl()}
                  className="flex items-center gap-2 cursor-pointer py-2.5"
                >
                  <Image
                    src="/images/icons/profile.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="opacity-70"
                  />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              {!isListingAgent && (
                <DropdownMenuItem asChild>
                  <Link
                    href={`${settingsBaseUrl}?tab=billing`}
                    className="flex items-center gap-2 cursor-pointer py-2.5"
                  >
                    <Image
                      src="/images/icons/billing.svg"
                      alt=""
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                    Billing & Subscriptions
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link
                  href="/help"
                  className="flex items-center gap-2 cursor-pointer py-2.5"
                >
                  <Image
                    src="/images/icons/help.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="opacity-70"
                  />
                  Help/Support
                </Link>
              </DropdownMenuItem>

              <Separator className="my-2" />

              <DropdownMenuItem
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer py-2.5"
                onClick={logout}
              >
                <Image
                  src="/images/icons/logout.svg"
                  alt=""
                  width={16}
                  height={16}
                />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
