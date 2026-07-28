"use client";

import { useAuth } from "@/context/auth-context";
import { normalizeRole, ROLE_HOME } from "@/lib/roles";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";

const VendorHome = dynamic(() => import("@/components/dashboard/home/vendor-home"));
const CustomerHome = dynamic(() => import("@/components/dashboard/home/customer-home"));
const AdminHome = dynamic(() => import("@/components/dashboard/home/admin-home"));

export default function DashboardHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const role = normalizeRole(user?.role ?? "customer");

  // Listing agents have no home — redirect to my-listing
  useEffect(() => {
    if (!loading && user && role === "listing_agent") {
      router.replace(ROLE_HOME[role]);
    }
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#93C01F]" />
      </div>
    );
  }

  if (role === "vendor") return <VendorHome />;
  if (role === "admin") return <AdminHome />;
  if (role === "customer") return <CustomerHome />;

  return null;
}
