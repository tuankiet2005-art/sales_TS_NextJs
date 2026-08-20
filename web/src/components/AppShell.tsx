"use client";

import { AdminAuthProvider, useAdminAuth } from "@/auth/AdminAuthContext";
import { sessionGateView } from "@/auth/sessionGate";
import { LoginScreen } from "@/components/LoginScreen";
import { LanguageProvider } from "@/i18n/LanguageContext";

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, signedIn } = useAdminAuth();
  const view = sessionGateView(ready, signedIn);
  if (view === "pending") {
    return null;
  }
  if (view === "login") {
    return <LoginScreen />;
  }
  return <>{children}</>;
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
