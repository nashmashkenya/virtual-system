import { useSearch } from "wouter";
import { ResetPasswordPanel } from "@/components/auth/reset-password-panel";

export function ResetPasswordPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const uid = params.get("uid") ?? undefined;
  const token = params.get("token") ?? undefined;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(37,99,235,0.18),transparent_55%)]" aria-hidden />
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <ResetPasswordPanel uid={uid} token={token} />
      </div>
    </div>
  );
}
