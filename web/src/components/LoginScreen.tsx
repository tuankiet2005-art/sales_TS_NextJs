"use client";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { useI18n } from "../i18n/LanguageContext";
import { StaggerChildren, StaggerItem } from "./FadeIn";
import { motionInteractive, motionPress } from "../lib/motion";
import { scaleIn } from "../lib/motionVariants";
import { Header } from "./Header";

export function LoginScreen() {
  const { t } = useI18n();
  const { signIn } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const session = await api.login(username, password);
      signIn(session.token, session.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.invalid"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <StaggerChildren className="w-full max-w-md text-center" stagger={0.1}>
          <StaggerItem>
            <p className="text-xs uppercase tracking-[0.18em] text-copper">{t("login.kicker")}</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl">{t("login.title")}</h1>
          </StaggerItem>
          <StaggerItem>
            <motion.form
              onSubmit={submitLogin}
              initial="hidden"
              animate="visible"
              variants={scaleIn}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 space-y-4 rounded-2xl border border-ink/6 bg-white/90 p-6 text-left shadow-card backdrop-blur-sm"
            >
              <label className="block text-sm font-medium text-ink">
                {t("login.username")}
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 h-12 w-full rounded-lg border border-ink/10 bg-paper px-3 text-base transition-shadow duration-300 ease-motion focus:outline-none focus:ring-2 focus:ring-copper/30"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                {t("login.password")}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 h-12 w-full rounded-lg border border-ink/10 bg-paper px-3 text-base transition-shadow duration-300 ease-motion focus:outline-none focus:ring-2 focus:ring-copper/30"
                />
              </label>
              <AnimatePresence mode="wait">
                {error ? (
                  <motion.p
                    key="login-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm text-red-700"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: saving ? 1 : 1.01 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-semibold text-paper disabled:opacity-60 ${motionInteractive} ${motionPress} hover:bg-forest`}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {saving ? t("login.signingIn") : t("login.submit")}
              </motion.button>
            </motion.form>
          </StaggerItem>
        </StaggerChildren>
      </main>
    </div>
  );
}
