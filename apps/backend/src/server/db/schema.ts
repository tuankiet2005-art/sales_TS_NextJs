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
}, (table) => [
  uniqueIndex("vehicles_brand_model_name_year_uidx").on(
    table.brandId,
    table.model,
    table.name,
    table.modelYear,
  ),
]);

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

export const accessories = pgTable("accessories", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  nameEn: varchar("name_en", { length: 160 }),
  nameZh: varchar("name_zh", { length: 160 }),
  nameJa: varchar("name_ja", { length: 160 }),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  imageUrl: varchar("image_url", { length: 1000 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const accessoryImages = pgTable(
  "accessory_images",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    accessoryId: bigint("accessory_id", { mode: "number" })
      .notNull()
      .references(() => accessories.id, { onDelete: "cascade" }),
    mimeType: varchar("mime_type", { length: 64 }).notNull().default("image/webp"),
    data: text("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("accessory_images_accessory_uidx").on(table.accessoryId)],
);

export const appSettings = pgTable("app_settings", {
  settingKey: varchar("setting_key", { length: 80 }).primaryKey(),
  payload: text("payload").notNull(),
});

export const banks = pgTable("banks", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const consultingEmployees = pgTable("consulting_employees", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  active: boolean("active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bankLoans = pgTable("bank_loans", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  bankId: bigint("bank_id", { mode: "number" })
    .notNull()
    .references(() => banks.id),
  monthlyInterestRate: numeric("monthly_interest_rate", { precision: 8, scale: 4 }).notNull(),
  loanTermYears: integer("loan_term_years").notNull(),
  fixedRatePeriodYears: integer("fixed_rate_period_years").notNull().default(0),
  consultingEmployeeId: bigint("consulting_employee_id", { mode: "number" })
    .notNull()
    .references(() => consultingEmployees.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quoteHistory = pgTable("quote_history", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  customerId: bigint("customer_id", { mode: "number" }),
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

export const customers = pgTable("customers", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  streetLine: varchar("street_line", { length: 240 }),
  locationId: bigint("location_id", { mode: "number" }).references(() => locations.id),
  districtId: bigint("district_id", { mode: "number" }).references(() => locationDistricts.id),
  permanentStreetLine: varchar("permanent_street_line", { length: 240 }),
  permanentLocationId: bigint("permanent_location_id", { mode: "number" }).references(() => locations.id),
  permanentDistrictId: bigint("permanent_district_id", { mode: "number" }).references(() => locationDistricts.id),
  temporaryStreetLine: varchar("temporary_street_line", { length: 240 }),
  temporaryLocationId: bigint("temporary_location_id", { mode: "number" }).references(() => locations.id),
  temporaryDistrictId: bigint("temporary_district_id", { mode: "number" }).references(() => locationDistricts.id),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerRelationships = pgTable(
  "customer_relationships",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    customerId: bigint("customer_id", { mode: "number" })
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    relatedCustomerId: bigint("related_customer_id", { mode: "number" })
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    relationshipType: varchar("relationship_type", { length: 32 }).notNull(),
    note: varchar("note", { length: 240 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_relationships_unique").on(
      table.customerId,
      table.relatedCustomerId,
      table.relationshipType,
    ),
  ],
);

export type Brand = typeof brands.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleImage = typeof vehicleImages.$inferSelect;
export type Accessory = typeof accessories.$inferSelect;
export type AccessoryImage = typeof accessoryImages.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type LocationDistrict = typeof locationDistricts.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
