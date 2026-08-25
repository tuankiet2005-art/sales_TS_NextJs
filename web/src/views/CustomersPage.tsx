"use client";

import { History, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { CenteredModal } from "../components/CenteredModal";
import { CustomerForm, customerFormFromDetail, emptyCustomerForm } from "../components/CustomerForm";
import { Header } from "../components/Header";
import { LoadingBlock, TableRowsSkeleton } from "../components/LoadingState";
import { Pagination } from "../components/Pagination";
import { useI18n } from "../i18n/LanguageContext";
import { loadLocationCache, saveLocationCache } from "../lib/catalogReferenceCache";
import { motionInteractive } from "../lib/motion";
import type { Customer, CustomerDetail, Location } from "../types";

const PAGE_SIZE = 10;

export function CustomersPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<Location[]>(() => loadLocationCache() ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState(emptyCustomerForm());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    api.getLocations().then((items) => {
      setLocations(items);
      saveLocationCache(items);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listCustomers({ query: debouncedQuery, page, pageSize: PAGE_SIZE, includeInactive: true })
      .then((result) => {
        if (!cancelled) {
          setRows(result.items);
          setTotal(result.total);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page]);

  async function openCustomer(id: number | "new") {
    setEditingId(id);
    setModalError(null);
    if (id === "new") {
      setDetail(null);
      setForm(emptyCustomerForm());
      return;
    }
    try {
      const next = await api.getCustomer(id);
      setDetail(next);
      setForm(customerFormFromDetail(next));
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("apiError"));
    }
  }

  async function saveCustomer() {
    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        permanentAddress: form.permanentAddress,
        temporaryAddress: form.temporaryAddress,
        notes: form.notes,
        relationships: form.relationships,
      };
      if (editingId === "new") {
        await api.createCustomer(payload);
      } else if (editingId) {
        await api.updateCustomer(editingId, payload);
      }
      setEditingId(null);
      setDetail(null);
      setForm(emptyCustomerForm());
      const result = await api.listCustomers({
        query: debouncedQuery,
        page,
        pageSize: PAGE_SIZE,
        includeInactive: true,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setSaving(false);
    }
  }

  async function removeCustomer(id?: number) {
    const targetId = id ?? (typeof editingId === "number" ? editingId : null);
    if (!targetId) {
      return;
    }
    if (!window.confirm(t("customer.deleteConfirm"))) {
      return;
    }
    setSaving(true);
    try {
      await api.deleteCustomer(targetId);
      if (editingId === targetId) {
        setEditingId(null);
      }
      const result = await api.listCustomers({
        query: debouncedQuery,
        page,
        pageSize: PAGE_SIZE,
        includeInactive: true,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setSaving(false);
    }
  }

  async function restoreCustomer(id: number) {
    setSaving(true);
    setModalError(null);
    try {
      const restored = await api.reactivateCustomer(id);
      if (editingId === id) {
        setDetail(restored);
        setForm(customerFormFromDetail(restored));
      }
      const result = await api.listCustomers({
        query: debouncedQuery,
        page,
        pageSize: PAGE_SIZE,
        includeInactive: true,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-page px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-copper">{t("customer.nav")}</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl">{t("customer.title")}</h1>
          </div>
          <button
            type="button"
            onClick={() => void openCustomer("new")}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-paper hover:bg-forest"
          >
            <Plus className="h-4 w-4" />
            {t("customer.createNew")}
          </button>
        </div>

        <label className="relative mt-5 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("customer.searchPlaceholder")}
            className="h-12 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-3"
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-5 overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-card">
          {loading ? (
            <TableRowsSkeleton rows={5} columns={4} />
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink/55">{t("customer.empty")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/8 bg-paper/70 text-xs uppercase tracking-[0.12em] text-ink/55">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("customer.fullName")}</th>
                  <th className="px-4 py-3 font-medium">{t("customer.phone")}</th>
                  <th className="px-4 py-3 font-medium">{t("customer.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`list-data-row border-b border-ink/6 last:border-0 ${motionInteractive}`}
                    onDoubleClick={() => void openCustomer(row.id)}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void openCustomer(row.id)}
                        className="font-medium text-ink hover:text-copper"
                      >
                        {row.fullName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{row.phone || "—"}</td>
                    <td className="px-4 py-3">
                      {row.isActive ? (
                        <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">
                          {t("customer.active")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-ink/8 px-2.5 py-1 text-xs font-medium text-ink/60">
                          {t("customer.suspended")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/quotes?customerId=${row.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink/10 bg-white px-2.5 text-xs font-semibold text-ink hover:border-copper hover:text-copper"
                          title={t("customer.viewQuoteHistory")}
                        >
                          <History className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">{t("customer.viewQuoteHistory")}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => void openCustomer(row.id)}
                          onDoubleClick={(event) => event.stopPropagation()}
                          className="inline-flex h-8 items-center rounded-lg border border-ink/10 bg-white px-2.5 text-xs font-semibold text-ink hover:border-copper hover:text-copper"
                        >
                          {t("admin.edit")}
                        </button>
                        {row.isActive ? (
                          <button
                            type="button"
                            onClick={() => void removeCustomer(row.id)}
                            onDoubleClick={(event) => event.stopPropagation()}
                            disabled={saving}
                            className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {t("customer.delete")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void restoreCustomer(row.id)}
                            onDoubleClick={(event) => event.stopPropagation()}
                            disabled={saving}
                            className="inline-flex h-8 items-center rounded-lg border border-forest/20 bg-white px-2.5 text-xs font-semibold text-forest hover:bg-forest/5 disabled:opacity-60"
                          >
                            {t("customer.reactivate")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </main>

      {editingId !== null && (
        <CenteredModal
          onClose={() => setEditingId(null)}
          scrollPanel={false}
          backdropClassName="bg-ink/40 backdrop-blur-[2px]"
          panelClassName="flex max-h-[min(92dvh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-card"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink/8 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.14em] text-copper">
                {editingId === "new" ? t("customer.createNew") : t("customer.edit")}
              </p>
              <h2 className="mt-1 truncate font-display text-xl text-ink sm:text-2xl">
                {editingId === "new" ? t("customer.new") : form.fullName || t("customer.edit")}
              </h2>
              {detail && !detail.isActive && (
                <span className="mt-2 inline-flex rounded-full bg-ink/8 px-2.5 py-1 text-xs font-medium text-ink/60">
                  {t("customer.suspended")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink/45 hover:bg-mist hover:text-ink"
              aria-label={t("customer.cancel")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {editingId !== "new" && !detail ? (
              <LoadingBlock className="py-8" />
            ) : (
              <CustomerForm
                locations={locations}
                customerId={editingId === "new" ? undefined : editingId}
                value={form}
                onChange={setForm}
                purchases={detail?.purchases}
              />
            )}
            {modalError && <p className="mt-4 text-sm text-red-700">{modalError}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ink/8 bg-paper/50 px-5 py-4 sm:px-6">
            {editingId !== "new" && detail ? (
              detail.isActive ? (
                <button
                  type="button"
                  onClick={() => void removeCustomer()}
                  disabled={saving}
                  className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {t("customer.delete")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void restoreCustomer(editingId)}
                  disabled={saving}
                  className="inline-flex h-10 items-center rounded-xl border border-forest/20 bg-white px-4 text-sm font-semibold text-forest hover:bg-forest/5 disabled:opacity-60"
                >
                  {t("customer.reactivate")}
                </button>
              )
            ) : (
              <span />
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="h-10 rounded-xl border border-ink/10 bg-white px-4 text-sm font-semibold text-ink/70 hover:text-ink"
              >
                {t("customer.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void saveCustomer()}
                disabled={saving}
                className="h-10 rounded-xl bg-ink px-5 text-sm font-semibold text-paper hover:bg-forest disabled:opacity-60"
              >
                {saving ? t("customer.saving") : t("customer.save")}
              </button>
            </div>
          </div>
        </CenteredModal>
      )}
    </div>
  );
}
