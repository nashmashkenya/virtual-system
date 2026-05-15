"use client";

import { useEffect } from "react";
import { ToastStack } from "@/components/ui/toast-stack";
import { useAppStore } from "@/lib/store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <>
      {children}
      <ToastStack />
    </>
  );
}
