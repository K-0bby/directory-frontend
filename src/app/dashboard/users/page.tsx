/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Loader2,
  Play,
  Search,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string;
  phone?: string;
  listings_count: string;
  role: "vendor" | "customer" | "user" | "admin" | "listing_agent";
  plan?: "Basic" | "Premium" | "Pro" | "Enterprise";
  last_active: string;
  status: "Active" | "Pending" | "Suspended" | "Inactive";
  is_suspended?: boolean;
}

type TabType = "all" | "vendors" | "customers" | "admins" | "listing_agents";

export default function Users() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [allData, setAllData] = useState<User[]>([]);
  const [displayData, setDisplayData] = useState<User[]>([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspendForm, setSuspendForm] = useState({
    reason: "",
    duration: "1_day",
    custom_date: "",
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

  const getAuthToken = useCallback((): string | null => {
    return typeof window !== "undefined"
      ? localStorage.getItem("authToken")
      : null;
  }, []);

  // Helper to determine suspension state consistently across the app
  const isUserSuspended = useCallback((u: User) => {
    return (
      u.is_suspended || (u.status || "").toLowerCase().trim() === "suspended"
    );
  }, []);

  const extractUsersFromResponse = useCallback((data: any): User[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.users || data.data || data.results || [];
  }, []);

  const loadAllData = useCallback(async () => {
    if (authLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/all_users`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAllData(extractUsersFromResponse(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, API_URL, getAuthToken, extractUsersFromResponse]);

  useEffect(() => {
    if (!authLoading && authUser) loadAllData();
  }, [authUser, authLoading, loadAllData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setIsActionLoading(true);
    try {
      const token = getAuthToken();

      // Mapping internal UI role values to API endpoint suffixes
      const endpointSuffixMap: Record<string, string> = {
        admin: "make_admin",
        vendor: "make_vendor",
        user: "make_user",
        customer: "make_user", // Assuming customer and user share the same endpoint
        listing_agent: "make_listing_agent",
      };

      const suffix = endpointSuffixMap[newRole];
      if (!suffix) throw new Error("Invalid role selection");

      const res = await fetch(`${API_URL}/api/users/${userId}/${suffix}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update user role");
      }

      toast.success(`User role updated to ${newRole.replace("_", " ")}`);
      await loadAllData(); // Refresh the table
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSuspendSubmit = async () => {
    if (!selectedUser) return;
    if (!suspendForm.reason || suspendForm.reason.length > 500) {
      return toast.error(
        "Reason is required and must be under 500 characters.",
      );
    }

    setIsActionLoading(true);
    try {
      const token = getAuthToken();

      // Data format logic: duration is null if using custom_date
      const payload = {
        reason: suspendForm.reason,
        duration:
          suspendForm.duration === "custom" ? null : suspendForm.duration,
        custom_date:
          suspendForm.duration === "custom" ? suspendForm.custom_date : null,
      };

      const res = await fetch(
        `${API_URL}/api/users/${selectedUser.id}/suspend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Suspension failed");

      toast.success("User suspended successfully");
      setIsSuspendModalOpen(false);
      await loadAllData(); // Refresh list to update UI
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnsuspend = async (user: User) => {
    setIsActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/users/${user.id}/unsuspend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unsuspension failed");
      toast.success("User unsuspended successfully");
      await loadAllData(); // Refresh list to update UI
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    const filtered = allData.filter((u) => {
      const status = (u.status || "").toLowerCase().trim();
      const filterValue = statusFilter.toLowerCase().trim();
      const role = (u.role || "").toLowerCase();
      const suspended = isUserSuspended(u);

      // 1. Tab Logic
      if (activeTab === "vendors" && role !== "vendor") return false;
      if (activeTab === "customers" && !["customer", "user"].includes(role))
        return false;
      if (activeTab === "admins" && role !== "admin") return false;

      // 2. Status Logic (Crucial for filtering suspended users)
      if (filterValue !== "all") {
        if (filterValue === "suspended") {
          if (!suspended) return false;
        } else {
          // If we are filtering by Active/Pending, we must exclude suspended users
          if (suspended || status !== filterValue) return false;
        }
      }

      // 3. Plan Filter
      if (planFilter !== "all" && (u.plan || "").toLowerCase() !== planFilter)
        return false;

      // 4. Search Filter
      if (search) {
        const s = search.toLowerCase();
        return (
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.phone && u.phone.includes(s))
        );
      }
      return true;
    });

    const total = Math.ceil(filtered.length / itemsPerPage);
    setTotalPages(total || 1);
    const start = (currentPage - 1) * itemsPerPage;
    setDisplayData(filtered.slice(start, start + itemsPerPage));
  }, [
    allData,
    statusFilter,
    planFilter,
    search,
    currentPage,
    activeTab,
    isUserSuspended,
  ]);

  useEffect(
    () => setCurrentPage(1),
    [statusFilter, planFilter, search, activeTab],
  );

  // --- Pagination Helpers ---
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 4;
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4);
      else if (currentPage >= totalPages - 2)
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else
        pages.push(
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2,
        );
    }
    return pages;
  };

  const { startItem, endItem } = (() => {
    const s = (currentPage - 1) * itemsPerPage + 1;
    const e = s + displayData.length - 1;
    return { startItem: s, endItem: e > 0 ? e : 0 };
  })();

  return (
    <div className="p-2 lg:p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Users</h1>

      <div className="flex gap-6 border-b">
        {(["all", "vendors", "customers", "admins"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative capitalize ${
              activeTab === tab
                ? "text-[#93C01F]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#93C01F]" />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-9 shadow-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] shadow-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            {activeTab === "vendors" && (
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[130px] shadow-none">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-200 hover:bg-gray-200">
                <TableHead className="font-semibold text-black">Name</TableHead>
                <TableHead className="font-semibold text-black">
                  Phone
                </TableHead>
                {activeTab === "vendors" && (
                  <TableHead className="font-semibold text-black">
                    Plan
                  </TableHead>
                )}
                <TableHead className="font-semibold text-black">
                  Last Active
                </TableHead>
                <TableHead className="font-semibold text-black">Role</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : displayData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-gray-500 font-medium"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((u) => {
                  const suspended = isUserSuspended(u);
                  return (
                    <TableRow key={u.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <Image
                              src={u.avatar}
                              width={40}
                              height={40}
                              alt="Avatar"
                              className="rounded-full h-10 w-10 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {u.phone || "N/A"}
                      </TableCell>
                      {activeTab === "vendors" && (
                        <TableCell>
                          <Badge className="bg-[#548235] hover:bg-[#548235] text-white font-normal">
                            {u.plan || "Free"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-gray-600">
                        {u.last_active
                          ? formatDistanceToNow(new Date(u.last_active), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {suspended ? (
                          <Badge className="bg-red-500 hover:bg-red-500 text-white font-normal">
                            Suspended
                          </Badge>
                        ) : (
                          <Select
                            disabled={isActionLoading}
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.id, val)}
                          >
                            <SelectTrigger className="w-[100px] h-8 text-xs shadow-none border-gray-300 focus:ring-0 rounded-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="listing_agent">
                                Listing Agent
                              </SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/dashboard/users/${u.id}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Profile
                            </DropdownMenuItem>
                            {suspended ? (
                              <DropdownMenuItem
                                className="text-green-600 focus:text-green-600 font-medium"
                                onClick={() => handleUnsuspend(u)}
                              >
                                <Play className="mr-2 h-4 w-4" /> Unsuspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-yellow-600 focus:text-yellow-600 font-medium"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setIsSuspendModalOpen(true);
                                }}
                              >
                                <Pause className="mr-2 h-4 w-4" /> Suspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" /> Message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!isLoading && displayData.length > 0 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">
                {startItem}-{endItem}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 rounded-full border"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex gap-1">
                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 w-9 rounded-full ${
                      currentPage === page
                        ? "bg-[#93C01F] text-white hover:bg-[#93C01F]/90"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="h-9 w-9 rounded-full border"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Provide a reason and duration for this account suspension.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Reason (Max 500 chars)
              </Label>
              <Input
                placeholder="Reason for suspension"
                maxLength={500}
                value={suspendForm.reason}
                onChange={(e) =>
                  setSuspendForm({ ...suspendForm, reason: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Duration</Label>
              <Select
                value={suspendForm.duration}
                onValueChange={(val) =>
                  setSuspendForm({ ...suspendForm, duration: val })
                }
              >
                <SelectTrigger className="shadow-none">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_day">1 Day</SelectItem>
                  <SelectItem value="7_days">7 Days</SelectItem>
                  <SelectItem value="30_days">30 Days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {suspendForm.duration === "custom" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Custom End Date</Label>
                <Input
                  type="date"
                  value={suspendForm.custom_date}
                  onChange={(e) =>
                    setSuspendForm({
                      ...suspendForm,
                      custom_date: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsSuspendModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuspendSubmit}
              disabled={isActionLoading}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirm Suspension"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
