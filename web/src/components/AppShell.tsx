"use client";

import { AdminAuthProvider, useAdminAuth } from "@/auth/AdminAuthContext";
import { sessionGateView } from "@/auth/sessionGate";
import { LoginScreen } from "@/components/LoginScreen";
import { PageMotion } from "@/components/PageMotion";
import { LanguageProvider } from "@/i18n/LanguageContext";

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, signedIn } = useAdminAuth();
  const view = sessionGateView(ready, signedIn);
  if (view === "pending") {
    return <div className="min-h-screen motion-fade-in bg-paper" aria-hidden />;
  }
  if (view === "login") {
    return (
      <PageMotion>
        <LoginScreen />
      </PageMotion>
    );
  }
  return <PageMotion>{children}</PageMotion>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AdminAuthProvider>
        <Gate>{children}</Gate>
      </AdminAuthProvider>
    </LanguageProvider>
  );
}
