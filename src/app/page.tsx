import Link from "next/link";
import Mascot from "@/components/Mascot";
import DecorativeBackground from "@/components/DecorativeBackground";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-red to-brand-orange px-4 py-10">
      <DecorativeBackground />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <Mascot className="h-32 w-32 drop-shadow-lg" />

        <h1 className="mt-2 font-display text-5xl font-extrabold text-white drop-shadow-sm">
          حلّني
        </h1>
        <p className="mt-2 font-display text-lg font-semibold text-brand-cream">
          سباق المقالات — اوصل قبل أصحابك!
        </p>

        <div className="mt-8 w-full rounded-3xl bg-white/95 p-6 shadow-xl backdrop-blur">
          <label
            htmlFor="displayName"
            className="block text-start font-display text-sm font-bold text-brand-navy"
          >
            اسمك
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="نمر_السريع"
            className="mt-2 w-full rounded-xl border-2 border-brand-navy/10 bg-brand-cream/40 px-4 py-3 text-start font-body text-brand-navy placeholder:text-brand-navy/40 focus:border-brand-orange focus:outline-none"
          />

          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-brand-red py-3 font-display text-lg font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
          >
            أنشئ غرفة جديدة
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-navy/10" />
            <span className="font-display text-xs font-bold text-brand-navy/40">
              أو
            </span>
            <div className="h-px flex-1 bg-brand-navy/10" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="كود الغرفة"
              className="min-w-0 flex-1 rounded-xl border-2 border-brand-navy/10 bg-brand-cream/40 px-4 py-3 text-center font-body text-brand-navy placeholder:text-brand-navy/40 focus:border-brand-orange focus:outline-none"
            />
            <button
              type="button"
              className="shrink-0 rounded-xl bg-brand-navy px-5 py-3 font-display font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
            >
              انضم
            </button>
          </div>
        </div>

        <p className="mt-6 font-body text-sm text-white/90">
          عندك حساب؟{" "}
          <Link href="/login" className="font-bold underline underline-offset-2">
            سجّل دخولك
          </Link>
        </p>
      </div>
    </div>
  );
}
