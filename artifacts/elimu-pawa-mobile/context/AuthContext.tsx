import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, loginUser, logoutUser } from "@/lib/api";
import { clearCurrentUser, loadCurrentUser, saveCurrentUser } from "@/lib/storage";
import type { DemoUser } from "@/lib/types";

type AuthContextType = {
  user: DemoUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: DemoUser) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const remote = await getCurrentUser();
        if (remote) {
          setUserState(remote);
          await saveCurrentUser(remote);
        } else {
          const cached = await loadCurrentUser();
          if (cached) setUserState(cached);
        }
      } catch {
        const cached = await loadCurrentUser();
        if (cached) setUserState(cached);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const resp = await loginUser({ username, password });
      const loggedIn = resp.user ?? ({ username, full_name: username, email: "", role: "student" } as DemoUser);
      setUserState(loggedIn);
      await saveCurrentUser(loggedIn);
    } catch {
      // If API fails, create a local session from mock users
      const { mockDemoUsers } = await import("@/lib/api");
      const found = mockDemoUsers.find((u) => u.username === username);
      if (found) {
        setUserState(found);
        await saveCurrentUser(found);
      } else {
        throw new Error("User not found. Try a demo account above.");
      }
    }
  };

  const logout = async () => {
    await logoutUser();
    await clearCurrentUser();
    setUserState(null);
  };

  const setUser = (u: DemoUser) => {
    setUserState(u);
    saveCurrentUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
