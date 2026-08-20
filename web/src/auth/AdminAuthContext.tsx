"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADMIN_AUTH_EVENT, clearAdminToken, isAdminSignedIn, setAdminToken } from "../lib/adminAuth";

interface AdminAuthContextValue {
  ready: boolean;
  signedIn: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    function sync() {
      setSignedIn(isAdminSignedIn());
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
      signIn(token) {
        setAdminToken(token);
        setSignedIn(true);
        setReady(true);
      },
      signOut() {
        clearAdminToken();
        setSignedIn(false);
        setReady(true);
      },
    }),
    [ready, signedIn]
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
