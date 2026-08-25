import type {
  AdminAccessory,
  AdminBank,
  AdminBankLoan,
  AdminBrand,
  AdminCategory,
  AdminConsultingEmployee,
  AdminDealer,
  AdminDealerPolicy,
  AdminFeeDefinition,
  AdminFeePolicy,
  AdminFeeRule,
  AdminLocation,
  AdminPlateRegions,
  AdminVehicle,
  Bank,
  Brand,
  CatalogSnapshot,
  Category,
  ConsultingEmployee,
  CostBreakdown,
  Customer,
  CustomerDetail,
  CustomerRelationshipInput,
  StructuredAddress,
  DealerPolicy,
  ImportResult,
  Location,
  LocationDistrict,
  Paginated,
  QuoteExtras,
  QuoteHistory,
  UsageType,
  VehicleDetail,
  VehicleModelDetail,
  VehicleModelSummary,
  VehicleSummary,
  AccessoryCatalogItem,
} from "../types";
import type { RelationshipDiscountOffer } from "../lib/customerRelationshipDiscount";
import { extrasPayload } from "../lib/quoteExtras";
import { modelToSlug } from "../lib/modelSlug";
import { clearAdminToken, getAdminToken, isPublicApiPath } from "../lib/adminAuth";

const API_BASE = "";

