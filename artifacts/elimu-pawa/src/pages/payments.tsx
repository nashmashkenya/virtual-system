import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PaymentOverview } from "@/components/payments/payment-overview";
import { getCurrentDemoUser, getPaymentSummary } from "@/lib/api";
import { paymentSummaryFallback } from "@/lib/mock-data";
import type { DemoUser, PaymentSummaryData } from "@/lib/types";

export function PaymentsPage() {
  const [, navigate] = useLocation();
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [summary, setSummary] = useState<PaymentSummaryData>(paymentSummaryFallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentDemoUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      const data = await getPaymentSummary();
      setSummary(data);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [navigate]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardShell
      title="Payments"
      subtitle="Manage course access and M-Pesa checkout for your classroom."
      role="Payments"
      currentUser={currentUser}
    >
      <PaymentOverview summary={summary} currentUsername={currentUser.username} />
    </DashboardShell>
  );
}
