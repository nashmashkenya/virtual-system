"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ToastTone = "success" | "warning" | "info";

type Toast = {
  id: string;
  title: string;
  message: string;
  tone: ToastTone;
};

type AppState = {
  theme: "light" | "dark";
  paidUsernames: string[];
  notifications: Toast[];
  toggleTheme: () => void;
  unlockCourse: (username: string) => void;
  addNotification: (toast: Toast) => void;
  dismissNotification: (id: string) => void;
};

const starterNotifications: Toast[] = [];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "light",
      paidUsernames: [],
      notifications: starterNotifications,
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
      unlockCourse: (username) =>
        set((state) => ({
          paidUsernames: state.paidUsernames.includes(username)
            ? state.paidUsernames
            : [...state.paidUsernames, username],
          notifications: [
            {
              id: `payment-${Date.now()}`,
              title: "Payment successful",
              message: "Your classroom has been unlocked and attendance is now active.",
              tone: "success",
            },
            ...state.notifications.filter((item) => item.id !== "payment-success"),
          ],
        })),
      addNotification: (toast) =>
        set((state) => ({
          notifications: [toast, ...state.notifications],
        })),
      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((toast) => toast.id !== id),
        })),
    }),
    {
      name: "elimuapwa-classroom-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        paidUsernames: state.paidUsernames,
      }),
    },
  ),
);
