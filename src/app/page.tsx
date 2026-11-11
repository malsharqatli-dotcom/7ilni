import Image from "next/image";
import Link from "next/link";
import HomeForm from "@/components/HomeForm";

export default function Home() {
  return (
    <div className="brand-bg flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="حلّني"
            width={1536}
            height={1024}
            priority
            className="h-auto w-72 max-w-full"
          />
        </Link>

        <p className="mt-3 font-body text-lg font-semibold text-brand-navy/80">
          سباق المقالات — اوصل قبل أصحابك!
        </p>

        <HomeForm />

        <Link
          href="/daily"
          className="btn-secondary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-display text-xl text-white shadow-md transition hover:brightness-110"
        >
          🔥 تحدي اليوم
        </Link>

        <Link href="/how-to-play" className="mt-4 font-body text-sm font-semibold text-brand-navy/70 underline underline-offset-2">
          مش عارف تلعب؟ شوف التعليمات
        </Link>

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
