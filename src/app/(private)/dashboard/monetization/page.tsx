"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Filter,
  Search,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Inbox,
  Bookmark,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit2,
  PauseCircle,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import StatCards from "@/components/dashboard/stat-cards";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// --- INTERFACES (Frontend) ---

interface SubscriptionSummary {
  plan: string;
  vendors: number;
  revenue: number;
  color: string;
}

interface VendorPayment {
  id: string;
  vendor: {
    name: string;
    email: string;
    avatar: string;
  };
  phone: string;
  plan: "Basic" | "Premium" | "Pro";
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Failed";
}

interface Slot {
  id: string;
  type: string;
  location: string;
  price: string;
  activeSlots: string;
}

interface FeaturedListing {
  id: string;
  vendor: {
    name: string;
    email: string;
    avatar: string;
  };
  listingName: string;
  slotType: string;
  duration: string;
  amount: number;
  status: "Active" | "Pending";
}

// --- API RESPONSE INTERFACES (Raw) ---

interface ApiSubscription {
  plan_name: string;
  vendors_count: number;
  total_revenue: number;
}

interface ApiPayment {
  id: number | string;
  user: { name: string; email: string; avatar?: string };
  phone_number: string;
  plan_name: string;
  amount: number;
  created_at_human: string;
  status: string;
}

interface ApiSlot {
  id: number | string;
  name: string;
  location: string;
  price: string;
  active_count: number;
  total_count: number;
}

interface ApiFeaturedListing {
  id: number | string;
  user: { name: string; email: string; avatar?: string };
  listing_name: string;
  slot_name: string;
  duration_text: string;
  amount: number;
  status: string;
}

interface MonetizationApiResponse {
  subscriptions: ApiSubscription[];
  payments: ApiPayment[];
  slots: ApiSlot[];
  featured_listings: ApiFeaturedListing[];
  stats: {
    total_revenue: number;
    revenue_month: number;
    active_subs: number;
    trends: { revenue: number; month_revenue: number; active_subs: number };
  };
}

