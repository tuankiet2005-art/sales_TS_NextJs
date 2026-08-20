"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { useI18n } from "../i18n/LanguageContext";
import { motionInteractive } from "../lib/motion";
import { LanguageSwitcher } from "./LanguageSwitcher";

function NavItem({
  href,
  onClick,
  stacked,
  children,
}: {
  href: string;
  onClick?: () => void;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  const frame = active ? "border-copper text-copper" : "border-transparent";
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        stacked
          ? `flex min-h-11 items-center rounded-xl border px-3 py-2 text-base font-semibold ${motionInteractive} ${frame} ${
              active ? "bg-mist" : "text-ink/80 hover:border-ink/10 hover:bg-mist/70 hover:text-ink"
            }`
          : `rounded-lg border px-3 py-1.5 ${motionInteractive} ${frame} ${
              active ? "bg-copper/5" : "text-ink/70 hover:border-ink/10 hover:text-ink"
            }`
      }
    >
      {children}
    </Link>
  );
}

export function Header() {
  const { t } = useI18n();
  const { signedIn, signOut } = useAdminAuth();
  const params = useParams() ?? {};
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const brandCode = typeof params.brandCode === "string" ? params.brandCode : undefined;
  const catalogCode = brandCode || "MITSUBISHI";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function navLinks(stacked: boolean) {
    if (!signedIn) {
      return null;
    }
    return (
      <>
        <NavItem href={`/brand/${catalogCode}`} stacked={stacked} onClick={() => setMenuOpen(false)}>
          {t("browse")}
        </NavItem>
        <NavItem href="/" stacked={stacked} onClick={() => setMenuOpen(false)}>
          {t("changeBrand")}
        </NavItem>
        <NavItem href="/quotes" stacked={stacked} onClick={() => setMenuOpen(false)}>
          {t("quoteHistory.nav")}
        </NavItem>
        <NavItem href="/admin" stacked={stacked} onClick={() => setMenuOpen(false)}>
          {t("admin.nav")}
        </NavItem>
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            signOut();
          }}
          className={
            stacked
              ? "flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-base font-semibold text-ink/80 hover:bg-mist/70 hover:text-ink"
              : "px-1 py-1 text-ink/70 hover:text-ink"
          }
        >
          {t("login.logout")}
        </button>
      </>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur motion-fade-in">
      <div className="mx-auto flex max-w-page items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:py-5">
        {signedIn ? (
          <Link
            href={`/brand/${catalogCode}`}
            className="min-w-0 truncate font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          >
            {t("appName")}
          </Link>
        ) : (
          <span className="min-w-0 truncate font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {t("appName")}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {signedIn && (
            <nav className="hidden items-center gap-x-7 text-base font-semibold lg:flex">{navLinks(false)}</nav>
          )}
          <LanguageSwitcher />
          {signedIn && (
            <button
              type="button"
              className={`inline-flex size-11 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink lg:hidden ${motionInteractive}`}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? t("nav.close") : t("nav.open")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
      {signedIn && menuOpen && (
        <nav id="site-menu" className="border-t border-ink/10 bg-paper px-4 py-3 lg:hidden motion-slide-down">
          <div className="mx-auto flex max-w-page flex-col gap-1">{navLinks(true)}</div>
        </nav>
      )}
    </header>
  );
}
