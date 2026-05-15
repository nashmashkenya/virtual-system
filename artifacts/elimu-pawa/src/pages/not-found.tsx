import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <p className="text-8xl font-black text-[var(--primary)]">404</p>
        <h1 className="text-2xl font-bold text-[var(--text)]">Page not found</h1>
        <p className="text-[var(--subtext)] max-w-sm mx-auto">This page does not exist or you may not have access.</p>
        <Link href="/" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">
          <ArrowLeft className="h-4 w-4" />
          Go home
        </Link>
      </div>
    </div>
  );
}
