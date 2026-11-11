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
  // Served as plain /public files (not Next's app/icon.png convention) —
  // that convention's route got stuck serving a stale cached build on
  // Vercel even after redeploys. Kept at the conventional /favicon.ico
  // path too (not just referenced via these <link> tags) since Chrome
  // fetches that exact URL directly as a legacy fallback regardless of
  // what the page's <link rel="icon"> tags say.
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
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
