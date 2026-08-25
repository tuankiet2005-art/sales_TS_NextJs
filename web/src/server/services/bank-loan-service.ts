import { eq, ne, sql } from "drizzle-orm";

import type { AdminBank, AdminBankLoan, AdminConsultingEmployee, Bank, ConsultingEmployee } from "@/types";
import { getDb } from "../db/client";
import { bankLoans, banks, consultingEmployees } from "../db/schema";
import { validateBankLoanInput } from "@/lib/bankLoanValidation";

export type { BankLoanValidationErrors } from "@/lib/bankLoanValidation";

function slug(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function assertValidBankLoan(input: Parameters<typeof validateBankLoanInput>[0]) {
  const errors = validateBankLoanInput(input);
  const first = Object.values(errors)[0];
  if (first) {
    throw new Error(`Invalid bank loan: ${Object.keys(errors).join(", ")}`);
  }
}

function mapBank(row: typeof banks.$inferSelect): AdminBank {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

function mapEmployee(row: {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  active: boolean;
  sortOrder: number;
  isDefault?: boolean;
}): AdminConsultingEmployee {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    phone: row.phone ?? undefined,
    active: row.active,
    isDefault: row.isDefault ?? false,
    sortOrder: row.sortOrder,
  };
}

async function queryConsultingEmployeeRows(db: ReturnType<typeof getDb>, activeOnly = false) {
  try {
    const query = db
      .select()
      .from(consultingEmployees)
      .orderBy(consultingEmployees.sortOrder, consultingEmployees.name);
    return activeOnly ? await query.where(eq(consultingEmployees.active, true)) : await query;
  } catch (error) {
    console.error(
      "[bank-loan] consulting_employees query failed (missing is_default?). Run db/add-consulting-employee-default.sql when ready.",
      error,
    );
    const query = db
      .select({
        id: consultingEmployees.id,
        code: consultingEmployees.code,
        name: consultingEmployees.name,
        phone: consultingEmployees.phone,
        active: consultingEmployees.active,
        sortOrder: consultingEmployees.sortOrder,
      })
      .from(consultingEmployees)
      .orderBy(consultingEmployees.sortOrder, consultingEmployees.name);
    const rows = activeOnly ? await query.where(eq(consultingEmployees.active, true)) : await query;
    return rows.map((row) => ({ ...row, isDefault: false }));
  }
}

function mapBankLoan(
  row: typeof bankLoans.$inferSelect,
  bankName: string,
  employeeName: string,
): AdminBankLoan {
  return {
    id: row.id,
    bankId: row.bankId,
    bankName,
    monthlyInterestRate: Number(row.monthlyInterestRate),
    loanTermYears: row.loanTermYears,
    fixedRatePeriodYears: row.fixedRatePeriodYears,
    consultingEmployeeId: row.consultingEmployeeId,
    consultingEmployeeName: employeeName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listActiveBanks(): Promise<Bank[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(banks)
    .where(eq(banks.active, true))
    .orderBy(banks.sortOrder, banks.name);
  return rows.map((row) => ({ id: row.id, code: row.code, name: row.name }));
}

export async function listActiveConsultingEmployees(): Promise<ConsultingEmployee[]> {
  const db = getDb();
  const rows = await queryConsultingEmployeeRows(db, true);
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    phone: row.phone ?? undefined,
    isDefault: row.isDefault ?? false,
  }));
}

export async function listAdminBanks() {
  const db = getDb();
  const rows = await db.select().from(banks).orderBy(banks.sortOrder, banks.name);
  return rows.map(mapBank);
}

export async function upsertBank(record: AdminBank) {
  const db = getDb();
  const code = record.code?.trim() || slug(record.name);
  const values = {
    code,
    name: record.name.trim(),
    active: record.active ?? true,
    sortOrder: record.sortOrder ?? 0,
  };
  if (record.id) {
    const rows = await db.update(banks).set(values).where(eq(banks.id, record.id)).returning();
    return mapBank(rows[0]);
  }
  const rows = await db.insert(banks).values(values).returning();
  return mapBank(rows[0]);
}

export async function deleteBank(id: number) {
  const db = getDb();
  await db.delete(banks).where(eq(banks.id, id));
}

export async function listAdminConsultingEmployees() {
  const db = getDb();
  const rows = await queryConsultingEmployeeRows(db);
  return rows.map(mapEmployee);
}

async function persistConsultingEmployee(db: ReturnType<typeof getDb>, record: AdminConsultingEmployee) {
  const code = record.code?.trim() || slug(record.name);
  const isDefault = record.isDefault ?? false;
  const values = {
    code,
    name: record.name.trim(),
    phone: record.phone?.trim() || null,
    active: record.active ?? true,
    isDefault,
    sortOrder: record.sortOrder ?? 0,
  };

  if (isDefault) {
    await db
      .update(consultingEmployees)
      .set({ isDefault: false })
      .where(record.id ? ne(consultingEmployees.id, record.id) : sql`true`);
  }

  if (record.id) {
    const rows = await db
      .update(consultingEmployees)
      .set(values)
      .where(eq(consultingEmployees.id, record.id))
      .returning();
    return mapEmployee(rows[0]);
  }

  const rows = await db.insert(consultingEmployees).values(values).returning();
  return mapEmployee(rows[0]);
}

