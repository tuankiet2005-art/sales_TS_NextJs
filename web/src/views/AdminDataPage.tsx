"use client";
import { ChevronDown, ChevronRight, ChevronUp, ImagePlus, Loader2, Plus, Search, X } from "lucide-react";
import { colorPhoto } from "../lib/vehicleColor";
import { normalizeColorPhotos, type ColorPhotoMap } from "../lib/colorPhotos";
import { accessoryImageUrl } from "../lib/accessoryImageUrl";
import { convertImageFileToWebp } from "../lib/convertImageToWebp";
import { vehicleImageUrl } from "../lib/vehicleImageUrl";
import { useEffect, useMemo, useRef, useState } from "react";
import { CenteredModal } from "../components/CenteredModal";
import { CurrencyInput } from "../components/CurrencyInput";
import { BankLoanForm } from "../components/BankLoanForm";
import { Header } from "../components/Header";
import { ListFilterSelect } from "../components/ListFilterSelect";
import { LoadingBlock, TableRowsSkeleton } from "../components/LoadingState";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { api, UnauthorizedError } from "../api/client";
import { useAdminAuth } from "../auth/AdminAuthContext";
import { useI18n } from "../i18n/LanguageContext";
import type { Lang } from "../i18n/translations";
import { getAdminCatalog, invalidateAdminCatalog, type AdminCatalogKey } from "../lib/adminCatalogCache";
import { fillFromVietnamese } from "../lib/fromVietnamese";
import { formatMoneyColumn, isMoneyField } from "../lib/format";
import { accessoryLabel, locationLabel } from "../lib/labels";
import { softIncludes } from "../lib/softSearch";
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
  DealerOffer,
} from "../types";

type CatalogTab =
  | "brands"
  | "categories"
  | "locations"
  | "dealers"
  | "vehicles"
  | "accessories"
  | "feeDefinitions"
  | "feeRules"
  | "banks"
  | "consultingEmployees"
  | "bankLoans";
type Tab = CatalogTab | "feePolicy" | "dealerPolicy" | "plateRegions";

type FieldType = "text" | "number" | "boolean" | "textarea" | "select" | "langs" | "specs" | "colors" | "accessoryImage";

interface PendingImageUploads {
  colorPhotoRows: Record<string, Record<number, File>>;
  accessoryImage?: File | null;
}

const EMPTY_PENDING_IMAGES: PendingImageUploads = { colorPhotoRows: {}, accessoryImage: null };

interface Field {
  key: string;
  type: FieldType;
  options?: string[];
  ref?: "brand" | "category" | "location" | "fee";
  labelKey?: string;
}

const TABS: { id: Tab; labelKey: string }[] = [
  { id: "vehicles", labelKey: "admin.vehicles" },
  { id: "accessories", labelKey: "admin.accessories" },
  { id: "brands", labelKey: "admin.brands" },
  { id: "categories", labelKey: "admin.categories" },
  { id: "locations", labelKey: "admin.locations" },
  { id: "dealers", labelKey: "admin.dealers" },
  { id: "banks", labelKey: "admin.banks" },
  { id: "consultingEmployees", labelKey: "admin.consultingEmployees" },
  { id: "bankLoans", labelKey: "admin.bankLoans" },
  { id: "feePolicy", labelKey: "admin.feePolicy" },
  { id: "dealerPolicy", labelKey: "admin.dealerPolicy" },
  { id: "plateRegions", labelKey: "admin.plateRegions" },
  { id: "feeDefinitions", labelKey: "admin.feeDefinitions" },
  { id: "feeRules", labelKey: "admin.feeRules" },
];

const SIDEBAR_GROUPS: { id: string; labelKey: string; tabs: Tab[] }[] = [
  {
    id: "car",
    labelKey: "admin.group.carResource",
    tabs: [
      "vehicles",
      "accessories",
      "brands",
      "categories",
      "locations",
      "dealers",
      "feePolicy",
      "dealerPolicy",
      "plateRegions",
      "feeDefinitions",
      "feeRules",
    ],
  },
  {
    id: "hr",
    labelKey: "admin.group.humanResources",
    tabs: ["banks", "consultingEmployees", "bankLoans"],
  },
];

const FIELDS: Record<CatalogTab, Field[]> = {
  brands: [
    { key: "name", type: "text" },
    { key: "tagline", type: "text" },
    { key: "imageUrl", type: "text" },
    { key: "ready", type: "boolean" },
  ],
  categories: [
    { key: "name", type: "text" },
    { key: "description", type: "textarea" },
    { key: "typicalSeats", type: "number" },
    { key: "requiresInspection", type: "boolean" },
    { key: "requiresRoadUseFee", type: "boolean" },
    { key: "requiresCompulsoryInsurance", type: "boolean" },
  ],
  locations: [
    { key: "name", type: "langs" },
    { key: "region", type: "select", options: ["NORTH", "CENTRAL", "SOUTH"] },
    { key: "feeZone", type: "select", options: ["SPECIAL", "MAJOR", "STANDARD"] },
    { key: "centrallyGovernedCity", type: "boolean" },
  ],
  dealers: [
    { key: "brandCode", type: "select", ref: "brand" },
    { key: "name", type: "text" },
    { key: "address", type: "text" },
    { key: "active", type: "boolean" },
  ],
  vehicles: [
    { key: "brandCode", type: "select", ref: "brand" },
    { key: "categoryCode", type: "select", ref: "category" },
    { key: "model", type: "text" },
    { key: "name", type: "text" },
    { key: "listPrice", type: "number" },
    { key: "year", type: "number" },
    { key: "seats", type: "number" },
    { key: "vehicleType", type: "select", options: ["Sedan", "SUV", "CUV", "MPV", "Pickup", "Van", "Truck", "ICE"] },
    { key: "fuelType", type: "select", options: ["Gasoline", "Diesel", "Hybrid", "Electric"] },
    { key: "transmission", type: "select", options: ["Automatic", "CVT", "Manual"] },
    { key: "colorPhotos", type: "colors" },
    { key: "specifications", type: "specs" },
    { key: "active", type: "boolean" },
  ],
  accessories: [
    { key: "name", type: "langs" },
    { key: "amount", type: "number" },
    { key: "imageUrl", type: "accessoryImage" },
    { key: "active", type: "boolean" },
  ],
  feeDefinitions: [
    { key: "name", type: "text" },
    { key: "description", type: "textarea" },
    { key: "mandatory", type: "boolean" },
    { key: "active", type: "boolean" },
  ],
  feeRules: [
    { key: "feeDefinitionCode", type: "select", ref: "fee" },
    { key: "categoryCode", type: "select", ref: "category" },
    { key: "locationCode", type: "select", ref: "location" },
    { key: "feeZone", type: "select", options: ["", "SPECIAL", "MAJOR", "STANDARD"] },
    { key: "calculationType", type: "select", options: ["FIXED", "PERCENT_OF_LIST_PRICE", "PERCENT_WITH_BOUNDS"] },
    { key: "fixedAmount", type: "number" },
    { key: "percentage", type: "number" },
    { key: "active", type: "boolean" },
  ],
  banks: [
    { key: "name", type: "text" },
    { key: "active", type: "boolean" },
  ],
  consultingEmployees: [
    { key: "name", type: "text" },
    { key: "phone", type: "text" },
    { key: "active", type: "boolean", labelKey: "admin.field.working" },
    { key: "isDefault", type: "boolean", labelKey: "admin.field.defaultConsultant" },
  ],
  bankLoans: [],
};

const COLUMNS: Record<CatalogTab, string[]> = {
  brands: ["name", "ready"],
  categories: ["name"],
  locations: ["name", "region"],
  dealers: ["brandCode", "name"],
  vehicles: ["model", "name", "brandCode", "categoryCode", "listPrice", "year"],
  accessories: ["name", "amount", "imageUrl", "active"],
  feeDefinitions: ["name", "mandatory"],
  feeRules: ["feeDefinitionCode", "categoryCode", "feeZone", "calculationType", "fixedAmount", "percentage"],
  banks: ["name", "active"],
  consultingEmployees: ["name", "phone", "active", "isDefault"],
  bankLoans: ["bankName", "monthlyInterestRate", "loanTermYears", "fixedRatePeriodYears", "consultingEmployeeName"],
};

type LookupKey = "brands" | "categories" | "locations" | "fees" | "banks" | "consultingEmployees";

const TAB_LOOKUPS: Partial<Record<Tab, LookupKey[]>> = {
  vehicles: ["brands", "categories"],
  dealers: ["brands"],
  feeRules: ["categories", "locations", "fees"],
  plateRegions: ["locations"],
  bankLoans: ["banks", "consultingEmployees"],
};

const TAB_TO_CACHE: Record<CatalogTab, AdminCatalogKey> = {
  brands: "brands",
  categories: "categories",
  locations: "locations",
  dealers: "dealers",
  vehicles: "vehicles",
  accessories: "accessories",
  feeDefinitions: "fees",
  feeRules: "feeRules",
  banks: "banks",
  consultingEmployees: "consultingEmployees",
  bankLoans: "bankLoans",
};

