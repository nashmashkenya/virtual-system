import { GraduationCap } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight text-[var(--text)] ${className ?? ""}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)]">
        <GraduationCap className="h-4.5 w-4.5 text-white" />
      </span>
      <span>
        Elimu<span className="text-[var(--primary)]">Pawa</span>
      </span>
    </span>
  );
}
