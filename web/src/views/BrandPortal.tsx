"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Header } from "../components/Header";
import { BrandCardSkeleton } from "../components/LoadingState";
import { StaggerChildren, StaggerItem } from "../components/FadeIn";
import { useI18n } from "../i18n/LanguageContext";
import { motionCard } from "../lib/motion";
import type { Brand } from "../types";

export function BrandPortal() {
  const { t } = useI18n();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getBrands()
      .then(setBrands)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-14">
        <StaggerChildren stagger={0.08}>
          <StaggerItem>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-copper sm:text-sm">
              {t("marketVietnam")}
            </p>
            <h1 className="mt-3 text-balance font-display text-3xl text-ink sm:text-5xl">{t("chooseBrand")}</h1>
          </StaggerItem>
        </StaggerChildren>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{t("apiError")}</p>
            <p className="mt-1 text-xs text-red-700/80">{error}</p>
          </div>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2" aria-busy={loading}>
          {loading ? (
            <BrandCardSkeleton count={2} />
          ) : (
            <StaggerChildren className="contents" stagger={0.09} delayChildren={0.12}>
              {brands.map((brand) => {
                const card = (
                  <>
                    <div className="relative aspect-[16/8] overflow-hidden bg-mist">
                      <img
                        src={brand.imageUrl}
                        alt={brand.name}
                        className="h-full w-full object-cover transition duration-500 ease-motion group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                      <div className="absolute bottom-4 left-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                          {brand.market === "Vietnam" ? t("marketVietnam") : brand.market}
                        </p>
                        <h2 className="font-display text-2xl text-white sm:text-3xl">{brand.name}</h2>
                      </div>
                    </div>
                    <div className="flex items-end justify-end gap-4 p-4 sm:p-5">
                      {brand.ready ? (
                        <motion.span
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.98 }}
                          className="shrink-0 rounded-full px-5 py-2 text-sm font-semibold text-white"
                          style={{ backgroundColor: brand.accentColor }}
                        >
                          {t("enterDashboard")}
                        </motion.span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-mist px-5 py-2 text-sm font-semibold text-ink/50">
                          {t("comingSoon")}
                        </span>
                      )}
                    </div>
                  </>
                );
                const boxClass = `block overflow-hidden rounded-3xl border border-ink/8 bg-white/95 shadow-card backdrop-blur-sm ${motionCard} group`;
                return (
                  <StaggerItem key={brand.id}>
                    {brand.ready ? (
                      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}>
                        <Link href={`/brand/${brand.code}`} className={boxClass}>
                          {card}
                        </Link>
                      </motion.div>
                    ) : (
                      <article className={boxClass}>{card}</article>
                    )}
                  </StaggerItem>
                );
              })}
            </StaggerChildren>
          )}
        </div>
      </main>
    </div>
  );
}
