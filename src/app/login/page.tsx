import Image from "next/image";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="brand-bg flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-3">
        <Image src="/logo.png" alt="حلّني" width={1536} height={1024} priority className="h-auto w-72 max-w-full" />
      </Link>
      <AuthForm />

      <Link href="/" className="mt-4 font-body text-sm font-semibold text-brand-navy/70 underline underline-offset-2">
        🏁 ابدأ اللعب
      </Link>
    </div>
  );
}
