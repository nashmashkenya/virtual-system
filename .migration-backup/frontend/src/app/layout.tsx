import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://elimuapwaclassroom.com"),
  title: "ElimuPawa Classroom",
  description:
    "ElimuPawa Classroom is a modern virtual classroom for live learning, student engagement, and teacher operations.",
  applicationName: "ElimuPawa Classroom",
  openGraph: {
    title: "ElimuPawa Classroom",
    description:
      "Production-ready virtual classroom with live sessions, chat, quizzes, and dark mode.",
    siteName: "ElimuPawa Classroom",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full`}>
      <body suppressHydrationWarning className="min-h-full bg-[var(--background)] font-sans text-[var(--text)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