async function persistConsultingEmployeeLegacy(db: ReturnType<typeof getDb>, record: AdminConsultingEmployee) {
  const code = record.code?.trim() || slug(record.name);
  const values = {
    code,
    name: record.name.trim(),
    phone: record.phone?.trim() || null,
    active: record.active ?? true,
    sortOrder: record.sortOrder ?? 0,
  };

  if (record.id) {
    const rows = await db
      .update(consultingEmployees)
      .set(values)
      .where(eq(consultingEmployees.id, record.id))
      .returning({
        id: consultingEmployees.id,
        code: consultingEmployees.code,
        name: consultingEmployees.name,
        phone: consultingEmployees.phone,
        active: consultingEmployees.active,
        sortOrder: consultingEmployees.sortOrder,
      });
    return mapEmployee({ ...rows[0], isDefault: false });
  }

  const rows = await db.insert(consultingEmployees).values(values).returning({
    id: consultingEmployees.id,
    code: consultingEmployees.code,
    name: consultingEmployees.name,
    phone: consultingEmployees.phone,
    active: consultingEmployees.active,
    sortOrder: consultingEmployees.sortOrder,
  });
  return mapEmployee({ ...rows[0], isDefault: false });
}

export async function upsertConsultingEmployee(record: AdminConsultingEmployee) {
  const db = getDb();
  try {
    return await persistConsultingEmployee(db, record);
  } catch (error) {
    console.error(
      "[bank-loan] consulting_employees save failed (missing is_default?). Run db/add-consulting-employee-default.sql when ready.",
      error,
    );
    return persistConsultingEmployeeLegacy(db, { ...record, isDefault: false });
  }
}

export async function deleteConsultingEmployee(id: number) {
  const db = getDb();
  await db.delete(consultingEmployees).where(eq(consultingEmployees.id, id));
}

export async function listAdminBankLoans() {
  const db = getDb();
  const rows = await db
    .select({
      loan: bankLoans,
      bank: banks,
      employee: consultingEmployees,
    })
    .from(bankLoans)
    .innerJoin(banks, eq(bankLoans.bankId, banks.id))
    .innerJoin(consultingEmployees, eq(bankLoans.consultingEmployeeId, consultingEmployees.id))
    .orderBy(bankLoans.updatedAt);
  return rows.map((row) => mapBankLoan(row.loan, row.bank.name, row.employee.name));
}

export async function getBankLoan(id: number) {
  const db = getDb();
  const rows = await db
    .select({
      loan: bankLoans,
      bank: banks,
      employee: consultingEmployees,
    })
    .from(bankLoans)
    .innerJoin(banks, eq(bankLoans.bankId, banks.id))
    .innerJoin(consultingEmployees, eq(bankLoans.consultingEmployeeId, consultingEmployees.id))
    .where(eq(bankLoans.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return mapBankLoan(row.loan, row.bank.name, row.employee.name);
}

export async function upsertBankLoan(record: AdminBankLoan) {
  assertValidBankLoan(record);

  const db = getDb();
  const bankRow = await db.select().from(banks).where(eq(banks.id, record.bankId)).limit(1);
  if (!bankRow[0]) {
    throw new Error(`Unknown bank ${record.bankId}`);
  }

  const employeeRow = await db
    .select()
    .from(consultingEmployees)
    .where(eq(consultingEmployees.id, record.consultingEmployeeId))
    .limit(1);
  if (!employeeRow[0]) {
    throw new Error(`Unknown consulting employee ${record.consultingEmployeeId}`);
  }

  const values = {
    bankId: record.bankId,
    monthlyInterestRate: String(record.monthlyInterestRate),
    loanTermYears: record.loanTermYears,
    fixedRatePeriodYears: record.fixedRatePeriodYears ?? 0,
    consultingEmployeeId: record.consultingEmployeeId,
    updatedAt: new Date(),
  };

  if (record.id) {
    const rows = await db.update(bankLoans).set(values).where(eq(bankLoans.id, record.id)).returning();
    return mapBankLoan(rows[0], bankRow[0].name, employeeRow[0].name);
  }

  const rows = await db.insert(bankLoans).values(values).returning();
  return mapBankLoan(rows[0], bankRow[0].name, employeeRow[0].name);
}

export async function deleteBankLoan(id: number) {
  const db = getDb();
  await db.delete(bankLoans).where(eq(bankLoans.id, id));
}
