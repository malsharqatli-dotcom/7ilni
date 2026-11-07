import type { Metadata } from "next";
import { Baloo_Bhaijaan_2, Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";

const baloo = Baloo_Bhaijaan_2({
  variable: "--font-baloo",
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700", "800"],
});

const notoKufi = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "حلّني | 7ilni",
  description: "سباق ويكيبيديا — اوصل من مقالة لمقالة قبل أصحابك!",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${baloo.variable} ${notoKufi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
