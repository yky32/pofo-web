import { DashboardShell } from "@/components/dashboard-shell";
import { isSupabaseConfigured } from "@/lib/env";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();

  return (
    <DashboardShell demoMode={!configured} showSignOut={configured}>
      {children}
    </DashboardShell>
  );
}
