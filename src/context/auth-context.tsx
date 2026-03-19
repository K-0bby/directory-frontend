// context/auth-context.tsx
"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id: string;
  phone: string;
  last_name: string;
  first_name: string;
  email: string;
  name: string;
  role: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean; // Add this
  login: (token: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Add this

  const fetchUserProfile = async (token: string) => {
    // console.log(
    //   "🔄 fetchUserProfile called with token:",
    //   token ? "exists" : "missing"
    // );
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      // Try different possible user endpoints
      const endpoints = [
        "/api/user",
        // "/api/auth/user",
        // "/api/profile",
        // "/api/me",
      ];

      let userData = null;
      // let successfulEndpoint = "";

      for (const endpoint of endpoints) {
        try {
          // console.log("📡 Trying endpoint:", `${API_URL}${endpoint}`);
          const res = await fetch(`${API_URL}${endpoint}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          // console.log(`📨 ${endpoint} Response status:`, res.status);

          if (res.ok) {
            const data = await res.json();
            // console.log(`✅ User data from ${endpoint}:`, data);
            userData = data;
            // successfulEndpoint = endpoint;
            break;
          } else if (res.status === 401) {
            localStorage.removeItem("authToken");
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return; // Kill the function here
          } else if (res.status === 405) {
            // console.log(`⚠️ ${endpoint} returned 405 - Method Not Allowed`);
            // Try with POST method
            const postRes = await fetch(`${API_URL}${endpoint}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (postRes.ok) {
              const postData = await postRes.json();
              // console.log(`✅ User data from ${endpoint} (POST):`, postData);
              userData = postData;
              // successfulEndpoint = `${endpoint} (POST)`;
              break;
            }
          }
        } catch {
          // console.log(`❌ ${endpoint} failed:`, err);
          continue;
        }
      }

      if (userData) {
        // console.log(`🎯 Successfully fetched user from: ${successfulEndpoint}`);

        // Handle different backend response structures
        const raw = userData?.user ?? userData?.data ?? userData;
        // console.log("🔍 Extracted raw user data:", raw);

        const mappedUser: User = {
          id: raw?.id || "",
          name:
            raw?.name ||
            raw?.username ||
            `${raw?.first_name ?? ""} ${raw?.last_name ?? ""}`.trim() ||
            raw?.email?.split("@")[0] ||
            "User",
          role: raw?.role || raw?.user_type || "User",
          image: raw?.image || raw?.avatar || raw?.profile_picture || undefined,

          // 👇 ADD THIS LINE to satisfy the User interface
          email: raw?.email || "",
          last_name: raw?.last_name || "",
          first_name: raw?.first_name || "",
          phone: raw?.phone || "",
        };

        // console.log("👤 Final mapped user:", mappedUser);
        setUser(mappedUser);
        setIsAuthenticated(true); // Set authenticated to true
        
        // Store user role in localStorage for immediate access after login
        localStorage.setItem("userRole", mappedUser.role);
      }
      // } else {
      //   // console.log("❌ All user endpoints failed, clearing token");
      //   localStorage.removeItem("authToken");
      //   setUser(null);
      //   setIsAuthenticated(false); // Set authenticated to false
      // }
    } catch  (err) {
      console.error("🚨 Failed to fetch user:", err);
      // localStorage.removeItem("authToken");
      // setUser(null);
      // setIsAuthenticated(false); // Set authenticated to false
    } finally {
      setLoading(false);
    }
  };


  const refreshUser = async () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      // We await this to ensure the state is updated before the caller continues
      await fetchUserProfile(token);
    }
  };

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
      setIsAuthenticated(false); // Set authenticated to false
    }
  }, []);

  const login = async (token: string) => {
    // console.log("🔑 Login called with token:", token);
    localStorage.setItem("authToken", token);
    // console.log("💾 Token saved to localStorage");
    setIsAuthenticated(false); // Reset to false while fetching
    await fetchUserProfile(token);
  };

  const logout = () => {
    // console.log("🚪 Logout called");
    localStorage.removeItem("authToken");
    setUser(null);
    setIsAuthenticated(false); // Set authenticated to false
    window.location.href = "/discover"; // Redirect to login page
  };

  const refetchUser = () => {
    // console.log("🔄 refetchUser called");
    const token = localStorage.getItem("authToken");
    if (token) {
      fetchUserProfile(token);
    } else {
      setIsAuthenticated(false); // Set authenticated to false if no token
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated, // Add this to the value
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
