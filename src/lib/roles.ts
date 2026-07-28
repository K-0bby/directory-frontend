export type UserRole = "vendor" | "customer" | "admin" | "listing_agent";

// All roles share the same /dashboard base — routing is flat, role guard handles access
export const ROLE_BASE_PATH = "/dashboard";

// Default landing page per role (used for redirects after login, role change, etc.)
export const ROLE_HOME: Record<UserRole, string> = {
  vendor: "/dashboard",
  listing_agent: "/dashboard/my-listing",
  admin: "/dashboard",
  customer: "/dashboard",
} as const;

export function normalizeRole(role: string): UserRole {
  const r = role.toLowerCase();
  if (r === "vendor" || r === "seller" || r === "business") return "vendor";
  if (r === "admin" || r === "administrator" || r === "superadmin") return "admin";
  if (r === "listing_agent" || r === "agent") return "listing_agent";
  return "customer";
}
