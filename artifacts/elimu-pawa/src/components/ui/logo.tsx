import { GraduationCap } from "lucide-react";

export function Logo({ className, variant }: { className?: string; variant?: "light" }) {
  const textColor = variant === "light" ? "text-white" : "text-[var(--text)]";
  const accentColor = variant === "light" ? "text-violet-400" : "text-[var(--primary)]";
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${textColor} ${className ?? ""}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)]">
        <GraduationCap className="h-4.5 w-4.5 text-white" />
      </span>
      <span>
        Elimu<span className={accentColor}>Pawa</span>
      </span>
    </span>
  );
}
