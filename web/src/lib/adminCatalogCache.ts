import { api } from "../api/client";
import type {
  AdminBrand,
  AdminCategory,
  AdminDealer,
  AdminFeeDefinition,
  AdminFeeRule,
  AdminLocation,
  AdminVehicle,
} from "../types";

export type AdminCatalogKey =
  | "brands"
  | "categories"
  | "locations"
  | "fees"
  | "dealers"
  | "vehicles"
  | "feeRules";

type AdminCatalogRow =
  | AdminBrand
  | AdminCategory
  | AdminLocation
  | AdminFeeDefinition
  | AdminDealer
  | AdminVehicle
  | AdminFeeRule;

const cache = new Map<AdminCatalogKey, AdminCatalogRow[]>();
const inflight = new Map<AdminCatalogKey, Promise<AdminCatalogRow[]>>();

const fetchers: Record<AdminCatalogKey, () => Promise<AdminCatalogRow[]>> = {
  brands: () => api.listAdminBrands(),
  categories: () => api.listAdminCategories(),
  locations: () => api.listAdminLocations(),
  fees: () => api.listAdminFeeDefinitions(),
  dealers: () => api.listAdminDealers(),
  vehicles: () => api.listAdminVehicles(),
  feeRules: () => api.listAdminFeeRules(),
};

export async function getAdminCatalog<K extends AdminCatalogKey>(
  key: K,
  options?: { force?: boolean },
): Promise<(typeof fetchers)[K] extends () => Promise<infer T> ? T : never> {
  const force = options?.force ?? false;
  if (!force && cache.has(key)) {
    return cache.get(key)! as never;
  }
  if (!force) {
    const pending = inflight.get(key);
    if (pending) {
      return (await pending) as never;
    }
  }

  const promise = fetchers[key]().then((rows) => {
    cache.set(key, rows);
    inflight.delete(key);
    return rows;
  });
  inflight.set(key, promise);

  try {
    return (await promise) as never;
  } catch (error) {
    inflight.delete(key);
    throw error;
  }
}

export function invalidateAdminCatalog(...keys: AdminCatalogKey[]) {
  for (const key of keys) {
    cache.delete(key);
    inflight.delete(key);
  }
}

export function clearAdminCatalogCache() {
  cache.clear();
  inflight.clear();
}
