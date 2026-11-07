import Link from "next/link";
import Mascot from "@/components/Mascot";
import DecorativeBackground from "@/components/DecorativeBackground";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-brand-indigo to-brand-coral px-4 py-10">
      <DecorativeBackground />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <Mascot className="h-28 w-28" />

        <h1 className="mt-6 font-display text-6xl leading-[1.3] text-white drop-shadow-sm">
          حلّني
        </h1>
        <p className="mt-3 font-body text-lg font-semibold text-brand-sand">
          سباق المقالات — اوصل قبل أصحابك!
        </p>

        <div className="mt-8 w-full rounded-3xl bg-brand-sand/95 p-6 shadow-xl backdrop-blur">
          <label
            htmlFor="displayName"
            className="block text-start font-display text-xl text-brand-ink"
          >
            اسمك
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="نمر_السريع"
            className="mt-2 w-full rounded-xl border-2 border-brand-ink/10 bg-white/70 px-4 py-3 text-start font-body text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-coral focus:outline-none"
          />

          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-brand-coral py-3 font-display text-2xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
          >
            أنشئ غرفة جديدة
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-ink/10" />
            <span className="font-display text-base text-brand-ink/40">
              أو
            </span>
            <div className="h-px flex-1 bg-brand-ink/10" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="كود الغرفة"
              className="min-w-0 flex-1 rounded-xl border-2 border-brand-ink/10 bg-white/70 px-4 py-3 text-center font-body text-brand-ink placeholder:text-brand-ink/40 focus:border-brand-coral focus:outline-none"
            />
            <button
              type="button"
              className="shrink-0 rounded-xl bg-brand-ink px-5 py-3 font-display text-xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
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
