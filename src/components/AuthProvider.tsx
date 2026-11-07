"use client";

import { useEffect } from "react";
import { ensureUserId } from "@/lib/auth/session";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureUserId().catch(() => {
      // Swallowed here — any component that actually needs the user id
      // (create/join/hop handlers) calls ensureUserId() again and surfaces
      // its own error state if it still fails.
    });
  }, []);

  return children;
}
