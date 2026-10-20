import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AISettingsPage } from "@/components/ai-settings-page";

export const metadata: Metadata = { title: "AI settings" };

export default function SettingsPage() {
  return (
    <AppShell>
      <AISettingsPage />
    </AppShell>
  );
}
