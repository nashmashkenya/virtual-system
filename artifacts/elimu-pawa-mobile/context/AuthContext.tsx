import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface Student {
  id: number;
  adm_no: string;
  first_name: string;
  last_name: string;
  class_level: string;
}

interface AuthState {
  student: Student | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  setAuth: (student: Student, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "elimu_student_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    student: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as { student: Student; token: string };
          setState({ student: parsed.student, token: parsed.token, isLoading: false });
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      })
      .catch(() => {
        setState((s) => ({ ...s, isLoading: false }));
      });
  }, []);

  const setAuth = async (student: Student, token: string) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ student, token }));
    setState({ student, token, isLoading: false });
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState({ student: null, token: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
