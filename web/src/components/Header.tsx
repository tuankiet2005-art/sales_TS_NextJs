"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { useI18n } from "../i18n/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={active ? "px-1 py-1 text-copper" : "px-1 py-1 text-ink/70 hover:text-ink"}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const { t } = useI18n();
  const { signedIn, signOut } = useAdminAuth();
  const params = useParams() ?? {};
  const brandCode = typeof params.brandCode === "string" ? params.brandCode : undefined;
  const catalogCode = brandCode || "MITSUBISHI";

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-5">
        {signedIn ? (
          <Link href={`/brand/${catalogCode}`} className="font-display text-3xl font-semibold tracking-tight text-ink">
            {t("appName")}
          </Link>
        ) : (
          <span className="font-display text-3xl font-semibold tracking-tight text-ink">{t("appName")}</span>
        )}
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-base font-semibold">
          {signedIn && (
            <>
              <NavItem href={`/brand/${catalogCode}`}>{t("browse")}</NavItem>
              <NavItem href="/">{t("changeBrand")}</NavItem>
              <NavItem href="/quotes">{t("quoteHistory.nav")}</NavItem>
              <NavItem href="/admin">{t("admin.nav")}</NavItem>
              <button type="button" onClick={signOut} className="px-1 py-1 text-ink/70 hover:text-ink">
                {t("login.logout")}
              </button>
            </>
          )}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
