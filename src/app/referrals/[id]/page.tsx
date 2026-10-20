import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { ReferralWorkspace } from "@/components/referral-workspace";

interface ReferralPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Referral review",
};

export default async function ReferralPage({ params }: ReferralPageProps) {
  const { id } = await params;
  return (
    <AppShell>
      <ReferralWorkspace referralId={id} />
    </AppShell>
  );
}
