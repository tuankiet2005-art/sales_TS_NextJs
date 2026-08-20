"use client";
import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { useI18n } from "../i18n/LanguageContext";
import { motionInteractive, motionPress, motionStagger } from "../lib/motion";
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
      signIn(session.token);
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
        <div className="w-full max-w-md text-center motion-scale-in">
          <p className="text-xs uppercase tracking-[0.18em] text-copper">{t("login.kicker")}</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">{t("login.title")}</h1>
          <form
            onSubmit={submitLogin}
            className="mt-8 space-y-4 rounded-2xl bg-white p-6 text-left shadow-card motion-enter"
            style={motionStagger(1)}
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
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className={`h-12 w-full rounded-full bg-ink text-base font-semibold text-paper disabled:opacity-60 ${motionInteractive} ${motionPress} hover:bg-forest`}
            >
              {saving ? t("login.signingIn") : t("login.submit")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
