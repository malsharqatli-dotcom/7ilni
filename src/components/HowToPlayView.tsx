"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Tab = "play" | "invite";

const STEPS: Record<Tab, string[]> = {
  play: [
    "اكتب اسمك واضغط \"أنشئ غرفة جديدة\" — أو انضم لغرفة صاحبك بالكود.",
    "رح تبدأ من مقالة ويكيبيديا، ومهمتك توصل لمقالة \"الوجهة\" بالتنقل من رابط لرابط.",
    "فقط الروابط البرتقالية المسطّرة جوا النص شغالة — روابط الصندوق الجانبي والمراجع غير قابلة للنقر، وهذا مقصود.",
    "كل نقلة بتزيد عدّاد \"النقلات\" بتاعك، وبتشوف ترتيبك مقارنة بباقي اللاعبين لحظيًا بلوحة الترتيب.",
    "أول واحد (أو فريق) يوصل \"الوجهة\" بيفوز! بتظهر شاشة كبيرة للجميع فيها اسم الفائز والمسار اللي مشاه مقالة مقالة.",
    "بعد شوي، الكل يرجع تلقائيًا لغرفة اللوبي عشان تبدأوا سباق جديد.",
  ],
  invite: [
    "من الصفحة الرئيسية اضغط \"أنشئ غرفة جديدة\" — رح تحصل على كود غرفة خاص بك.",
    "اضغط زر \"ادعُ أصحابك\" فوق الكود عشان تنسخه، وشاركه مع أصحابك على واتساب أو أي مكان.",
    "أصحابك بس بحاجة يفتحوا الموقع، يكتبوا اسمهم، ويدخلوا نفس الكود بخانة \"كود الغرفة\".",
    "لما يدخلوا، رح تشوف أسماءهم تضاف تحت \"اللاعبين\" مباشرة — وإنت المضيف (علامة 👑 جنب اسمك).",
    "اختار طريقة اللعب (فردي أو فرق)، ومستوى الصعوبة أو فئة المقالات، وبعدين اضغط \"ابدأ السباق\".",
    "اللعبة تبدأ لجميع اللاعبين بنفس اللحظة — يلا، إنت المضيف!",
  ],
};

const TAB_LABEL: Record<Tab, string> = {
  play: "كيف تلعب؟",
  invite: "كيف تسوي غرفة وتدعو أصحابك؟",
};

function isTab(value: string | null): value is Tab {
  return value === "play" || value === "invite";
}

export default function HowToPlayView() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : "play");

  return (
    <div className="brand-bg flex min-h-screen flex-1 flex-col items-center px-4 py-8">
      <div className="flex w-full max-w-md flex-col gap-5">
        <Link href="/" className="self-center">
          <Image src="/logo.png" alt="حلّني" width={1536} height={1024} className="h-auto w-28 max-w-full" />
        </Link>

        <h1 className="text-center font-display text-2xl text-brand-navy">تعليمات اللعب</h1>

        <div className="flex gap-2">
          {(["play", "invite"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 font-display text-sm transition sm:text-base ${
                tab === t ? "bg-brand-orange text-white shadow-md" : "bg-white text-brand-navy/70"
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="brand-card rounded-3xl bg-white p-5 shadow-md">
          <ol className="flex flex-col gap-4">
            {STEPS[tab].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange font-display text-sm text-white">
                  {i + 1}
                </span>
                <p className="font-body text-sm leading-relaxed text-brand-navy sm:text-base">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        <Link
          href="/"
          className="btn-primary w-full rounded-xl py-3 text-center font-display text-xl text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
        >
          يلا نلعب!
        </Link>
      </div>
    </div>
  );
}
