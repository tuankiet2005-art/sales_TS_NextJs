"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OperatorRole } from "../types";
import {
  ADMIN_AUTH_EVENT,
  clearAdminToken,
  getOperatorRole,
  isAdminSignedIn,
  setAdminSession,
} from "../lib/adminAuth";

interface AdminAuthContextValue {
  ready: boolean;
  signedIn: boolean;
  role: OperatorRole | null;
  isAdmin: boolean;
  signIn: (token: string, role: OperatorRole) => void;
  signOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<OperatorRole | null>(null);

  useEffect(() => {
    function sync() {
      setSignedIn(isAdminSignedIn());
      setRole(getOperatorRole());
      setReady(true);
    }
    sync();
    window.addEventListener(ADMIN_AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ADMIN_AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      ready,
      signedIn,
      role,
      isAdmin: role === "admin",
      signIn(token, nextRole) {
        setAdminSession(token, nextRole);
        setSignedIn(true);
        setRole(nextRole);
        setReady(true);
      },
      signOut() {
        clearAdminToken();
        setSignedIn(false);
        setRole(null);
        setReady(true);
      },
    }),
    [ready, signedIn, role],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return context;
}
