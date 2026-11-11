import type { Metadata } from "next";
import { Lalezar, Noto_Kufi_Arabic } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const lalezar = Lalezar({
  variable: "--font-lalezar",
  subsets: ["arabic", "latin"],
  weight: "400",
});

const notoKufi = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "حلّني | 7ilni",
  description: "سباق ويكيبيديا — اوصل من مقالة لمقالة قبل أصحابك!",
  // Served as a plain /public file (not Next's app/icon.png convention) —
  // that convention's route got stuck serving a stale cached build on
  // Vercel even after redeploys, so a brand-new filename forces a clean
  // break instead of fighting that cache.
  icons: {
    icon: [
      { url: "/favicon-v2.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-v2.ico", sizes: "any" },
    ],
    shortcut: "/favicon-v2.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${lalezar.variable} ${notoKufi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
