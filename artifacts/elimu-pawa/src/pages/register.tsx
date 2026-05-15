import { RegisterPanel } from "@/components/auth/register-panel";

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(37,99,235,0.18),transparent_55%)]" aria-hidden />
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <RegisterPanel />
      </div>
    </div>
  );
}
