"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ensureUserId, getAuthHeader } from "@/lib/auth/session";
import {
  getDisplayName,
  getDisplayNameServerSnapshot,
  setDisplayName,
  subscribeDisplayName,
} from "@/lib/display-name";

export default function HomeForm() {
  const router = useRouter();
  const displayName = useSyncExternalStore(
    subscribeDisplayName,
    getDisplayName,
    getDisplayNameServerSnapshot,
  );
  const [joinCode, setJoinCode] = useState("");
  const [pending, setPending] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setDisplayName(value);
  }

  async function handleCreate() {
    setError("");
    setPending("create");
    try {
      await ensureUserId();
      const res = await fetch("/api/lobby/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await getAuthHeader() },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create room");
      router.push(`/lobby/${data.joinCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setPending(null);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) {
      setError("اكتب كود الغرفة");
      return;
    }
    setError("");
    setPending("join");
    try {
      await ensureUserId();
      const res = await fetch("/api/lobby/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: await getAuthHeader() },
        body: JSON.stringify({ joinCode, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join room");
      router.push(`/lobby/${data.joinCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setPending(null);
    }
  }

  return (
    <div className="brand-card mt-8 w-full rounded-3xl bg-white p-6 shadow-md">
      <label htmlFor="displayName" className="block text-start font-display text-xl text-brand-navy">
        اسمك
      </label>
      <input
        id="displayName"
        value={displayName}
        onChange={(e) => handleNameChange(e.target.value)}
        type="text"
        className="mt-2 w-full rounded-xl border-2 border-brand-navy/10 bg-brand-cream/60 px-4 py-3 text-start font-body text-brand-navy focus:border-brand-orange focus:outline-none"
      />

      <button
        type="button"
        onClick={handleCreate}
        disabled={pending !== null}
        className="btn-primary mt-5 w-full rounded-xl py-3 font-display text-2xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
      >
        {pending === "create" ? "..." : "أنشئ غرفة جديدة"}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-brand-navy/10" />
        <span className="font-display text-base text-brand-navy/40">أو</span>
        <div className="h-px flex-1 bg-brand-navy/10" />
      </div>

      <div className="flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          type="text"
          placeholder="كود الغرفة"
          className="min-w-0 flex-1 rounded-xl border-2 border-brand-navy/10 bg-brand-cream/60 px-4 py-3 text-center font-body text-brand-navy placeholder:text-brand-navy/40 focus:border-brand-orange focus:outline-none"
        />
        <button
          type="button"
          onClick={handleJoin}
          disabled={pending !== null}
          className="btn-secondary shrink-0 rounded-xl px-5 py-3 font-display text-xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {pending === "join" ? "..." : "انضم"}
        </button>
      </div>

      {error && <p className="mt-3 text-start font-body text-sm text-red-600">{error}</p>}
    </div>
  );
}
