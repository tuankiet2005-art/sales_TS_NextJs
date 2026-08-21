import { createHmac, timingSafeEqual } from "node:crypto";

import type { OperatorRole } from "@/types";

export interface AuthSession {
  username: string;
  role: OperatorRole;
}

interface AuthAccount {
  username: string;
  password: string;
  role: OperatorRole;
}

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function same(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = Buffer.from(left ?? "");
  const b = Buffer.from(right ?? "");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function configuredAccounts(): AuthAccount[] {
  const accounts: AuthAccount[] = [
    {
      username: env("ADMIN_USERNAME"),
      password: env("ADMIN_PASSWORD"),
      role: "admin",
    },
  ];
  const operatorUser = optionalEnv("OPERATOR_USERNAME");
  const operatorPass = optionalEnv("OPERATOR_PASSWORD");
  if (operatorUser && operatorPass) {
    accounts.push({
      username: operatorUser,
      password: operatorPass,
      role: "sales",
    });
  }
  return accounts;
}

export function issueToken(username: string, password: string, role: OperatorRole): string {
  const secret = env("ADMIN_TOKEN_SECRET");
  return createHmac("sha256", secret)
    .update(`${username}:${password}:${role}`)
    .digest("hex");
}

export function login(username: string, password: string): (AuthSession & { token: string }) | null {
  let accounts: AuthAccount[];
  try {
    accounts = configuredAccounts();
  } catch {
    return null;
  }
  const trimmedUser = username.trim();
  const trimmedPass = password.trim();
  for (const account of accounts) {
    if (same(trimmedUser, account.username) && same(trimmedPass, account.password)) {
      return {
        username: account.username,
        role: account.role,
        token: issueToken(account.username, account.password, account.role),
      };
    }
  }
  return null;
}

/** @deprecated Use login() — kept for existing tests and imports. */
export function loginAdmin(username: string, password: string): string | null {
  return login(username, password)?.token ?? null;
}

export function resolveSession(authorizationHeader: string | null): AuthSession | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorizationHeader.slice("Bearer ".length).trim();
  let accounts: AuthAccount[];
  try {
    accounts = configuredAccounts();
  } catch {
    return null;
  }
  for (const account of accounts) {
    if (same(token, issueToken(account.username, account.password, account.role))) {
      return { username: account.username, role: account.role };
    }
  }
  return null;
}

export function isAuthorizedOperator(authorizationHeader: string | null): boolean {
  return resolveSession(authorizationHeader) != null;
}

export function isAuthorizedAdmin(authorizationHeader: string | null): boolean {
  return resolveSession(authorizationHeader)?.role === "admin";
}
