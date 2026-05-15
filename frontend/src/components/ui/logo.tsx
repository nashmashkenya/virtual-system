import Link from "next/link";

export function Logo({
  compact = false,
  emphasize = false,
}: {
  compact?: boolean;
  /** Larger wordmark + tagline (e.g. marketing home) */
  emphasize?: boolean;
}) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <div
        className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] font-bold text-white shadow-lg shadow-blue-500/20 ${
          emphasize ? "h-14 w-14 text-lg sm:h-16 sm:w-16 sm:text-xl" : "h-11 w-11 text-base"
        }`}
      >
        ES
      </div>
      {compact ? null : (
        <div>
          <p
            className={`font-bold tracking-tight text-[var(--text)] ${
              emphasize ? "text-lg sm:text-xl md:text-2xl" : "text-base"
            }`}
          >
            ElimuPawa Classroom
          </p>
          <p className={`text-[var(--subtext)] ${emphasize ? "mt-0.5 text-sm sm:text-base" : "text-xs"}`}>
            Virtual learning for modern schools
          </p>
        </div>
      )}
    </Link>
  );
}
