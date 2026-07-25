// context/auth-context.tsx
"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { installSessionExpiryInterceptor } from "@/lib/session";

interface User {
  id: string;
  phone: string;
  last_name: string;
  first_name: string;
  email: string;
  name: string;
  role: string;
  image?: string;
  avatar?: string;
  profile_photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isUnverified: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);

  const fetchUserProfile = async (token: string) => {
    setLoading(true);
    setIsUnverified(false); // Reset unverified state

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      const res = await fetch(`${API_URL}/api/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        // Unauthorized - clear everything
        localStorage.removeItem("authToken");
        setUser(null);
        setIsAuthenticated(false);
        setIsUnverified(false);
        setLoading(false);
        return;
      }

      if (res.status === 403) {
        // Forbidden - likely unverified email
        setIsAuthenticated(false);
        setIsUnverified(true);
        setUser(null);
        setLoading(false);
        return; // Keep the token, don't clear it
      }

      if (res.ok) {
        const userData = await res.json();

        // Handle different backend response structures
        const raw = userData?.user ?? userData?.data ?? userData;

        const mappedUser: User = {
          id: raw?.id || "",
          name: raw?.name || raw?.username || `${raw?.first_name ?? ""} ${raw?.last_name ?? ""}`.trim() || raw?.email?.split("@")[0] || "User",
          role: raw?.role || raw?.user_type || "User",
          image: raw?.image || raw?.avatar || raw?.profile_picture || undefined,
          email: raw?.email || "",
          last_name: raw?.last_name || "",
          first_name: raw?.first_name || "",
          phone: raw?.phone || "",
        };

        setUser(mappedUser);
        setIsAuthenticated(true);
        setIsUnverified(false);

        // Store user role in localStorage for immediate access after login
        localStorage.setItem("userRole", mappedUser.role);
      } else {
        // Don't clear the token on an unexpected status — only 401 above means
        // the token is definitely invalid; other statuses may be transient.
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      await fetchUserProfile(token);
    }
  };

  // Install once: redirects to login on any authenticated request's 401,
  // so individual fetch call sites don't each need their own check.
  useEffect(() => {
    installSessionExpiryInterceptor();
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    // console.log("🔍 AuthProvider mounting, checking for token...");
    const token = localStorage.getItem("authToken");
    // console.log("🔑 Token found:", token ? "yes" : "no");

    if (token) {
      fetchUserProfile(token);
    } else {
      // console.log("🔑 No token found, setting loading to false");
      setLoading(false);
      setIsAuthenticated(false);
      setIsUnverified(false);
    }
  }, []);

  const login = async (token: string) => {
    // console.log("🔑 Login called with token:", token ? "exists" : "missing");
    localStorage.setItem("authToken", token);
    // console.log("💾 Token saved to localStorage");
    setIsAuthenticated(false);
    setIsUnverified(false);
    await fetchUserProfile(token);
  };

  const logout = () => {
    // console.log("🚪 Logout called");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    setUser(null);
    setIsAuthenticated(false);
    setIsUnverified(false);
    window.location.href = "/discover";
  };

  const refetchUser = () => {
    // console.log("🔄 refetchUser called");
    const token = localStorage.getItem("authToken");
    if (token) {
      fetchUserProfile(token);
    } else {
      setIsAuthenticated(false);
      setIsUnverified(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isUnverified,
        login,
        logout,
        refetchUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}