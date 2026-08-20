"use client";

import { AdminAuthProvider, useAdminAuth } from "@/auth/AdminAuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { LanguageProvider } from "@/i18n/LanguageContext";

function Gate({ children }: { children: React.ReactNode }) {
  const { signedIn } = useAdminAuth();
  if (!signedIn) {
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