export class UnauthorizedError extends Error {
  constructor(message = "Sign in required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const isFormData = init?.body instanceof FormData;
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAdminToken();
  if (token && !isPublicApiPath(path)) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      clearAdminToken();
      throw new UnauthorizedError(body.message ?? "Sign in required");
    }
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  login(username: string, password: string) {
    return request<{ token: string; username: string; role: "admin" | "sales" }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  getBrands() {
    return request<Brand[]>("/api/brands");
  },
  getBrand(code: string) {
    return request<Brand>(`/api/brands/${code}`);
  },
  getCatalogBootstrap(brandCode: string) {
    const params = new URLSearchParams({ brand: brandCode });
    return request<{ brand: Brand; categories: Category[]; vehicles: VehicleSummary[] }>(
      `/api/catalog?${params.toString()}`,
    );
  },
  searchVehicles(keyword?: string, brandCode?: string, categoryId?: number) {
    const params = new URLSearchParams();
    if (keyword?.trim()) {
      params.set("keyword", keyword.trim());
    }
    if (brandCode) {
      params.set("brand", brandCode);
    }
    if (categoryId) {
      params.set("categoryId", String(categoryId));
    }
    const query = params.toString();
    return request<VehicleSummary[]>(`/api/vehicles/search${query ? `?${query}` : ""}`);
  },
  searchVehiclesPage(
    options: {
      keyword?: string;
      brandCode?: string;
      categoryId?: number;
      model?: string;
      vehicleType?: string;
      page?: number;
      pageSize?: number;
    },
    init?: RequestInit,
  ) {
    const params = new URLSearchParams();
    if (options.keyword?.trim()) {
      params.set("keyword", options.keyword.trim());
    }
    if (options.brandCode) {
      params.set("brand", options.brandCode);
    }
    if (options.categoryId) {
      params.set("categoryId", String(options.categoryId));
    }
    if (options.model) {
      params.set("model", options.model);
    }
    if (options.vehicleType) {
      params.set("type", options.vehicleType);
    }
    params.set("page", String(options.page ?? 1));
    params.set("pageSize", String(options.pageSize ?? 12));
    return request<Paginated<VehicleSummary> & { filterOptions: { models: string[]; vehicleTypes: string[] } }>(
      `/api/vehicles/search?${params.toString()}`,
      init,
    );
  },
  getVehicleFilterOptions(brandCode?: string, categoryId?: number) {
    const params = new URLSearchParams();
    if (brandCode) {
      params.set("brand", brandCode);
    }
    if (categoryId != null) {
      params.set("categoryId", String(categoryId));
    }
    const query = params.toString();
    return request<{ models: string[]; vehicleTypes: string[] }>(
      `/api/vehicles/filters${query ? `?${query}` : ""}`,
    );
  },
  getVehicle(id: number) {
    return request<VehicleDetail>(`/api/vehicles/${id}`);
  },
  searchModelsPage(
    options: {
      keyword?: string;
      brandCode?: string;
      categoryId?: number;
      model?: string;
      vehicleType?: string;
      page?: number;
      pageSize?: number;
    },
    init?: RequestInit,
  ) {
    const params = new URLSearchParams();
    if (options.keyword?.trim()) {
      params.set("keyword", options.keyword.trim());
    }
    if (options.brandCode) {
      params.set("brand", options.brandCode);
    }
    if (options.categoryId) {
      params.set("categoryId", String(options.categoryId));
    }
    if (options.model) {
      params.set("model", options.model);
    }
    if (options.vehicleType) {
      params.set("type", options.vehicleType);
    }
    params.set("page", String(options.page ?? 1));
    params.set("pageSize", String(options.pageSize ?? 12));
    return request<Paginated<VehicleModelSummary> & { filterOptions: { models: string[]; vehicleTypes: string[] } }>(
      `/api/vehicles/models/search?${params.toString()}`,
      init,
    );
  },
  getModelDetail(brandCode: string, model: string) {
    return request<VehicleModelDetail>(
      `/api/vehicles/models/${encodeURIComponent(brandCode)}/${modelToSlug(model)}`,
    );
  },
  getCategories() {
    return request<Category[]>("/api/vehicle-categories");
  },
  getLocations() {
    return request<Location[]>("/api/locations");
  },
  getLocationDistricts(locationId: number) {
    return request<LocationDistrict[]>(`/api/location-districts?locationId=${locationId}`);
  },
  getDealerPolicy() {
    return request<DealerPolicy>("/api/dealer-policy");
  },
  loadQuotePage(
    vehicleId: number,
    locationId: number,
    includeOptionalInsurance: boolean,
    categoryId?: number,
    extras?: QuoteExtras,
    usageType?: UsageType,
    selectedOfferIds?: string[],
    forgoneOfferIds?: string[]
  ) {
    return request<{ vehicle: VehicleDetail; breakdown: CostBreakdown }>("/api/quote-load", {
      method: "POST",
      body: JSON.stringify({
        vehicleId,
        locationId,
        categoryId,
        includeOptionalInsurance,
        usageType,
        selectedOfferIds,
        forgoneOfferIds,
        ...(extras ? extrasPayload(extras) : {}),
      }),
    });
  },
  calculateOnRoadCost(
    vehicleId: number,
    locationId: number,
    includeOptionalInsurance: boolean,
    categoryId?: number,
    extras?: QuoteExtras,
    usageType?: UsageType,
    selectedOfferIds?: string[],
    forgoneOfferIds?: string[]
  ) {
    return request<CostBreakdown>("/api/calculate-on-road-cost", {
      method: "POST",
      body: JSON.stringify({
        vehicleId,
        locationId,
        categoryId,
        includeOptionalInsurance,
        usageType,
        selectedOfferIds,
        forgoneOfferIds,
        ...(extras ? extrasPayload(extras) : {}),
      }),
    });
  },
  async exportQuote(payload: {
    vehicleId: number;
    locationId: number;
    categoryId?: number;
    includeOptionalInsurance: boolean;
    customerId?: number;
    customerName: string;
    customerAddress?: string;
    color?: string;
    language?: string;
    extras?: QuoteExtras;
    usageType?: UsageType;
    selectedOfferIds?: string[];
    forgoneOfferIds?: string[];
    breakdown?: CostBreakdown;
  }) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = getAdminToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(apiUrl("/api/export-quote"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        extras: undefined,
        ...(payload.extras ? extrasPayload(payload.extras) : {}),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        clearAdminToken();
        throw new UnauthorizedError(body.message ?? "Sign in required");
      }
      throw new Error(body.message ?? `Export failed (${response.status})`);
    }
    return response.blob();
  },
  listQuotes(options?: {
    query?: string;
    brandCode?: string;
    locationName?: string;
    customerId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const params = new URLSearchParams();
    if (options?.query?.trim()) {
      params.set("q", options.query.trim());
    }
    if (options?.brandCode) {
      params.set("brand", options.brandCode);
    }
    if (options?.locationName) {
      params.set("location", options.locationName);
    }
    if (options?.customerId) {
      params.set("customerId", String(options.customerId));
    }
    params.set("page", String(options?.page ?? 1));
    params.set("pageSize", String(options?.pageSize ?? 10));
    return request<Paginated<QuoteHistory>>(`/api/quotes?${params.toString()}`);
  },
  getQuoteFilterOptions() {
    return request<{ brandCodes: string[]; locationNames: string[] }>("/api/quotes?filters=1");
  },
  getQuote(id: number) {
    return request<QuoteHistory>(`/api/quotes/${id}`);
  },
  saveQuote(payload: {
    vehicleId: number;
    locationId: number;
    categoryId?: number;
    includeOptionalInsurance: boolean;
    customerId?: number;
    customerName: string;
    customerAddress?: string;
    color?: string;
    language?: string;
    extras?: QuoteExtras;
    usageType?: UsageType;
    selectedOfferIds?: string[];
    forgoneOfferIds?: string[];
    breakdown?: CostBreakdown;
  }) {
    return request<QuoteHistory>("/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        extras: undefined,
        ...(payload.extras ? extrasPayload(payload.extras) : {}),
      }),
    });
  },
  listCustomers(options?: { query?: string; page?: number; pageSize?: number; includeInactive?: boolean }) {
    const params = new URLSearchParams();
    if (options?.query?.trim()) {
      params.set("q", options.query.trim());
    }
    if (options?.includeInactive) {
      params.set("includeInactive", "1");
    }
    params.set("page", String(options?.page ?? 1));
    params.set("pageSize", String(options?.pageSize ?? 20));
    return request<Paginated<Customer>>(`/api/customers?${params.toString()}`);
  },
  getCustomer(id: number) {
    return request<CustomerDetail>(`/api/customers/${id}`);
  },
  createCustomer(payload: {
    fullName: string;
    phone?: string;
    permanentAddress?: StructuredAddress;
    temporaryAddress?: StructuredAddress;
    notes?: string;
    relationships?: CustomerRelationshipInput[];
  }) {
    return request<CustomerDetail>("/api/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateCustomer(
    id: number,
    payload: {
      fullName: string;
      phone?: string;
      permanentAddress?: StructuredAddress;
      temporaryAddress?: StructuredAddress;
      notes?: string;
      relationships?: CustomerRelationshipInput[];
    },
  ) {
    return request<CustomerDetail>(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteCustomer(id: number) {
    return request<void>(`/api/customers/${id}`, { method: "DELETE" });
  },
  reactivateCustomer(id: number) {
    return request<CustomerDetail>(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ reactivate: true }),
    });
  },
  listCustomerOptions(excludeId?: number) {
    const suffix = excludeId ? `?exclude=${excludeId}` : "";
    return request<Customer[]>(`/api/customers/options${suffix}`);
  },
  getCustomerRelationshipDiscount(customerId: number, listPrice: number) {
    const params = new URLSearchParams({ listPrice: String(listPrice) });
    return request<{ offer: RelationshipDiscountOffer | null }>(
      `/api/customers/${customerId}/relationship-discount?${params.toString()}`,
    );
  },
  exportCatalog() {
    return request<CatalogSnapshot>("/api/admin/catalog");
  },
  importCatalog(snapshot: CatalogSnapshot) {
    return request<ImportResult>("/api/admin/import", {
      method: "POST",
      body: JSON.stringify(snapshot),
    });
  },
  listAdminBrands() {
    return request<AdminBrand[]>("/api/admin/brands");
  },
  saveAdminBrand(item: AdminBrand) {
    return item.id
      ? request<AdminBrand>(`/api/admin/brands/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminBrand>("/api/admin/brands", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminBrand(id: number) {
    return request<void>(`/api/admin/brands/${id}`, { method: "DELETE" });
  },
  listAdminCategories() {
    return request<AdminCategory[]>("/api/admin/categories");
  },
  saveAdminCategory(item: AdminCategory) {
    return item.id
      ? request<AdminCategory>(`/api/admin/categories/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminCategory>("/api/admin/categories", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminCategory(id: number) {
    return request<void>(`/api/admin/categories/${id}`, { method: "DELETE" });
  },
  listAdminLocations() {
    return request<AdminLocation[]>("/api/admin/locations");
  },
  saveAdminLocation(item: AdminLocation) {
    return item.id
      ? request<AdminLocation>(`/api/admin/locations/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminLocation>("/api/admin/locations", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminLocation(id: number) {
    return request<void>(`/api/admin/locations/${id}`, { method: "DELETE" });
  },
  listAdminDealers() {
    return request<AdminDealer[]>("/api/admin/dealers");
  },
  saveAdminDealer(item: AdminDealer) {
    return item.id
      ? request<AdminDealer>(`/api/admin/dealers/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminDealer>("/api/admin/dealers", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminDealer(id: number) {
    return request<void>(`/api/admin/dealers/${id}`, { method: "DELETE" });
  },
  listAdminBanks() {
    return request<AdminBank[]>("/api/admin/banks");
  },
  saveAdminBank(item: AdminBank) {
    return item.id
      ? request<AdminBank>(`/api/admin/banks/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminBank>("/api/admin/banks", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminBank(id: number) {
    return request<void>(`/api/admin/banks/${id}`, { method: "DELETE" });
  },
  listAdminConsultingEmployees() {
    return request<AdminConsultingEmployee[]>("/api/admin/consulting-employees");
  },
  saveAdminConsultingEmployee(item: AdminConsultingEmployee) {
    return item.id
      ? request<AdminConsultingEmployee>(`/api/admin/consulting-employees/${item.id}`, {
          method: "PUT",
          body: JSON.stringify(item),
        })
      : request<AdminConsultingEmployee>("/api/admin/consulting-employees", {
          method: "POST",
          body: JSON.stringify(item),
        });
  },
  deleteAdminConsultingEmployee(id: number) {
    return request<void>(`/api/admin/consulting-employees/${id}`, { method: "DELETE" });
  },
  listAdminBankLoans() {
    return request<AdminBankLoan[]>("/api/admin/bank-loans");
  },
  getAdminBankLoan(id: number) {
    return request<AdminBankLoan>(`/api/admin/bank-loans/${id}`);
  },
  saveAdminBankLoan(item: AdminBankLoan) {
    return item.id
      ? request<AdminBankLoan>(`/api/admin/bank-loans/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminBankLoan>("/api/admin/bank-loans", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminBankLoan(id: number) {
    return request<void>(`/api/admin/bank-loans/${id}`, { method: "DELETE" });
  },
  getBanks() {
    return request<Bank[]>("/api/banks", { cache: "no-store" });
  },
  getConsultingEmployees() {
    return request<ConsultingEmployee[]>("/api/consulting-employees", { cache: "no-store" });
  },
  getAccessories() {
    return request<AccessoryCatalogItem[]>("/api/accessories", { cache: "no-store" });
  },
  listAdminAccessories() {
    return request<AdminAccessory[]>("/api/admin/accessories");
  },
  saveAdminAccessory(item: AdminAccessory) {
    return item.id
      ? request<AdminAccessory>(`/api/admin/accessories/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminAccessory>("/api/admin/accessories", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminAccessory(id: number) {
    return request<void>(`/api/admin/accessories/${id}`, { method: "DELETE" });
  },
  uploadAccessoryImage(input: { accessoryId: number; file: File }) {
    const form = new FormData();
    form.append("accessoryId", String(input.accessoryId));
    form.append("file", input.file);
    return request<{ id: number; url: string }>("/api/admin/accessory-images", {
      method: "POST",
      body: form,
    });
  },
  deleteAdminAccessoryImage(id: number) {
    return request<void>(`/api/admin/accessory-images/${id}`, { method: "DELETE" });
  },
  getBankLoan(id: number) {
    return request<AdminBankLoan>(`/api/bank-loans/${id}`);
  },
  listAdminFeeDefinitions() {
    return request<AdminFeeDefinition[]>("/api/admin/fee-definitions");
  },
  saveAdminFeeDefinition(item: AdminFeeDefinition) {
    return item.id
      ? request<AdminFeeDefinition>(`/api/admin/fee-definitions/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminFeeDefinition>("/api/admin/fee-definitions", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminFeeDefinition(id: number) {
    return request<void>(`/api/admin/fee-definitions/${id}`, { method: "DELETE" });
  },
  listAdminVehicles() {
    return request<AdminVehicle[]>("/api/admin/vehicles");
  },
  saveAdminVehicle(item: AdminVehicle) {
    return item.id
      ? request<AdminVehicle>(`/api/admin/vehicles/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminVehicle>("/api/admin/vehicles", { method: "POST", body: JSON.stringify(item) });
  },
  uploadVehicleImage(input: {
    vehicleId: number;
    kind: "hero" | "color";
    colorName?: string;
    file: File;
  }) {
    const form = new FormData();
    form.append("vehicleId", String(input.vehicleId));
    form.append("kind", input.kind);
    if (input.colorName) {
      form.append("colorName", input.colorName);
    }
    form.append("file", input.file);
    return request<{ id: number; url: string }>("/api/admin/vehicle-images", {
      method: "POST",
      body: form,
    });
  },
  deleteAdminVehicleImage(id: number) {
    return request<void>(`/api/admin/vehicle-images/${id}`, { method: "DELETE" });
  },
  deleteAdminVehicle(id: number) {
    return request<void>(`/api/admin/vehicles/${id}`, { method: "DELETE" });
  },
  listAdminFeeRules() {
    return request<AdminFeeRule[]>("/api/admin/fee-rules");
  },
  saveAdminFeeRule(item: AdminFeeRule) {
    return item.id
      ? request<AdminFeeRule>(`/api/admin/fee-rules/${item.id}`, { method: "PUT", body: JSON.stringify(item) })
      : request<AdminFeeRule>("/api/admin/fee-rules", { method: "POST", body: JSON.stringify(item) });
  },
  deleteAdminFeeRule(id: number) {
    return request<void>(`/api/admin/fee-rules/${id}`, { method: "DELETE" });
  },
  translateFromVietnamese(text: string) {
    return request<{ vi: string; en: string; zh: string; ja: string }>("/api/admin/translate", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
  getAdminFeePolicy() {
    return request<AdminFeePolicy>("/api/admin/fee-policy");
  },
  saveAdminFeePolicy(item: AdminFeePolicy) {
    return request<AdminFeePolicy>("/api/admin/fee-policy", { method: "PUT", body: JSON.stringify(item) });
  },
  getAdminDealerPolicy() {
    return request<AdminDealerPolicy>("/api/admin/dealer-policy");
  },
  saveAdminDealerPolicy(item: AdminDealerPolicy) {
    return request<AdminDealerPolicy>("/api/admin/dealer-policy", { method: "PUT", body: JSON.stringify(item) });
  },
  getAdminPlateRegions() {
    return request<AdminPlateRegions>("/api/admin/license-plate-regions");
  },
  saveAdminPlateRegions(item: AdminPlateRegions) {
    return request<AdminPlateRegions>("/api/admin/license-plate-regions", { method: "PUT", body: JSON.stringify(item) });
  },
};
