"use client";

import { AdminAuthProvider, useAdminAuth } from "@/auth/AdminAuthContext";
import { sessionGateView } from "@/auth/sessionGate";
import { LoadingBlock } from "@/components/LoadingState";
import { LoginScreen } from "@/components/LoginScreen";
import { PageMotion } from "@/components/PageMotion";
import { LanguageProvider, useI18n } from "@/i18n/LanguageContext";

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, signedIn } = useAdminAuth();
  const { t } = useI18n();
  const view = sessionGateView(ready, signedIn);
  if (view === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper motion-fade-in">
        <LoadingBlock message={t("loadingApp")} size="lg" />
      </div>
    );
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
