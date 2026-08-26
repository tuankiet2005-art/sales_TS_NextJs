"use client";

import { motion } from "motion/react";
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen items-center justify-center bg-paper/60 backdrop-blur-sm"
      >
        <LoadingBlock message={t("loadingApp")} size="lg" />
      </motion.div>
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
