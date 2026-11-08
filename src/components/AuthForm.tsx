"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ensureUserId } from "@/lib/auth/session";
import { getDisplayName } from "@/lib/display-name";

type Mode = "signup" | "login";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setPending(true);
    try {
      if (mode === "signup") {
        // Upgrades the current anonymous session in place (same user id),
        // so lobby/race history already attributed to it carries over
        // instead of starting a disconnected new account.
        await ensureUserId();
        const { data, error: updateError } = await supabase.auth.updateUser({ email, password });
        if (updateError) throw updateError;
        if (data.user) {
          await supabase
            .from("users")
            .update({ display_name: getDisplayName() })
            .eq("id", data.user.id);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مرة ثانية");
      setPending(false);
    }
  }

  return (
    <div className="brand-card w-full max-w-md rounded-3xl bg-white p-6 shadow-md">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-xl py-2 font-display text-lg transition ${
            mode === "signup" ? "btn-primary text-white" : "bg-brand-cream text-brand-navy/60"
          }`}
        >
          إنشاء حساب
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-xl py-2 font-display text-lg transition ${
            mode === "login" ? "btn-primary text-white" : "bg-brand-cream text-brand-navy/60"
          }`}
        >
          تسجيل الدخول
        </button>
      </div>

      <label className="mt-5 block text-start font-display text-lg text-brand-navy">
        البريد الإلكتروني
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-brand-navy/10 bg-brand-cream/60 px-4 py-3 text-start font-body text-brand-navy focus:border-brand-orange focus:outline-none"
        />
      </label>

      <label className="mt-4 block text-start font-display text-lg text-brand-navy">
        كلمة المرور
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-brand-navy/10 bg-brand-cream/60 px-4 py-3 text-start font-body text-brand-navy focus:border-brand-orange focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !email || !password}
        className="btn-secondary mt-5 w-full rounded-xl py-3 font-display text-2xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "..." : mode === "signup" ? "أنشئ حسابي" : "سجّل دخولك"}
      </button>

      {error && <p className="mt-3 text-start font-body text-sm text-red-600">{error}</p>}
    </div>
  );
}