export function AdminDataPage() {
  const { t, lang } = useI18n();
  const { ready, isAdmin } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("vehicles");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ car: true, hr: false });
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [fees, setFees] = useState<AdminFeeDefinition[]>([]);
  const [bankCatalog, setBankCatalog] = useState<AdminBank[]>([]);
  const [employeeCatalog, setEmployeeCatalog] = useState<AdminConsultingEmployee[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [feePolicy, setFeePolicy] = useState<AdminFeePolicy | null>(null);
  const [dealerPolicy, setDealerPolicy] = useState<AdminDealerPolicy | null>(null);
  const [plates, setPlates] = useState<AdminPlateRegions | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogFilters, setCatalogFilters] = useState<Record<string, string>>({});
  const [catalogPage, setCatalogPage] = useState(1);
  const [pendingImages, setPendingImages] = useState<PendingImageUploads>(EMPTY_PENDING_IMAGES);
  const [processingImageKey, setProcessingImageKey] = useState<string | null>(null);
  const policyReady = useRef({ feePolicy: false, dealerPolicy: false, plateRegions: false });

  function syncLookupState(key: AdminCatalogKey, data: unknown[]) {
    switch (key) {
      case "brands":
        setBrands(data as AdminBrand[]);
        break;
      case "categories":
        setCategories(data as AdminCategory[]);
        break;
      case "locations":
        setLocations(data as AdminLocation[]);
        break;
      case "fees":
        setFees(data as AdminFeeDefinition[]);
        break;
      case "banks":
        setBankCatalog(data as AdminBank[]);
        break;
      case "consultingEmployees":
        setEmployeeCatalog(data as AdminConsultingEmployee[]);
        break;
    }
  }

  async function ensureLookups(keys: LookupKey[], force = false) {
    await Promise.all(
      keys.map(async (key) => {
        const data = await getAdminCatalog(key, { force });
        syncLookupState(key, data);
      }),
    );
  }

  function invalidateCatalogTab(nextTab: CatalogTab) {
    invalidateAdminCatalog(TAB_TO_CACHE[nextTab]);
  }

  async function loadCatalogTab(nextTab: CatalogTab, force = false) {
    const cacheKey = TAB_TO_CACHE[nextTab];
    const data = await getAdminCatalog(cacheKey, { force });
    setRows(data as unknown as Record<string, unknown>[]);
    if (cacheKey === "brands" || cacheKey === "categories" || cacheKey === "locations" || cacheKey === "fees") {
      syncLookupState(cacheKey, data);
    }
    if (cacheKey === "banks") {
      syncLookupState("banks", data);
    }
    if (cacheKey === "consultingEmployees") {
      syncLookupState("consultingEmployees", data);
    }
  }

  async function load(nextTab = tab, options?: { force?: boolean }) {
    const force = options?.force ?? false;
    setLoading(true);
    setError(null);
    try {
      await ensureLookups(TAB_LOOKUPS[nextTab] ?? [], force);

      if (nextTab === "feePolicy") {
        if (force || !policyReady.current.feePolicy) {
          setFeePolicy(await api.getAdminFeePolicy());
          policyReady.current.feePolicy = true;
        }
      } else if (nextTab === "dealerPolicy") {
        if (force || !policyReady.current.dealerPolicy) {
          setDealerPolicy(await api.getAdminDealerPolicy());
          policyReady.current.dealerPolicy = true;
        }
      } else if (nextTab === "plateRegions") {
        if (force || !policyReady.current.plateRegions) {
          setPlates(await api.getAdminPlateRegions());
          policyReady.current.plateRegions = true;
        }
      } else {
        await loadCatalogTab(nextTab, force);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return;
      }
      setError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setLoading(false);
    }
  }

  async function reloadAfterMutation() {
    if (isCatalog(tab)) {
      invalidateCatalogTab(tab);
    }
    if (tab === "feePolicy") {
      policyReady.current.feePolicy = false;
    }
    if (tab === "dealerPolicy") {
      policyReady.current.dealerPolicy = false;
    }
    if (tab === "plateRegions") {
      policyReady.current.plateRegions = false;
    }
    await load(tab);
  }

  useEffect(() => {
    void load(tab);
    setDraft(null);
    setPendingImages(EMPTY_PENDING_IMAGES);
    setCatalogQuery("");
    setCatalogFilters({});
    setCatalogPage(1);
  }, [tab]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogQuery, catalogFilters]);

  useEffect(() => {
    const group = SIDEBAR_GROUPS.find((item) => item.tabs.includes(tab));
    if (group) {
      setExpandedGroups((current) => ({ ...current, [group.id]: true }));
    }
  }, [tab]);

  function startNew() {
    const firstBrand = brands[0]?.code ?? "";
    const firstCategory = categories.find((item) => item.code === "PASSENGER_CAR_4")?.code ?? categories[0]?.code ?? "";
    const firstFee = fees[0]?.code ?? "";
    const base: Record<string, unknown> = {
      active: true,
      ready: true,
      mandatory: true,
      market: "Vietnam",
      name: "",
      nameEn: "",
      nameZh: "",
      nameJa: "",
    };
    if (tab === "vehicles") {
      Object.assign(base, {
        brandCode: firstBrand,
        categoryCode: firstCategory,
        vehicleType: "SUV",
        fuelType: "Gasoline",
        transmission: "Automatic",
        specifications: {},
        colorPhotos: {},
        defaultColor: "",
      });
    } else if (tab === "dealers") {
      Object.assign(base, { brandCode: firstBrand });
    } else if (tab === "locations") {
      Object.assign(base, { region: "SOUTH", feeZone: "STANDARD" });
    } else if (tab === "feeRules") {
      Object.assign(base, { feeDefinitionCode: firstFee, calculationType: "FIXED", categoryCode: firstCategory });
    } else if (tab === "bankLoans") {
      Object.assign(base, {
        bankId: bankCatalog[0]?.id ?? 0,
        monthlyInterestRate: 0.65,
        loanTermYears: 5,
        fixedRatePeriodYears: 2,
        consultingEmployeeId:
          employeeCatalog.find((item) => item.isDefault)?.id ?? employeeCatalog[0]?.id ?? 0,
      });
    } else if (tab === "accessories") {
      Object.assign(base, { amount: 0 });
    }
    setDraft(base);
    setPendingImages(EMPTY_PENDING_IMAGES);
  }

  function colorPhotosDraft(): ColorPhotoMap {
    return normalizeColorPhotos(draft?.colorPhotos);
  }

  function setColorPhotosDraft(photos: ColorPhotoMap) {
    if (!draft) {
      return;
    }
    setDraft({ ...draft, colorPhotos: photos });
  }

  function coverImageId(photos: ColorPhotoMap, defaultColor: string): string {
    const preferred = photos[defaultColor]?.find((item) => item.trim());
    if (preferred) {
      return preferred;
    }
    for (const ids of Object.values(photos)) {
      const first = ids.find((item) => item.trim());
      if (first) {
        return first;
      }
    }
    return "";
  }

  async function processColorPhotoPick(input: {
    file: File;
    colorName: string;
    photoIndex: number;
  }) {
    if (!draft) {
      return;
    }
    const colorName = input.colorName.trim();
    if (!colorName) {
      setError(t("admin.colorNameRequired"));
      return;
    }

    const processKey = `color-${colorName}-${input.photoIndex}`;
    setProcessingImageKey(processKey);
    setError(null);
    try {
      const webp = await convertImageFileToWebp(input.file);
      const vehicleId = Number(draft.id);
      const photos = colorPhotosDraft();
      const list = [...(photos[colorName] ?? [])];
      while (list.length <= input.photoIndex) {
        list.push("");
      }

      if (Number.isFinite(vehicleId) && vehicleId > 0) {
        const uploaded = await api.uploadVehicleImage({
          vehicleId,
          kind: "color",
          colorName,
          file: webp,
        });
        list[input.photoIndex] = String(uploaded.id);
        photos[colorName] = list.filter((item) => item.trim());
        const defaultColor = String(draft.defaultColor ?? "");
        setDraft({
          ...draft,
          colorPhotos: photos,
          imageUrl: coverImageId(photos, defaultColor) || draft.imageUrl,
        });
        const nextPending = { ...pendingImages.colorPhotoRows };
        if (nextPending[colorName]) {
          delete nextPending[colorName][input.photoIndex];
          if (Object.keys(nextPending[colorName]).length === 0) {
            delete nextPending[colorName];
          }
        }
        setPendingImages({ ...pendingImages, colorPhotoRows: nextPending });
        return;
      }

      list[input.photoIndex] = "";
      photos[colorName] = list;
      setColorPhotosDraft(photos);
      setPendingImages({
        ...pendingImages,
        colorPhotoRows: {
          ...pendingImages.colorPhotoRows,
          [colorName]: {
            ...(pendingImages.colorPhotoRows[colorName] ?? {}),
            [input.photoIndex]: webp,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.imageConvertFailed"));
    } finally {
      setProcessingImageKey(null);
    }
  }

  async function addColorPhotos(colorName: string, files: FileList | File[]) {
    if (!draft) {
      return;
    }
    const name = colorName.trim();
    if (!name) {
      setError(t("admin.colorNameRequired"));
      return;
    }
    const picked = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (picked.length === 0) {
      return;
    }

    const photos = colorPhotosDraft();
    const list = [...(photos[name] ?? [])];
    const startIndex = list.length;
    list.push(...picked.map(() => ""));
    photos[name] = list;
    setColorPhotosDraft(photos);

    for (const [offset, file] of picked.entries()) {
      await processColorPhotoPick({ file, colorName: name, photoIndex: startIndex + offset });
    }
  }

  async function removeColorPhoto(colorName: string, photoIndex: number) {
    if (!draft) {
      return;
    }
    const photos = colorPhotosDraft();
    const list = [...(photos[colorName] ?? [])];
    const removedId = list[photoIndex]?.trim();
    list.splice(photoIndex, 1);
    if (list.length > 0) {
      photos[colorName] = list;
    } else {
      delete photos[colorName];
    }

    const nextPending = { ...pendingImages.colorPhotoRows };
    const pendingForColor: Record<number, File> = {};
    for (const [key, file] of Object.entries(nextPending[colorName] ?? {})) {
      const index = Number(key);
      if (index < photoIndex) {
        pendingForColor[index] = file;
      } else if (index > photoIndex) {
        pendingForColor[index - 1] = file;
      }
    }
    if (Object.keys(pendingForColor).length > 0) {
      nextPending[colorName] = pendingForColor;
    } else {
      delete nextPending[colorName];
    }
    setPendingImages({ ...pendingImages, colorPhotoRows: nextPending });

    const defaultColor = String(draft.defaultColor ?? "");
    setDraft({
      ...draft,
      colorPhotos: photos,
      imageUrl: coverImageId(photos, defaultColor),
    });

    if (removedId && /^\d+$/.test(removedId)) {
      try {
        await api.deleteAdminVehicleImage(Number(removedId));
      } catch {
        // Ignore delete failures for ids already removed from the vehicle record.
      }
    }
  }

  function moveColorPhoto(colorName: string, photoIndex: number, delta: number) {
    if (!draft) {
      return;
    }
    const photos = colorPhotosDraft();
    const list = [...(photos[colorName] ?? [])];
    const target = photoIndex + delta;
    if (target < 0 || target >= list.length) {
      return;
    }
    [list[photoIndex], list[target]] = [list[target], list[photoIndex]];
    photos[colorName] = list;

    const nextPending = { ...pendingImages.colorPhotoRows };
    const colorPending = { ...(nextPending[colorName] ?? {}) };
    const pendingFile = colorPending[photoIndex];
    const targetPending = colorPending[target];
    if (pendingFile || targetPending) {
      if (pendingFile) {
        colorPending[target] = pendingFile;
      } else {
        delete colorPending[target];
      }
      if (targetPending) {
        colorPending[photoIndex] = targetPending;
      } else {
        delete colorPending[photoIndex];
      }
      nextPending[colorName] = colorPending;
    }
    setPendingImages({ ...pendingImages, colorPhotoRows: nextPending });
    setDraft({ ...draft, colorPhotos: photos });
  }

  async function processAccessoryImagePick(file: File) {
    if (!draft) {
      return;
    }
    setProcessingImageKey("accessory-image");
    setError(null);
    try {
      const webp = await convertImageFileToWebp(file);
      const accessoryId = Number(draft.id);
      if (Number.isFinite(accessoryId) && accessoryId > 0) {
        const uploaded = await api.uploadAccessoryImage({ accessoryId, file: webp });
        setDraft({ ...draft, imageUrl: String(uploaded.id) });
      } else {
        setPendingImages({ ...pendingImages, accessoryImage: webp });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setProcessingImageKey(null);
    }
  }

  async function removeAccessoryImage() {
    if (!draft) {
      return;
    }
    const imageId = String(draft.imageUrl ?? "").trim();
    if (/^\d+$/.test(imageId)) {
      try {
        await api.deleteAdminAccessoryImage(Number(imageId));
      } catch {
        // Ignore if already removed.
      }
    }
    setPendingImages({ ...pendingImages, accessoryImage: null });
    setDraft({ ...draft, imageUrl: "" });
  }

  async function saveDraft() {
    if (!draft || !isCatalog(tab)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (tab === "bankLoans") {
        await api.saveAdminBankLoan(draft as unknown as AdminBankLoan);
        setNotice(t("admin.saved"));
        setDraft(null);
        await reloadAfterMutation();
        return;
      }

      const payload = { ...draft };
      if (tab === "vehicles") {
        const photos = normalizeColorPhotos(payload.colorPhotos);
        const names = Object.keys(photos).map((name) => name.trim()).filter(Boolean);
        payload.availableColors = names.join(", ");
        payload.defaultColor = String(payload.defaultColor || names[0] || "");
        payload.colorPhotos = photos;
        payload.imageUrl = coverImageId(photos, String(payload.defaultColor ?? ""));

        const saved = (await saveFor(tab, payload)) as { id: number };
        const vehicleId = saved.id;
        let colorPhotos = { ...photos };
        let imageUrl = String(payload.imageUrl ?? "");
        let hasImageUpdates = false;

        for (const [colorName, byIndex] of Object.entries(pendingImages.colorPhotoRows)) {
          if (!colorName.trim()) {
            continue;
          }
          const list = [...(colorPhotos[colorName] ?? [])];
          for (const [index, file] of Object.entries(byIndex)) {
            const uploaded = await api.uploadVehicleImage({
              vehicleId,
              kind: "color",
              colorName,
              file,
            });
            const photoIndex = Number(index);
            while (list.length <= photoIndex) {
              list.push("");
            }
            list[photoIndex] = String(uploaded.id);
            hasImageUpdates = true;
          }
          colorPhotos[colorName] = list.filter((item) => item.trim());
        }

        if (hasImageUpdates) {
          imageUrl = coverImageId(colorPhotos, String(payload.defaultColor ?? ""));
          await api.saveAdminVehicle({
            ...(payload as unknown as AdminVehicle),
            id: vehicleId,
            colorPhotos,
            imageUrl,
          });
        }

        setPendingImages(EMPTY_PENDING_IMAGES);
      } else if (tab === "accessories") {
        const saved = (await saveFor(tab, payload)) as AdminAccessory;
        const accessoryId = saved.id;
        if (accessoryId && pendingImages.accessoryImage) {
          const uploaded = await api.uploadAccessoryImage({
            accessoryId,
            file: pendingImages.accessoryImage,
          });
          await api.saveAdminAccessory({ ...saved, imageUrl: String(uploaded.id) });
        }
        setPendingImages(EMPTY_PENDING_IMAGES);
      } else {
        await saveFor(tab, payload);
      }
      setDraft(null);
      setNotice(t("admin.saved"));
      await reloadAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apiError"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!isCatalog(tab) || !window.confirm(t("admin.confirmDelete"))) {
      return;
    }
    try {
      await deleteFor(tab, id);
      setNotice(t("admin.deleted"));
      await reloadAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apiError"));
    }
  }

  function openRowEdit(row: Record<string, unknown>) {
    if (draft) {
      return;
    }
    setPendingImages(EMPTY_PENDING_IMAGES);
    setDraft(prepareDraft(row));
  }

  function optionLabel(value: string, field: Field) {
    if (!value) {
      return t("admin.any");
    }
    if (field.ref === "brand") {
      return brands.find((item) => item.code === value)?.name ?? value;
    }
    if (field.ref === "category") {
      const key = `category.${value}`;
      return t(key) === key ? categories.find((item) => item.code === value)?.name ?? value : t(key);
    }
    if (field.ref === "location") {
      const location = locations.find((item) => item.code === value);
      return locationName(location, lang) || value;
    }
    if (field.ref === "fee") {
      const key = `fee.${value}`;
      return t(key) === key ? fees.find((item) => item.code === value)?.name ?? value : t(key);
    }
    const key = `admin.opt.${value}`;
    return t(key) === key ? value : t(key);
  }

  function fieldOptions(field: Field) {
    if (field.ref === "brand") {
      return brands.map((item) => item.code ?? "").filter(Boolean);
    }
    if (field.ref === "category") {
      return ["", ...categories.map((item) => item.code)];
    }
    if (field.ref === "location") {
      return ["", ...locations.map((item) => item.code)];
    }
    if (field.ref === "fee") {
      return fees.map((item) => item.code).filter((code) => code !== "LICENSE_PLATE" && code !== "REGISTRATION_TAX");
    }
    return field.options ?? [];
  }

  function displayCell(column: string, row: Record<string, unknown>) {
    if (column === "name") {
      return localizedName(tab, row, lang, t);
    }
    if (column === "imageUrl" && tab === "accessories") {
      const preview = accessoryImageUrl(String(row.imageUrl ?? ""));
      if (!preview) {
        return "—";
      }
      return (
        <img src={preview} alt="" className="h-10 w-16 rounded-lg object-cover" />
      );
    }
    const value = row[column];
    if (column === "brandCode") {
      return optionLabel(String(value ?? ""), { key: column, type: "select", ref: "brand" });
    }
    if (column === "categoryCode") {
      return optionLabel(String(value ?? ""), { key: column, type: "select", ref: "category" });
    }
    if (column === "feeDefinitionCode") {
      return optionLabel(String(value ?? ""), { key: column, type: "select", ref: "fee" });
    }
    if (column === "region" || column === "feeZone" || column === "calculationType") {
      return optionLabel(String(value ?? ""), { key: column, type: "select" });
    }
    if (column === "monthlyInterestRate") {
      return value == null || value === "" ? "—" : `${value}${t("bankLoan.unit.monthlyRate")}`;
    }
    if (typeof value === "boolean") {
      if (tab === "consultingEmployees" && column === "active") {
        return value ? t("admin.field.working") : t("admin.field.notWorking");
      }
      if (tab === "consultingEmployees" && column === "isDefault") {
        return value ? t("admin.field.defaultConsultant") : "—";
      }
      return value ? t("admin.yes") : t("admin.no");
    }
    const money = formatMoneyColumn(column, value);
    if (money) {
      return money;
    }
    if (value == null || value === "") {
      return "—";
    }
    return String(value);
  }

  const visibleRows = useMemo(() => {
    if (!isCatalog(tab)) {
      return rows;
    }
    return rows.filter((row) => {
      if (
        tab === "vehicles" &&
        ((catalogFilters.brandCode && String(row.brandCode ?? "") !== catalogFilters.brandCode) ||
          (catalogFilters.categoryCode && String(row.categoryCode ?? "") !== catalogFilters.categoryCode) ||
          (catalogFilters.model && String(row.model ?? "") !== catalogFilters.model) ||
          (catalogFilters.vehicleType && String(row.vehicleType ?? "") !== catalogFilters.vehicleType) ||
          (catalogFilters.active === "true" && row.active !== true) ||
          (catalogFilters.active === "false" && row.active !== false))
      ) {
        return false;
      }
      if (
        tab === "locations" &&
        ((catalogFilters.region && String(row.region ?? "") !== catalogFilters.region) ||
          (catalogFilters.feeZone && String(row.feeZone ?? "") !== catalogFilters.feeZone))
      ) {
        return false;
      }
      if (tab === "dealers" && catalogFilters.brandCode && String(row.brandCode ?? "") !== catalogFilters.brandCode) {
        return false;
      }
      if (tab === "feeRules" && catalogFilters.categoryCode && String(row.categoryCode ?? "") !== catalogFilters.categoryCode) {
        return false;
      }
      return softIncludes(
        catalogQuery,
        ...COLUMNS[tab].map((column) => displayCell(column, row)),
        row.name,
        row.nameEn,
        row.nameZh,
        row.nameJa,
        row.model,
        row.code,
        row.brandCode
      );
    });
  }, [rows, catalogQuery, catalogFilters, tab, lang]);

  const paginatedRows = useMemo(() => {
    const start = (catalogPage - 1) * DEFAULT_PAGE_SIZE;
    return visibleRows.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [visibleRows, catalogPage]);

  const vehicleModelFilterOptions = useMemo(() => {
    if (tab !== "vehicles") {
      return [];
    }
    const models = new Set<string>();
    for (const row of rows) {
      if (typeof row.model === "string" && row.model.trim()) {
        models.add(row.model);
      }
    }
    return [...models].sort((a, b) => a.localeCompare(b)).map((model) => ({ value: model, label: model }));
  }, [rows, tab]);

  function startVehicleVariant(mode: "year" | "trim") {
    if (!draft || tab !== "vehicles") {
      return;
    }
    const nextYear = mode === "year" ? Number(draft.year ?? new Date().getFullYear()) + 1 : draft.year;
    setPendingImages(EMPTY_PENDING_IMAGES);
    setDraft({
      ...draft,
      id: undefined,
      year: nextYear,
      name: mode === "trim" ? "" : draft.name,
      listPrice: mode === "year" ? "" : draft.listPrice,
      colorPhotos: mode === "year" ? {} : draft.colorPhotos,
      imageUrl: mode === "year" ? "" : draft.imageUrl,
    });
  }

  if (ready && !isAdmin) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-page px-4 py-10 sm:px-6">
          <p className="text-sm text-ink/70">{t("admin.forbidden")}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-page px-4 py-6 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-copper">{t("admin.kicker")}</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">{t("admin.title")}</h1>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,14rem)_1fr] lg:items-stretch">
          <aside className="flex h-full flex-col rounded-2xl border border-ink/8 bg-white shadow-card p-3">
            <nav className="flex-1" aria-label={t("admin.kicker")}>
              {SIDEBAR_GROUPS.map((group) => {
                const expanded = expandedGroups[group.id];
                return (
                  <div key={group.id} className="mb-2 last:mb-0">
                    <button
                      type="button"
                      onClick={() => setExpandedGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-copper hover:bg-mist/60"
                      aria-expanded={expanded}
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-copper/70" aria-hidden />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-copper/70" aria-hidden />
                      )}
                      {t(group.labelKey)}
                    </button>
                    {expanded ? (
                      <div className="ml-2 space-y-0.5 border-l border-ink/10 pl-2 pb-1">
                        {group.tabs.map((tabId) => {
                          const tabDef = TABS.find((item) => item.id === tabId);
                          if (!tabDef) {
                            return null;
                          }
                          return (
                            <button
                              key={tabId}
                              type="button"
                              onClick={() => setTab(tabId)}
                              className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm ${
                                tab === tabId
                                  ? "bg-ink font-medium text-paper"
                                  : "font-normal text-ink/65 hover:bg-mist/70 hover:text-ink"
                              }`}
                            >
                              {t(tabDef.labelKey)}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </aside>

          <div className="flex h-full min-w-0 flex-col rounded-2xl border border-ink/8 bg-white shadow-card overflow-hidden">
        {error && <p className="px-4 pt-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="px-4 pt-3 text-sm text-forest">{notice}</p>}

        {tab === "feePolicy" &&
          (loading && !feePolicy ? (
            <div className="p-4 sm:p-5">
              <LoadingBlock message={t("loadingCatalog")} />
            </div>
          ) : feePolicy ? (
            <FeePolicyForm
              value={feePolicy}
              saving={saving}
              t={t}
              onChange={setFeePolicy}
              onSave={async () => {
                setSaving(true);
                try {
                  setFeePolicy(await api.saveAdminFeePolicy(feePolicy));
                  setNotice(t("admin.saved"));
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("apiError"));
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : null)}

        {tab === "dealerPolicy" &&
          (loading && !dealerPolicy ? (
            <div className="p-4 sm:p-5">
              <LoadingBlock message={t("loadingCatalog")} />
            </div>
          ) : dealerPolicy ? (
            <DealerPolicyForm
              value={dealerPolicy}
              saving={saving}
              t={t}
              onChange={setDealerPolicy}
              onSave={async () => {
                setSaving(true);
                try {
                  setDealerPolicy(await api.saveAdminDealerPolicy(dealerPolicy));
                  setNotice(t("admin.saved"));
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("apiError"));
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : null)}

        {tab === "plateRegions" &&
          (loading && !plates ? (
            <div className="p-4 sm:p-5">
              <LoadingBlock message={t("loadingCatalog")} />
            </div>
          ) : plates ? (
            <PlateRegionsForm
              value={plates}
              locations={locations}
              lang={lang}
              saving={saving}
              t={t}
              onChange={setPlates}
              onSave={async () => {
                setSaving(true);
                try {
                  setPlates(await api.saveAdminPlateRegions(plates));
                  setNotice(t("admin.saved"));
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("apiError"));
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : null)}

        {isCatalog(tab) && (
          <>
            <div className="flex flex-1 flex-col min-h-0 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 px-4 py-3">
                <p className="text-sm font-semibold">
                  {t(TABS.find((item) => item.id === tab)?.labelKey ?? "")} · {visibleRows.length}
                </p>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="relative min-w-0 flex-1 sm:flex-none">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                    <input
                      value={catalogQuery}
                      onChange={(event) => setCatalogQuery(event.target.value)}
                      placeholder={t("admin.search")}
                      className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-paper pl-9 pr-3 text-sm sm:w-56"
                    />
                  </label>
                  {tab === "vehicles" && (
                    <>
                      <ListFilterSelect
                        label={t("filterBrand")}
                        value={catalogFilters.brandCode ?? ""}
                        onChange={(value) => setCatalogFilters((current) => ({ ...current, brandCode: value }))}
                        options={brands.map((item) => ({ value: item.code, label: item.name || item.code }))}
                        allLabel={t("filterAll")}
                      />
                      <ListFilterSelect
                        label={t("filterCategory")}
                        value={catalogFilters.categoryCode ?? ""}
                        onChange={(value) => setCatalogFilters((current) => ({ ...current, categoryCode: value }))}
                        options={categories.map((item) => ({
                          value: item.code,
                          label: optionLabel(item.code, { key: "categoryCode", type: "select", ref: "category" }),
                        }))}
                        allLabel={t("filterAll")}
                      />
                      <ListFilterSelect
                        label={t("filterModel")}
                        value={catalogFilters.model ?? ""}
                        onChange={(value) => setCatalogFilters((current) => ({ ...current, model: value }))}
                        options={vehicleModelFilterOptions}
                        allLabel={t("filterAll")}
                      />
                      <ListFilterSelect
                        label={t("filterBodyStyle")}
                        value={catalogFilters.vehicleType ?? ""}
                        onChange={(value) => setCatalogFilters((current) => ({ ...current, vehicleType: value }))}
                        options={(FIELDS.vehicles.find((field) => field.key === "vehicleType")?.options ?? []).map((option) => ({
                          value: option,
                          label: optionLabel(option, { key: "vehicleType", type: "select" }),
                        }))}
                        allLabel={t("filterAll")}
                      />
                      <ListFilterSelect
                        label={t("filterActive")}
                        value={catalogFilters.active ?? ""}
                        onChange={(value) => setCatalogFilters((current) => ({ ...current, active: value }))}
                        options={[
                          { value: "true", label: t("filterActiveYes") },
                          { value: "false", label: t("filterActiveNo") },
                        ]}
                        allLabel={t("filterAll")}
                      />
                    </>
                  )}
                  {tab === "locations" && (
                    <>
                      <ListFilterSelect
                        label={t("admin.field.region")}
                        value={catalogFilters.region ?? ""}
                        onChange={(value) => setCatalogFilters((current) => ({ ...current, region: value }))}
                        options={FIELDS.locations.find((field) => field.key === "region")?.options?.map((option) => ({
                          value: option,
                          label: t(`admin.opt.${option}`),
                        })) ?? []}
                        allLabel={t("filterAll")}
                      />
                      <ListFilterSelect
                        label={t("admin.field.feeZone")}
                        value={catalogFilters.feeZone ?? ""}
                        onChange={(value) => setCatalogFilters((current) => ({ ...current, feeZone: value }))}
                        options={FIELDS.locations.find((field) => field.key === "feeZone")?.options?.map((option) => ({
                          value: option,
                          label: t(`admin.opt.${option}`),
                        })) ?? []}
                        allLabel={t("filterAll")}
                      />
                    </>
                  )}
                  {tab === "dealers" && (
                    <ListFilterSelect
                      label={t("filterBrand")}
                      value={catalogFilters.brandCode ?? ""}
                      onChange={(value) => setCatalogFilters((current) => ({ ...current, brandCode: value }))}
                      options={brands.map((item) => ({ value: item.code, label: item.name || item.code }))}
                      allLabel={t("filterAll")}
                    />
                  )}
                  {tab === "feeRules" && (
                    <ListFilterSelect
                      label={t("filterCategory")}
                      value={catalogFilters.categoryCode ?? ""}
                      onChange={(value) => setCatalogFilters((current) => ({ ...current, categoryCode: value }))}
                      options={categories.map((item) => ({
                        value: item.code,
                        label: optionLabel(item.code, { key: "categoryCode", type: "select", ref: "category" }),
                      }))}
                      allLabel={t("filterAll")}
                    />
                  )}
                  <button type="button" onClick={startNew} className="inline-flex h-10 shrink-0 items-center gap-1.5 text-sm font-semibold text-copper">
                    <Plus className="h-4 w-4" />
                    {t("admin.new")}
                  </button>
                </div>
              </div>
              {loading ? (
                <>
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-paper text-[11px] uppercase tracking-wide text-ink/50">
                      <tr>
                        {COLUMNS[tab].map((column) => (
                          <th key={column} className="px-3 py-2 font-medium">
                            {columnLabel(tab, column, t)}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-medium">{t("admin.actions")}</th>
                      </tr>
                    </thead>
                    <TableRowsSkeleton rows={DEFAULT_PAGE_SIZE} columns={COLUMNS[tab].length + 1} />
                  </table>
                  <div className="border-t border-ink/8 px-4 py-4">
                    <LoadingBlock message={t("loadingCatalog")} size="sm" />
                  </div>
                </>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-paper text-[11px] uppercase tracking-wide text-ink/50">
                    <tr>
                      {COLUMNS[tab].map((column) => (
                        <th key={column} className="px-3 py-2 font-medium">
                          {columnLabel(tab, column, t)}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium">{t("admin.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr
                        key={String(row.id)}
                        className="list-data-row motion-interactive border-t border-ink/6"
                        onDoubleClick={() => openRowEdit(row)}
                      >
                        {COLUMNS[tab].map((column) => (
                          <td key={column} className="px-3 py-2">
                            {displayCell(column, row)}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openRowEdit(row)}
                              onDoubleClick={(event) => event.stopPropagation()}
                              className="inline-flex h-8 items-center rounded-lg border border-ink/10 bg-white px-2.5 text-xs font-semibold text-ink hover:border-copper hover:text-copper"
                            >
                              {t("admin.edit")}
                            </button>
                            {typeof row.id === "number" && (
                              <button
                                type="button"
                                onClick={() => void remove(row.id as number)}
                                onDoubleClick={(event) => event.stopPropagation()}
                                className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                {t("admin.delete")}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!loading ? (
                <div className="px-4 pb-4">
                  <Pagination
                    page={catalogPage}
                    total={visibleRows.length}
                    pageSize={DEFAULT_PAGE_SIZE}
                    onPageChange={setCatalogPage}
                  />
                </div>
              ) : null}
            </div>

            {draft && (
              <CenteredModal
                onClose={() => {
                  setDraft(null);
                  setPendingImages(EMPTY_PENDING_IMAGES);
                }}
                panelClassName="rounded-2xl border border-ink/8 bg-white p-4 shadow-card sm:max-w-3xl sm:p-5"
              >
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveDraft();
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{draft.id ? t("admin.edit") : t("admin.new")}</p>
                    <button type="button" onClick={() => {
                      setDraft(null);
                      setPendingImages(EMPTY_PENDING_IMAGES);
                    }} className="text-ink/50 hover:text-ink">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="form-fields-row form-fields-row--auto mt-3 pr-1">
                    {tab === "bankLoans" ? (
                      <div className="col-span-full">
                        <BankLoanForm
                          value={draft as unknown as AdminBankLoan}
                          banks={bankCatalog}
                          employees={employeeCatalog}
                          saving={saving}
                          onChange={(next) => setDraft(next as unknown as Record<string, unknown>)}
                          onSubmit={() => saveDraft()}
                          onCancel={() => setDraft(null)}
                        />
                      </div>
                    ) : (
                      FIELDS[tab].map((field) => (
                        <FieldInput
                          key={field.key}
                          field={field}
                          draft={draft}
                          setDraft={setDraft}
                          t={t}
                          options={fieldOptions(field)}
                          optionLabel={(value) => optionLabel(value, field)}
                          pendingImages={pendingImages}
                          setPendingImages={setPendingImages}
                          processingImageKey={processingImageKey}
                          onAddColorPhotos={addColorPhotos}
                          onRemoveColorPhoto={removeColorPhoto}
                          onMoveColorPhoto={moveColorPhoto}
                          onAccessoryImagePick={(file) => void processAccessoryImagePick(file)}
                          onRemoveAccessoryImage={() => void removeAccessoryImage()}
                        />
                      ))
                    )}
                  </div>
                  {tab !== "bankLoans" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tab === "vehicles" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startVehicleVariant("year")}
                          className="h-10 rounded-lg border border-ink/10 px-4 text-sm font-semibold text-ink hover:border-copper hover:text-copper"
                        >
                          {t("admin.addModelYear")}
                        </button>
                        <button
                          type="button"
                          onClick={() => startVehicleVariant("trim")}
                          className="h-10 rounded-lg border border-ink/10 px-4 text-sm font-semibold text-ink hover:border-copper hover:text-copper"
                        >
                          {t("admin.addModelTrim")}
                        </button>
                      </>
                    ) : null}
                    <button type="submit" disabled={saving} className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-60">
                      {saving ? t("admin.saving") : t("admin.save")}
                    </button>
                    <button type="button" onClick={() => {
                      setDraft(null);
                      setPendingImages(EMPTY_PENDING_IMAGES);
                    }} className="h-10 rounded-lg px-4 text-sm text-ink/60">
                      {t("admin.cancel")}
                    </button>
                  </div>
                  ) : null}
                </form>
              </CenteredModal>
            )}
          </>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

function LangFields({
  draft,
  setDraft,
  t,
}: {
  draft: Record<string, unknown>;
  setDraft: (next: Record<string, unknown>) => void;
  t: (key: string) => string;
}) {
  const [translating, setTranslating] = useState(false);

  async function translateFromVietnamese() {
    const vietnamese = String(draft.name ?? "").trim();
    if (!vietnamese) {
      return;
    }
    setTranslating(true);
    try {
      const filled = await fillFromVietnamese(vietnamese, {
        vi: vietnamese,
        en: String(draft.nameEn ?? ""),
        zh: String(draft.nameZh ?? ""),
        ja: String(draft.nameJa ?? ""),
      });
      setDraft({ ...draft, name: filled.vi, nameEn: filled.en, nameZh: filled.zh, nameJa: filled.ja });
    } catch {
      setDraft({
        ...draft,
        nameEn: String(draft.nameEn || vietnamese),
        nameZh: String(draft.nameZh || vietnamese),
        nameJa: String(draft.nameJa || vietnamese),
      });
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="col-span-full form-fields-row form-fields-row--auto">
      <label className="block text-xs font-medium text-ink/70 col-span-full">
        {t("admin.field.name_vi")}
        <input
          value={String(draft.name ?? "")}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          onBlur={() => void translateFromVietnamese()}
          className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
        />
        <span className="mt-1 block text-[11px] font-normal text-ink/45">
          {translating ? t("admin.translating") : t("admin.viHint")}
        </span>
      </label>
      {(["en", "zh", "ja"] as Lang[]).map((code) => {
        const key = `name${code[0].toUpperCase()}${code.slice(1)}`;
        return (
          <label key={code} className="block text-xs font-medium text-ink/70">
            {t(`admin.field.name_${code}`)}
            <input
              value={String(draft[key] ?? "")}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
            />
          </label>
        );
      })}
    </div>
  );
}

function FieldInput({
  field,
  draft,
  setDraft,
  t,
  options,
  optionLabel,
  pendingImages,
  setPendingImages,
  processingImageKey,
  onAddColorPhotos,
  onRemoveColorPhoto,
  onMoveColorPhoto,
  onAccessoryImagePick,
  onRemoveAccessoryImage,
}: {
  field: Field;
  draft: Record<string, unknown>;
  setDraft: (next: Record<string, unknown>) => void;
  t: (key: string) => string;
  options: string[];
  optionLabel: (value: string) => string;
  pendingImages: PendingImageUploads;
  setPendingImages: (next: PendingImageUploads) => void;
  processingImageKey: string | null;
  onAddColorPhotos: (colorName: string, files: FileList | File[]) => Promise<void>;
  onRemoveColorPhoto: (colorName: string, photoIndex: number) => Promise<void>;
  onMoveColorPhoto: (colorName: string, photoIndex: number, delta: number) => void;
  onAccessoryImagePick: (file: File) => void;
  onRemoveAccessoryImage: () => void;
}) {
  if (field.type === "langs") {
    return (
      <LangFields
        draft={draft}
        setDraft={setDraft}
        t={t}
      />
    );
  }

  if (field.type === "accessoryImage") {
    const pendingFile = pendingImages.accessoryImage;
    const previewUrl = pendingFile
      ? URL.createObjectURL(pendingFile)
      : accessoryImageUrl(String(draft.imageUrl ?? ""));
    const isProcessing = processingImageKey === "accessory-image";
    return (
      <div className="col-span-full">
        <p className="text-xs font-medium text-ink/70">{t("admin.field.accessoryPhoto")}</p>
        <p className="mt-1 text-[11px] text-ink/45">{t("admin.accessoryImageHint")}</p>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-ink/10 bg-mist">
              {isProcessing ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-mist/90">
                  <Loader2 className="h-5 w-5 animate-spin text-copper" aria-hidden />
                </div>
              ) : null}
              <img src={previewUrl} alt="" className="aspect-[16/10] w-40 object-cover" />
            </div>
          ) : (
            <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-ink/15 bg-mist text-xs text-ink/45">
              {t("admin.noImage")}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label
              className={`inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-copper/40 px-3 text-sm font-semibold text-copper ${
                isProcessing ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-copper/5"
              }`}
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              <span>{t("admin.uploadImage")}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={isProcessing}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    onAccessoryImagePick(file);
                  }
                }}
              />
            </label>
            {(previewUrl || pendingFile) && (
              <button
                type="button"
                onClick={onRemoveAccessoryImage}
                className="text-sm font-semibold text-red-700 hover:text-red-800"
              >
                {t("admin.remove")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (field.type === "colors") {
    const photos = normalizeColorPhotos(draft.colorPhotos);
    const rows: [string, string[]][] =
      Object.keys(photos).length > 0 ? Object.entries(photos) : [["", []]];
    return (
      <div className="col-span-full">
        <p className="text-xs font-medium text-ink/70">{t("admin.field.colorPhotos")}</p>
        <p className="mt-1 text-[11px] text-ink/45">{t("admin.colorPhotosHint")}</p>
        <div className="mt-3 space-y-4">
          {rows.map(([name, imageIds], index) => {
            const colorName = name.trim();
            const photoList = imageIds.length > 0 ? imageIds : [""];
            return (
              <div key={`${name}-${index}`} className="rounded-2xl border border-ink/10 bg-paper/70 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={name}
                    placeholder={t("admin.colorName")}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      const next = { ...photos };
                      delete next[name];
                      if (nextName.trim() || imageIds.length > 0) {
                        next[nextName] = imageIds;
                      }
                      setDraft({
                        ...draft,
                        colorPhotos: next,
                        defaultColor: draft.defaultColor === name ? nextName : draft.defaultColor,
                      });
                    }}
                    className="h-10 min-w-[8rem] flex-1 rounded-lg border border-ink/10 bg-paper px-3 text-sm"
                  />
                  <label
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-copper/40 px-3 text-sm font-semibold text-copper ${
                      !colorName ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-copper/5"
                    }`}
                  >
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    <span>{t("admin.addColorPhotos")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={!colorName}
                      onChange={(event) => {
                        const files = event.target.files;
                        event.target.value = "";
                        if (!files?.length || !colorName) {
                          return;
                        }
                        void onAddColorPhotos(colorName, files);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-sm text-red-700"
                    onClick={() => {
                      const next = { ...photos };
                      delete next[name];
                      const nextPending = { ...pendingImages.colorPhotoRows };
                      delete nextPending[name];
                      setPendingImages({ ...pendingImages, colorPhotoRows: nextPending });
                      setDraft({ ...draft, colorPhotos: next, defaultColor: draft.defaultColor === name ? "" : draft.defaultColor });
                    }}
                  >
                    {t("admin.removeColor")}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {photoList.map((imageId, photoIndex) => {
                    const pendingFile = pendingImages.colorPhotoRows[name]?.[photoIndex];
                    const previewUrl = pendingFile
                      ? URL.createObjectURL(pendingFile)
                      : vehicleImageUrl(imageId) || colorPhoto(name, photos);
                    const isProcessing = processingImageKey === `color-${name}-${photoIndex}`;
                    return (
                      <div
                        key={`${name}-${photoIndex}-${imageId || "pending"}`}
                        className="overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-card"
                      >
                        <div className="relative aspect-4/3 bg-mist">
                          {isProcessing ? (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-mist/90">
                              <Loader2 className="h-5 w-5 animate-spin text-copper" aria-hidden />
                            </div>
                          ) : null}
                          <img src={previewUrl} alt="" className="h-full w-full object-contain" />
                          {photoIndex === 0 ? (
                            <span className="absolute left-2 top-2 rounded-full bg-copper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                              {t("admin.galleryCover")}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-1 border-t border-ink/8 px-2 py-1.5">
                          <span className="text-[11px] font-medium text-ink/50">{photoIndex + 1}</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={photoIndex === 0}
                              aria-label={t("admin.moveUp")}
                              onClick={() => onMoveColorPhoto(name, photoIndex, -1)}
                              className="rounded-md p-1 text-ink/55 hover:bg-ink/5 disabled:opacity-30"
                            >
                              <ChevronUp className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              disabled={photoIndex === photoList.length - 1}
                              aria-label={t("admin.moveDown")}
                              onClick={() => onMoveColorPhoto(name, photoIndex, 1)}
                              className="rounded-md p-1 text-ink/55 hover:bg-ink/5 disabled:opacity-30"
                            >
                              <ChevronDown className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onRemoveColorPhoto(name, photoIndex)}
                              className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                            >
                              {t("admin.remove")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-copper"
          onClick={() => setDraft({ ...draft, colorPhotos: { ...photos, "": [] } })}
        >
          {t("admin.addColor")}
        </button>
        <label className="mt-3 block text-xs font-medium text-ink/70">
          {t("admin.field.defaultColor")}
          <select
            value={String(draft.defaultColor ?? "")}
            onChange={(event) => setDraft({ ...draft, defaultColor: event.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
          >
            {rows.filter(([colorName]) => colorName).map(([colorName]) => (
              <option key={colorName} value={colorName}>
                {colorName}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  if (field.type === "specs") {
    const specs = (draft.specifications as Record<string, string>) ?? {};
    const rows = Object.entries(specs);
    if (rows.length === 0) {
      rows.push(["", ""]);
    }
    return (
      <div className="col-span-full">
        <p className="text-xs font-medium text-ink/70">{t("admin.field.specifications")}</p>
        <div className="mt-1 space-y-2">
          {rows.map(([key, value], index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <input
                value={key}
                placeholder={t("admin.specName")}
                onChange={(event) => {
                  const next = Object.fromEntries(rows.map((row, rowIndex) => (rowIndex === index ? [event.target.value, row[1]] : row)));
                  setDraft({ ...draft, specifications: next });
                }}
                className="h-10 rounded-lg border border-ink/10 bg-paper px-3 text-sm"
              />
              <input
                value={value}
                placeholder={t("admin.specValue")}
                onChange={(event) => {
                  const next = Object.fromEntries(rows.map((row, rowIndex) => (rowIndex === index ? [row[0], event.target.value] : row)));
                  setDraft({ ...draft, specifications: next });
                }}
                className="h-10 rounded-lg border border-ink/10 bg-paper px-3 text-sm"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-copper"
          onClick={() => setDraft({ ...draft, specifications: { ...specs, "": "" } })}
        >
          {t("admin.addSpec")}
        </button>
      </div>
    );
  }

  return (
    <label
      className={`flex h-full flex-col text-xs font-medium text-ink/70${
        field.type === "boolean" ? " justify-end" : ""
      }${field.type === "textarea" ? " col-span-full" : ""}`}
    >
      {field.type === "boolean" ? (
        <span className="flex h-10 items-center gap-2">
          {t(field.labelKey ?? `admin.field.${field.key}`)}
          <input
            type="checkbox"
            checked={Boolean(draft[field.key])}
            onChange={(event) => setDraft({ ...draft, [field.key]: event.target.checked })}
            className="h-4 w-4 shrink-0 accent-copper"
          />
        </span>
      ) : (
        <>
      {t(field.labelKey ?? `admin.field.${field.key}`)}
      {field.type === "select" ? (
        <select
          value={String(draft[field.key] ?? "")}
          onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value || null })}
          className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
        >
          {options.map((option) => (
            <option key={option || "any"} value={option}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={String(draft[field.key] ?? "")}
          onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm"
        />
      ) : field.type === "number" && isMoneyField(field.key) ? (
        <CurrencyInput
          value={draft[field.key] == null ? undefined : Number(draft[field.key])}
          onChange={(next) => setDraft({ ...draft, [field.key]: next ?? null })}
          className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
        />
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={draft[field.key] == null ? "" : String(draft[field.key])}
          onChange={(event) =>
            setDraft({
              ...draft,
              [field.key]: field.type === "number" ? (event.target.value === "" ? null : Number(event.target.value)) : event.target.value,
            })
          }
          className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
        />
      )}
        </>
      )}
    </label>
  );
}

function FeePolicyForm({
  value,
  onChange,
  onSave,
  saving,
  t,
}: {
  value: AdminFeePolicy;
  onChange: (next: AdminFeePolicy) => void;
  onSave: () => void;
  saving: boolean;
  t: (key: string) => string;
}) {
  return (
    <section className="p-4 sm:p-5">
      <div className="form-fields-row form-fields-row--auto">
        <NumberField label={t("admin.field.registrationTaxPercent")} value={value.registrationTaxPercent} onChange={(next) => onChange({ ...value, registrationTaxPercent: next })} />
        <NumberField label={t("admin.field.registrationTaxCommercialPercent")} value={value.registrationTaxCommercialPercent} onChange={(next) => onChange({ ...value, registrationTaxCommercialPercent: next })} />
      </div>
      <div className="mt-4">
        <SaveButton saving={saving} t={t} onClick={onSave} />
      </div>
    </section>
  );
}

function DealerPolicyForm({
  value,
  onChange,
  onSave,
  saving,
  t,
}: {
  value: AdminDealerPolicy;
  onChange: (next: AdminDealerPolicy) => void;
  onSave: () => void;
  saving: boolean;
  t: (key: string) => string;
}) {
  function updateOffer(index: number, next: DealerOffer) {
    const offers = value.offers.map((item, itemIndex) => (itemIndex === index ? next : item));
    onChange({ ...value, offers });
  }

  return (
    <section className="space-y-4 p-4 sm:p-5">
      <div className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card">
        <div className="form-fields-row form-fields-row--auto">
          <NumberField label={t("admin.field.privateDiscountPercent")} value={value.privateDiscountPercent} onChange={(next) => onChange({ ...value, privateDiscountPercent: next })} />
          <NumberField label={t("admin.field.commercialDiscountPercent")} value={value.commercialDiscountPercent} onChange={(next) => onChange({ ...value, commercialDiscountPercent: next })} />
        </div>
      </div>
      {value.offers.map((offer, index) => (
        <div key={offer.id || index} className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("admin.offer")} {index + 1}</p>
            <button type="button" onClick={() => onChange({ ...value, offers: value.offers.filter((_, itemIndex) => itemIndex !== index) })} className="text-sm text-red-700">
              {t("admin.remove")}
            </button>
          </div>
          <label className="mt-3 block text-xs font-medium text-ink/70">
            {t("admin.field.offerKind")}
            <select
              value={offer.kind}
              onChange={(event) => updateOffer(index, { ...offer, kind: event.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
            >
              {["FORGO_FOR_CREDIT", "EXTRA_PERCENT", "PRICE_CREDIT"].map((kind) => (
                <option key={kind} value={kind}>
                  {t(`admin.opt.${kind}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="form-fields-row form-fields-row--auto mt-3">
            <NumberField currency label={t("admin.field.amount")} value={offer.amount ?? 0} onChange={(next) => updateOffer(index, { ...offer, amount: next })} />
            <NumberField label={t("admin.field.percent")} value={offer.percent ?? 0} onChange={(next) => updateOffer(index, { ...offer, percent: next })} />
          </div>
          <OfferLangFields
            offer={offer}
            t={t}
            onChange={(next) => updateOffer(index, next)}
          />
        </div>
      ))}
      <div className="flex flex-col items-start gap-5 pt-2">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-copper"
          onClick={() =>
            onChange({
              ...value,
              offers: [
                ...value.offers,
                {
                  id: "",
                  kind: "FORGO_FOR_CREDIT",
                  amount: 0,
                  percent: 0,
                  title: { vi: "", en: "", zh: "", ja: "" },
                  description: { vi: "", en: "", zh: "", ja: "" },
                },
              ],
            })
          }
        >
          <Plus className="h-4 w-4" />
          {t("admin.addOffer")}
        </button>
        <SaveButton saving={saving} t={t} onClick={onSave} />
      </div>
    </section>
  );
}

function OfferLangFields({
  offer,
  onChange,
  t,
}: {
  offer: DealerOffer;
  onChange: (next: DealerOffer) => void;
  t: (key: string) => string;
}) {
  const [translating, setTranslating] = useState<"title" | "description" | null>(null);

  async function translateField(field: "title" | "description") {
    const current = { vi: "", en: "", zh: "", ja: "", ...offer[field] };
    const vietnamese = current.vi.trim();
    if (!vietnamese) {
      return;
    }
    setTranslating(field);
    try {
      const filled = await fillFromVietnamese(vietnamese, current);
      onChange({ ...offer, [field]: filled });
    } catch {
      onChange({
        ...offer,
        [field]: {
          ...current,
          en: current.en || vietnamese,
          zh: current.zh || vietnamese,
          ja: current.ja || vietnamese,
        },
      });
    } finally {
      setTranslating(null);
    }
  }

  return (
    <div className="form-fields-row form-fields-row--auto mt-3">
      <label className="block text-xs font-medium text-ink/70 col-span-full">
        {t("admin.field.offerTitle_vi")}
        <input
          value={offer.title?.vi ?? ""}
          onChange={(event) => onChange({ ...offer, title: { en: "", zh: "", ja: "", ...offer.title, vi: event.target.value } })}
          onBlur={() => void translateField("title")}
          className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
        />
        <span className="mt-1 block text-[11px] font-normal text-ink/45">
          {translating === "title" ? t("admin.translating") : t("admin.viHint")}
        </span>
      </label>
      {(["en", "zh", "ja"] as Lang[]).map((code) => (
        <label key={`title-${code}`} className="block text-xs font-medium text-ink/70">
          {t(`admin.field.offerTitle_${code}`)}
          <input
            value={offer.title?.[code] ?? ""}
            onChange={(event) => onChange({ ...offer, title: { vi: "", en: "", zh: "", ja: "", ...offer.title, [code]: event.target.value } })}
            className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
          />
        </label>
      ))}
      <label className="block text-xs font-medium text-ink/70 col-span-full">
        {t("admin.field.offerDesc_vi")}
        <textarea
          value={offer.description?.vi ?? ""}
          onChange={(event) => onChange({ ...offer, description: { en: "", zh: "", ja: "", ...offer.description, vi: event.target.value } })}
          onBlur={() => void translateField("description")}
          rows={2}
          className="mt-1 w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] font-normal text-ink/45">
          {translating === "description" ? t("admin.translating") : t("admin.viHint")}
        </span>
      </label>
      {(["en", "zh", "ja"] as Lang[]).map((code) => (
        <label key={`desc-${code}`} className="block text-xs font-medium text-ink/70 col-span-full">
          {t(`admin.field.offerDesc_${code}`)}
          <textarea
            value={offer.description?.[code] ?? ""}
            onChange={(event) => onChange({ ...offer, description: { vi: "", en: "", zh: "", ja: "", ...offer.description, [code]: event.target.value } })}
            rows={2}
            className="mt-1 w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm"
          />
        </label>
      ))}
    </div>
  );
}

function PlateRegionsForm({
  value,
  locations,
  lang,
  onChange,
  onSave,
  saving,
  t,
}: {
  value: AdminPlateRegions;
  locations: AdminLocation[];
  lang: Lang;
  onChange: (next: AdminPlateRegions) => void;
  onSave: () => void;
  saving: boolean;
  t: (key: string) => string;
}) {
  const areaI = value.areas?.AREA_I?.amount ?? 0;
  const areaII = value.areas?.AREA_II?.amount ?? 0;
  const [plateQuery, setPlateQuery] = useState("");

  function setAmount(area: string, amount: number) {
    onChange({
      ...value,
      areas: {
        ...value.areas,
        [area]: { amount },
      },
    });
  }

  function setUnit(region: string, index: number, unit: { code?: string; name: string; area: string }) {
    const units = [...(value.regions[region] ?? [])];
    units[index] = unit;
    onChange({ ...value, regions: { ...value.regions, [region]: units } });
  }

  return (
    <section className="space-y-4 p-4 sm:p-5">
      <div className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card">
        <div className="form-fields-row form-fields-row--auto">
          <NumberField currency label={t("admin.field.areaIAmount")} value={areaI} onChange={(next) => setAmount("AREA_I", next)} />
          <NumberField currency label={t("admin.field.areaIIAmount")} value={areaII} onChange={(next) => setAmount("AREA_II", next)} />
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={plateQuery}
            onChange={(event) => setPlateQuery(event.target.value)}
            placeholder={t("provinceSearch")}
            className="h-10 w-full rounded-lg border border-ink/10 bg-paper pl-9 pr-3 text-sm"
          />
        </label>
      </div>
      {["NORTH", "CENTRAL", "SOUTH"].map((region) => (
        <div key={region} className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card">
          <p className="text-sm font-semibold">{t(`admin.opt.${region}`)}</p>
          <div className="mt-3 space-y-2">
            {(value.regions[region] ?? []).map((unit, index) => {
              const label = plateUnitName(unit, locations, lang);
              if (!softIncludes(plateQuery, label, unit.name, unit.code)) {
                return null;
              }
              return (
              <div key={`${region}-${index}`} className="grid gap-2 md:grid-cols-[6fr_4fr_auto]">
                {locations.find((item) => item.code === unit.code) ? (
                  <p className="flex h-10 items-center rounded-lg border border-ink/10 bg-paper px-3 text-sm">
                    {plateUnitName(unit, locations, lang)}
                  </p>
                ) : (
                  <input
                    value={unit.name}
                    onChange={(event) => setUnit(region, index, { ...unit, name: event.target.value })}
                    className="h-10 rounded-lg border border-ink/10 bg-paper px-3 text-sm"
                  />
                )}
                <select
                  value={unit.area}
                  onChange={(event) => setUnit(region, index, { ...unit, area: event.target.value })}
                  className="h-10 rounded-lg border border-ink/10 bg-paper px-3 text-sm"
                >
                  <option value="AREA_I">{t("admin.opt.AREA_I")}</option>
                  <option value="AREA_II">{t("admin.opt.AREA_II")}</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      regions: { ...value.regions, [region]: (value.regions[region] ?? []).filter((_, itemIndex) => itemIndex !== index) },
                    })
                  }
                  className="text-sm text-red-700"
                >
                  {t("admin.remove")}
                </button>
              </div>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-copper"
            onClick={() =>
              onChange({
                ...value,
                regions: {
                  ...value.regions,
                  [region]: [...(value.regions[region] ?? []), { name: "", area: "AREA_II" }],
                },
              })
            }
          >
            {t("admin.addProvince")}
          </button>
        </div>
      ))}
      <div className="pt-1">
        <SaveButton saving={saving} t={t} onClick={onSave} />
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  currency = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  currency?: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-ink/70">
      {label}
      {currency ? (
        <CurrencyInput
          value={Number.isFinite(value) ? value : 0}
          onChange={(next) => onChange(next ?? 0)}
          className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
        />
      ) : (
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-1 h-10 w-full rounded-lg border border-ink/10 bg-paper px-3 text-sm"
        />
      )}
    </label>
  );
}

function SaveButton({ saving, t, onClick }: { saving: boolean; t: (key: string) => string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={saving}
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-60"
    >
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {saving ? t("admin.saving") : t("admin.save")}
    </button>
  );
}

function prepareDraft(row: Record<string, unknown>): Record<string, unknown> {
  const photos = normalizeColorPhotos(row.colorPhotos);
  const listed = String(row.availableColors ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  for (const name of listed) {
    if (!photos[name]) {
      photos[name] = [];
    }
  }
  return { ...row, colorPhotos: photos };
}

function isCatalog(tab: Tab): tab is CatalogTab {
  return !["feePolicy", "dealerPolicy", "plateRegions"].includes(tab);
}

function columnLabel(tab: CatalogTab, column: string, t: (key: string) => string) {
  if (tab === "consultingEmployees" && column === "active") {
    return t("admin.field.working");
  }
  if (tab === "consultingEmployees" && column === "isDefault") {
    return t("admin.field.defaultConsultant");
  }
  return t(`admin.field.${column}`);
}

function localizedName(
  tab: Tab,
  row: Record<string, unknown>,
  lang: Lang,
  t: (key: string) => string
) {
  if (tab === "locations") {
    return locationName(
      {
        name: String(row.name ?? ""),
        nameEn: String(row.nameEn ?? ""),
        nameZh: String(row.nameZh ?? ""),
        nameJa: String(row.nameJa ?? ""),
      } as AdminLocation,
      lang
    );
  }
  if (tab === "accessories") {
    return accessoryLabel(
      {
        name: String(row.name ?? ""),
        nameEn: String(row.nameEn ?? ""),
        nameZh: String(row.nameZh ?? ""),
        nameJa: String(row.nameJa ?? ""),
      },
      lang
    );
  }
  const code = String(row.code ?? "");
  if (tab === "categories" && code) {
    const key = `category.${code}`;
    return t(key) === key ? String(row.name ?? code) : t(key);
  }
  if (tab === "feeDefinitions" && code) {
    const key = `fee.${code}`;
    return t(key) === key ? String(row.name ?? code) : t(key);
  }
  return String(row.name ?? "—");
}

function plateUnitName(
  unit: { code?: string; name: string },
  locations: AdminLocation[],
  lang: Lang
) {
  const location = locations.find((item) => item.code === unit.code);
  return location ? locationName(location, lang) : unit.name;
}

function locationName(location: AdminLocation | undefined, lang: Lang) {
  if (!location) {
    return "";
  }
  return locationLabel(location, lang);
}

function saveFor(tab: CatalogTab, item: Record<string, unknown>) {
  switch (tab) {
    case "brands":
      return api.saveAdminBrand(item as unknown as AdminBrand);
    case "categories":
      return api.saveAdminCategory(item as unknown as AdminCategory);
    case "locations":
      return api.saveAdminLocation(item as unknown as AdminLocation);
    case "dealers":
      return api.saveAdminDealer(item as unknown as AdminDealer);
    case "vehicles":
      return api.saveAdminVehicle(item as unknown as AdminVehicle);
    case "accessories":
      return api.saveAdminAccessory(item as unknown as AdminAccessory);
    case "feeDefinitions":
      return api.saveAdminFeeDefinition(item as unknown as AdminFeeDefinition);
    case "feeRules":
      return api.saveAdminFeeRule(item as unknown as AdminFeeRule);
    case "banks":
      return api.saveAdminBank(item as unknown as AdminBank);
    case "consultingEmployees":
      return api.saveAdminConsultingEmployee(item as unknown as AdminConsultingEmployee);
    case "bankLoans":
      return api.saveAdminBankLoan(item as unknown as AdminBankLoan);
  }
}

function deleteFor(tab: CatalogTab, id: number) {
  switch (tab) {
    case "brands":
      return api.deleteAdminBrand(id);
    case "categories":
      return api.deleteAdminCategory(id);
    case "locations":
      return api.deleteAdminLocation(id);
    case "dealers":
      return api.deleteAdminDealer(id);
    case "vehicles":
      return api.deleteAdminVehicle(id);
    case "accessories":
      return api.deleteAdminAccessory(id);
    case "feeDefinitions":
      return api.deleteAdminFeeDefinition(id);
    case "feeRules":
      return api.deleteAdminFeeRule(id);
    case "banks":
      return api.deleteAdminBank(id);
    case "consultingEmployees":
      return api.deleteAdminConsultingEmployee(id);
    case "bankLoans":
      return api.deleteAdminBankLoan(id);
  }
}
