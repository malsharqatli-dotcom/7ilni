import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-brand-cream px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* TODO: replace with the real logo once public/logo.png is added */}
        <img
          src="/logo.png"
          alt="حلّني"
          className="h-auto w-72 max-w-full"
        />

        <p className="mt-3 font-body text-lg font-semibold text-brand-navy/80">
          سباق المقالات — اوصل قبل أصحابك!
        </p>

        <div className="mt-8 w-full rounded-3xl bg-white p-6 shadow-sm">
          <label
            htmlFor="displayName"
            className="block text-start font-display text-xl text-brand-navy"
          >
            اسمك
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="نمر_السريع"
            className="mt-2 w-full rounded-xl border-2 border-brand-navy/10 bg-brand-cream/60 px-4 py-3 text-start font-body text-brand-navy placeholder:text-brand-navy/40 focus:border-brand-orange focus:outline-none"
          />

          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-brand-orange py-3 font-display text-2xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
          >
            أنشئ غرفة جديدة
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-brand-navy/10" />
            <span className="font-display text-base text-brand-navy/40">
              أو
            </span>
            <div className="h-px flex-1 bg-brand-navy/10" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="كود الغرفة"
              className="min-w-0 flex-1 rounded-xl border-2 border-brand-navy/10 bg-brand-cream/60 px-4 py-3 text-center font-body text-brand-navy placeholder:text-brand-navy/40 focus:border-brand-orange focus:outline-none"
            />
            <button
              type="button"
              className="shrink-0 rounded-xl bg-brand-navy px-5 py-3 font-display text-xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
            >
              انضم
            </button>
          </div>
        </div>

        <p className="mt-6 font-body text-sm text-brand-navy/70">
          عندك حساب؟{" "}
          <Link href="/login" className="font-bold underline underline-offset-2">
            سجّل دخولك
          </Link>
        </p>
      </div>
    </div>
  );
}