export default function Monetization() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "subscription" | "featuredListings"
  >("subscription");

  // --- Data State ---
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [featuredListings, setFeaturedListings] = useState<FeaturedListing[]>(
    []
  );
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueMonth: 0,
    activeSubs: 0,
    trends: { revenue: 0, month_revenue: 0, active_subs: 0 },
  });

  const [isLoading, setIsLoading] = useState(true);

  // --- Dialog State ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // --- Filter State ---
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [paymentPlanFilter, setPaymentPlanFilter] = useState("All");
  const [listingSearch, setListingSearch] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState("All");

  // --- Helper: Auth Token ---
  const getAuthToken = useCallback(() => {
    if (typeof window !== "undefined") return localStorage.getItem("authToken");
    return null;
  }, []);

  // --- Helper: Data Mappers ---
  const mapData = (data: MonetizationApiResponse) => {
    // 1. Stats
    setStats({
      totalRevenue: data.stats?.total_revenue || 0,
      revenueMonth: data.stats?.revenue_month || 0,
      activeSubs: data.stats?.active_subs || 0,
      trends: data.stats?.trends || {
        revenue: 0,
        month_revenue: 0,
        active_subs: 0,
      },
    });

    // 2. Subscriptions
    const planColors: Record<string, string> = {
      Basic: "bg-[#548235]",
      Premium: "bg-[#F2C94C]",
      Pro: "bg-[#5ea0d6]",
    };
    setSubscriptions(
      (data.subscriptions || []).map((sub) => ({
        plan: sub.plan_name,
        vendors: sub.vendors_count,
        revenue: sub.total_revenue,
        color: planColors[sub.plan_name] || "bg-gray-400",
      }))
    );

    // 3. Payments
    setPayments(
      (data.payments || []).map((p) => ({
        id: p.id.toString(),
        vendor: {
          name: p.user?.name || "Unknown",
          email: p.user?.email || "",
          avatar: p.user?.avatar || "",
        },
        phone: p.phone_number,
        plan: (p.plan_name as "Basic" | "Premium" | "Pro") || "Basic",
        amount: p.amount,
        date: p.created_at_human,
        status: (p.status as "Paid" | "Pending" | "Failed") || "Pending",
      }))
    );

    // 4. Slots
    setSlots(
      (data.slots || []).map((s) => ({
        id: s.id.toString(),
        type: s.name,
        location: s.location,
        price: s.price,
        activeSlots: `${s.active_count}/${s.total_count}`,
      }))
    );

    // 5. Featured Listings
    setFeaturedListings(
      (data.featured_listings || []).map((f) => ({
        id: f.id.toString(),
        vendor: {
          name: f.user?.name || "Unknown",
          email: f.user?.email || "",
          avatar: f.user?.avatar || "",
        },
        listingName: f.listing_name,
        slotType: f.slot_name,
        duration: f.duration_text,
        amount: f.amount,
        status: (f.status as "Active" | "Pending") || "Pending",
      }))
    );
  };

  // --- API Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!authUser) return;

      setIsLoading(true);
      try {
        const token = getAuthToken();
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

        const response = await fetch(`${API_URL}/api/admin/monetization`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to load data");

        const json = await response.json();
        const apiData = (json.data || json) as MonetizationApiResponse;
        mapData(apiData);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load monetization data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authUser, authLoading, getAuthToken]);

  // --- Derived State (Filtering) ---

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        p.vendor.name.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.vendor.email.toLowerCase().includes(paymentSearch.toLowerCase());
      const matchesStatus =
        paymentStatusFilter === "All" || p.status === paymentStatusFilter;
      const matchesPlan =
        paymentPlanFilter === "All" || p.plan === paymentPlanFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [payments, paymentSearch, paymentStatusFilter, paymentPlanFilter]);

  const filteredListings = useMemo(() => {
    return featuredListings.filter((l) => {
      const matchesSearch =
        l.vendor.name.toLowerCase().includes(listingSearch.toLowerCase()) ||
        l.listingName.toLowerCase().includes(listingSearch.toLowerCase());
      const matchesStatus =
        listingStatusFilter === "All" || l.status === listingStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [featuredListings, listingSearch, listingStatusFilter]);

  // --- Handlers ---
  const handleEditClick = (slot: Slot) => {
    setSelectedSlot(slot);
    setIsEditOpen(true);
  };

  const handlePauseClick = (slot: Slot) => {
    setSelectedSlot(slot);
    setIsPauseOpen(true);
  };

  // Helper Components
  const StatusBadge = ({
    status,
    planColor,
  }: {
    status?: string;
    planColor?: string;
  }) => {
    if (planColor) {
      return (
        <span
          className={`${planColor} text-white px-3 py-1 rounded-full text-xs font-medium`}
        >
          {status}
        </span>
      );
    }
    const styles = {
      Paid: "bg-[#548235] text-white",
      Active: "bg-[#548235] text-white",
      Pending: "bg-[#F2C94C] text-white",
      Failed: "bg-[#EB5757] text-white",
    };
    const icons = {
      Paid: <CheckCircle className="w-3 h-3 mr-1" />,
      Active: <CheckCircle className="w-3 h-3 mr-1" />,
      Pending: <Clock className="w-3 h-3 mr-1" />,
      Failed: <AlertCircle className="w-3 h-3 mr-1" />,
    };
    const key = (status || "Pending") as keyof typeof styles;
    return (
      <span
        className={`flex items-center w-fit px-2.5 py-1 rounded-md text-xs font-medium ${styles[key]}`}
      >
        {icons[key]}
        {status}
      </span>
    );
  };

  if (authLoading || isLoading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading monetization data...
      </div>
    );

  return (
    <div className="p-2 lg:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Monetization</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage platform revenue streams, vendor subscriptions, and
          transactions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("subscription")}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "subscription"
              ? "text-[#93C01F]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Subscription
          {activeTab === "subscription" && (
            <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#93C01F]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("featuredListings")}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "featuredListings"
              ? "text-[#93C01F]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Featured Listings
          {activeTab === "featuredListings" && (
            <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#93C01F]" />
          )}
        </button>
      </div>

      {/* === TAB: SUBSCRIPTION === */}
      {activeTab === "subscription" && (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Stats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCards
                title="Total Revenue"
                icon={DollarSign}
                statValue={stats.totalRevenue} // Passed as number
                trend={stats.trends.revenue}
                trendIconUp={TrendingUp}
                trendIconDown={TrendingDown}
              />
              <StatCards
                title="Revenue This Month"
                icon={Inbox}
                statValue={stats.revenueMonth} // Passed as number
                trend={stats.trends.month_revenue}
                trendIconUp={TrendingUp}
                trendIconDown={TrendingDown}
              />
              <StatCards
                title="Active Subscriptions"
                icon={Bookmark}
                statValue={stats.activeSubs} // Passed as number
                trend={stats.trends.active_subs}
                trendIconUp={TrendingUp}
                trendIconDown={TrendingDown}
              />
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Subscriptions</h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-200">
                  <TableRow>
                    <TableHead className="py-4">Plan</TableHead>
                    <TableHead>Vendors</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.plan}>
                      <TableCell className="py-5">
                        <StatusBadge status={sub.plan} planColor={sub.color} />
                      </TableCell>
                      <TableCell className="py-5">{sub.vendors}</TableCell>
                      <TableCell className="py-5">${sub.revenue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Vendor Payments */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Vendor Payments</h3>

            {/* Filter Bar */}
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search"
                  className="pl-9 bg-white"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-white min-w-[100px] justify-between"
                  >
                    {paymentStatusFilter === "All"
                      ? "Status"
                      : paymentStatusFilter}{" "}
                    <Filter className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setPaymentStatusFilter("All")}
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentStatusFilter("Paid")}
                  >
                    Paid
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentStatusFilter("Pending")}
                  >
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentStatusFilter("Failed")}
                  >
                    Failed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Plan Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-white min-w-[100px] justify-between"
                  >
                    {paymentPlanFilter === "All" ? "Plan" : paymentPlanFilter}{" "}
                    <Filter className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPaymentPlanFilter("All")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentPlanFilter("Basic")}
                  >
                    Basic
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPaymentPlanFilter("Premium")}
                  >
                    Premium
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPaymentPlanFilter("Pro")}>
                    Pro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-200">
                  <TableRow>
                    <TableHead className="py-4">Vendor Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((pay) => (
                      <TableRow key={pay.id}>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={pay.vendor.avatar} />
                              <AvatarFallback>
                                {pay.vendor.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {pay.vendor.name}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {pay.vendor.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 py-5">
                          {pay.phone}
                        </TableCell>
                        <TableCell className="py-5">
                          <StatusBadge
                            status={pay.plan}
                            planColor={
                              pay.plan === "Basic"
                                ? "bg-[#548235]"
                                : pay.plan === "Premium"
                                ? "bg-[#F2C94C]"
                                : "bg-[#5ea0d6]"
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 py-5">
                          ${pay.amount}
                        </TableCell>
                        <TableCell className="text-gray-600 py-5">
                          {pay.date}
                        </TableCell>
                        <TableCell className="py-5">
                          <StatusBadge status={pay.status} />
                        </TableCell>
                        <TableCell className="py-5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-gray-600"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>
                                Download Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No payments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* === TAB: FEATURED LISTINGS === */}
      {activeTab === "featuredListings" && (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Stats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCards
                title="Total Revenue"
                icon={DollarSign}
                statValue={stats.totalRevenue}
                trend={stats.trends.revenue}
                trendIconUp={TrendingUp}
                trendIconDown={TrendingDown}
              />
              <StatCards
                title="Revenue This Month"
                icon={Inbox}
                statValue={stats.revenueMonth}
                trend={stats.trends.month_revenue}
                trendIconUp={TrendingUp}
                trendIconDown={TrendingDown}
              />
              <StatCards
                title="Active Subscriptions"
                icon={Bookmark}
                statValue={stats.activeSubs}
                trend={stats.trends.active_subs}
                trendIconUp={TrendingUp}
                trendIconDown={TrendingDown}
              />
            </div>
          </div>
          {/* Slot Management Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Slot Management
              </h3>
              <Button
                className="bg-[#93C01F] hover:bg-[#7da815]"
                onClick={() => setIsCreateOpen(true)}
              >
                Create slot rule
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-200">
                  <TableRow>
                    <TableHead className="py-4">Slot Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Active Slots</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="py-5 font-medium text-gray-700 bg-gray-50/30">
                        {slot.type}
                      </TableCell>
                      <TableCell className="py-5 text-gray-600">
                        {slot.location}
                      </TableCell>
                      <TableCell className="py-5 font-medium text-gray-900">
                        {slot.price}
                      </TableCell>
                      <TableCell className="py-5 text-gray-600">
                        {slot.activeSlots}
                      </TableCell>
                      <TableCell className="py-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-gray-600"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleEditClick(slot)}
                            >
                              <Edit2 className="w-4 h-4 mr-2" /> Edit slot
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handlePauseClick(slot)}
                            >
                              <PauseCircle className="w-4 h-4 mr-2" /> Pause
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Featured Listings Table */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              Featured Listings
            </h3>

            {/* Filter Bar */}
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search"
                  className="pl-9 bg-white"
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-white min-w-[100px] justify-between"
                  >
                    {listingStatusFilter === "All"
                      ? "Status"
                      : listingStatusFilter}{" "}
                    <ChevronLeft className="w-3 h-3 text-gray-400 -rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setListingStatusFilter("All")}
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setListingStatusFilter("Active")}
                  >
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setListingStatusFilter("Pending")}
                  >
                    Pending
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-none overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-200">
                  <TableRow>
                    <TableHead className="py-4">Vendor Name</TableHead>
                    <TableHead>Listing Name</TableHead>
                    <TableHead>Slot Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.length > 0 ? (
                    filteredListings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={listing.vendor.avatar} />
                              <AvatarFallback>
                                {listing.vendor.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {listing.vendor.name}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {listing.vendor.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 text-gray-600">
                          {listing.listingName}
                        </TableCell>
                        <TableCell className="py-5 text-gray-600">
                          {listing.slotType}
                        </TableCell>
                        <TableCell className="py-5 text-gray-600">
                          {listing.duration}
                        </TableCell>
                        <TableCell className="py-5 font-medium text-gray-900">
                          ${listing.amount}
                        </TableCell>
                        <TableCell className="py-5">
                          <StatusBadge status={listing.status} />
                        </TableCell>
                        <TableCell className="py-5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-gray-600"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit Listing</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No listings found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* === DIALOGS === */}
      {/* 1. Create Slot Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Creating a slot
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Slot name
              </label>
              <Input id="name" placeholder="Slot name" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Placement location
              </label>
              <Select>
                <SelectTrigger className="w-full text-gray-400">
                  <SelectValue placeholder="Select placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Homepage</SelectItem>
                  <SelectItem value="events">Events Page</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Pricing
                </label>
                <Input placeholder="Price" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Billing Model
                </label>
                <Select>
                  <SelectTrigger className="w-full text-gray-400">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Duration
              </label>
              <Select>
                <SelectTrigger className="w-full text-gray-400">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1week">1 Week</SelectItem>
                  <SelectItem value="2weeks">2 Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Slot name
              </label>
              <Input id="slot_name_confirm" placeholder="Slot name" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setIsCreateOpen(false)}
              className="bg-[#93C01F] hover:bg-[#7da815]"
            >
              Create Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Slot Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Slot</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Slot name
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue
                    placeholder={selectedSlot?.type || "Slot name"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Option 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Placement location
              </label>
              <Select>
                <SelectTrigger className="w-full text-gray-400">
                  <SelectValue placeholder="Select placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Homepage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Pricing
                </label>
                <Input placeholder="Price" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Billing Model
                </label>
                <Select>
                  <SelectTrigger className="w-full text-gray-400">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Duration
              </label>
              <Select>
                <SelectTrigger className="w-full text-gray-400">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1week">1 Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                Slot name
              </label>
              <Input placeholder="Slot name" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setIsEditOpen(false)}
              className="bg-[#93C01F] hover:bg-[#7da815]"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Pause Slot Dialog */}
      <Dialog open={isPauseOpen} onOpenChange={setIsPauseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Pause Slot</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-500 text-sm leading-relaxed">
              Pausing this slot will prevent new purchases. Existing ads will
              continue to run until they expire. Do you want to continue?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsPauseOpen(false)}
              className="border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setIsPauseOpen(false)}
              className="bg-[#93C01F] hover:bg-[#7da815]"
            >
              Confirm pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
