import {
  bigint,
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const brands = pgTable("brands", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  tagline: varchar("tagline", { length: 240 }),
  market: varchar("market", { length: 80 }).notNull(),
  accentColor: varchar("accent_color", { length: 16 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  ready: boolean("ready").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const vehicleCategories = pgTable("vehicle_categories", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 500 }),
  typicalSeats: integer("typical_seats"),
  requiresInspection: boolean("requires_inspection").notNull().default(false),
  requiresRoadUseFee: boolean("requires_road_use_fee").notNull().default(false),
  requiresCompulsoryInsurance: boolean("requires_compulsory_insurance").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const locations = pgTable("locations", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  nameEn: varchar("name_en", { length: 160 }).notNull(),
  nameZh: varchar("name_zh", { length: 160 }).notNull(),
  nameJa: varchar("name_ja", { length: 160 }).notNull(),
  region: varchar("region", { length: 32 }).notNull(),
  feeZone: varchar("fee_zone", { length: 32 }).notNull(),
  centrallyGovernedCity: boolean("centrally_governed_city").notNull().default(false),
});

export const locationDistricts = pgTable("location_districts", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  locationId: bigint("location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  nameEn: varchar("name_en", { length: 160 }).notNull(),
  nameZh: varchar("name_zh", { length: 160 }).notNull(),
  nameJa: varchar("name_ja", { length: 160 }).notNull(),
});

export const dealers = pgTable("dealers", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  brandId: bigint("brand_id", { mode: "number" })
    .notNull()
    .references(() => brands.id),
  name: varchar("name", { length: 200 }).notNull(),
  address: varchar("address", { length: 400 }),
  market: varchar("market", { length: 80 }).notNull().default("Vietnam"),
  active: boolean("active").notNull().default(true),
});

export const feeDefinitions = pgTable("fee_definitions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: varchar("description", { length: 500 }),
  mandatory: boolean("mandatory").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const vehicles = pgTable("vehicles", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  brandId: bigint("brand_id", { mode: "number" })
    .notNull()
    .references(() => brands.id),
  categoryId: bigint("category_id", { mode: "number" })
    .notNull()
    .references(() => vehicleCategories.id),
  model: varchar("model", { length: 80 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  seats: integer("seats"),
  vehicleType: varchar("vehicle_type", { length: 40 }),
  modelYear: integer("model_year"),
  engineCc: integer("engine_cc"),
  fuelType: varchar("fuel_type", { length: 40 }),
  transmission: varchar("transmission", { length: 40 }),
  listPrice: numeric("list_price", { precision: 18, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 18, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 18, scale: 2 }),
  taxBasePrice: numeric("tax_base_price", { precision: 18, scale: 2 }),
  defaultDeposit: numeric("default_deposit", { precision: 18, scale: 2 }),
  registrationServiceFee: numeric("registration_service_fee", { precision: 18, scale: 2 }),
  micaPlateFee: numeric("mica_plate_fee", { precision: 18, scale: 2 }),
  inspectionFee: numeric("inspection_fee", { precision: 18, scale: 2 }),
  defaultColor: varchar("default_color", { length: 80 }),
  availableColors: varchar("available_colors", { length: 240 }),
  colorPhotos: text("color_photos"),
  deliveryNote: varchar("delivery_note", { length: 120 }),
  warrantyNote: varchar("warranty_note", { length: 400 }),
  gifts: text("gifts"),
  quoteSheetName: varchar("quote_sheet_name", { length: 80 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  specifications: text("specifications"),
  active: boolean("active").notNull().default(true),
});

export const vehicleImages = pgTable(
  "vehicle_images",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    vehicleId: bigint("vehicle_id", { mode: "number" })
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 20 }).notNull(),
    colorName: varchar("color_name", { length: 80 }),
    mimeType: varchar("mime_type", { length: 64 }).notNull().default("image/webp"),
    data: text("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vehicle_images_vehicle_kind_color_uidx").on(
      table.vehicleId,
      table.kind,
      table.colorName,
    ),
  ],
);

export const feeRules = pgTable("fee_rules", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  feeDefinitionId: bigint("fee_definition_id", { mode: "number" })
    .notNull()
    .references(() => feeDefinitions.id),
  categoryId: bigint("category_id", { mode: "number" }).references(() => vehicleCategories.id),
  locationId: bigint("location_id", { mode: "number" }).references(() => locations.id),
  feeZone: varchar("fee_zone", { length: 32 }),
  calculationType: varchar("calculation_type", { length: 40 }).notNull(),
  fixedAmount: numeric("fixed_amount", { precision: 18, scale: 2 }),
  percentage: numeric("percentage", { precision: 8, scale: 4 }),
  minAmount: numeric("min_amount", { precision: 18, scale: 2 }),
  maxAmount: numeric("max_amount", { precision: 18, scale: 2 }),
  minEngineCc: integer("min_engine_cc"),
  maxEngineCc: integer("max_engine_cc"),
  minPrice: numeric("min_price", { precision: 18, scale: 2 }),
  maxPrice: numeric("max_price", { precision: 18, scale: 2 }),
  priority: integer("priority").notNull().default(0),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  active: boolean("active").notNull().default(true),
});

export const appSettings = pgTable("app_settings", {
  settingKey: varchar("setting_key", { length: 80 }).primaryKey(),
  payload: text("payload").notNull(),
});

export const quoteHistory = pgTable("quote_history", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerAddress: varchar("customer_address", { length: 400 }),
  vehicleId: bigint("vehicle_id", { mode: "number" }),
  brandCode: varchar("brand_code", { length: 40 }),
  vehicleName: varchar("vehicle_name", { length: 180 }),
  locationId: bigint("location_id", { mode: "number" }),
  locationName: varchar("location_name", { length: 160 }),
  categoryId: bigint("category_id", { mode: "number" }),
  color: varchar("color", { length: 80 }),
  usageType: varchar("usage_type", { length: 20 }),
  language: varchar("language", { length: 8 }),
  includeOptional: boolean("include_optional").notNull().default(false),
  listPrice: numeric("list_price", { precision: 18, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 18, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 18, scale: 2 }),
  deposit: numeric("deposit", { precision: 18, scale: 2 }),
  onRoadTotal: numeric("on_road_total", { precision: 18, scale: 2 }),
  payload: text("payload"),
  createdAt: timestamp("created_at").notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleImage = typeof vehicleImages.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type LocationDistrict = typeof locationDistricts.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
