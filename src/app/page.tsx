import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { ReferralDashboard } from "@/components/referral-dashboard";

export default function DashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={<DashboardFallback />}>
        <ReferralDashboard />
      </Suspense>
    </AppShell>
  );
}

function DashboardFallback() {
  return (
    <div aria-label="Loading referral dashboard" style={{ padding: "2.5rem" }}>
      <div className="skeleton" style={{ height: "2rem", width: "12rem" }} />
    </div>
  );
}
