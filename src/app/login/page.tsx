import Image from "next/image";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="brand-bg flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-10">
      <Image src="/logo.png" alt="حلّني" width={1536} height={1024} className="mb-6 h-auto w-48 max-w-full" />
      <AuthForm />
    </div>
  );
}
