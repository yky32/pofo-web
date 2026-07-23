import Link from "next/link";
import { AuthSideCarousel } from "@/components/auth/auth-side-carousel";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthSideCarousel />

      <div className="flex min-h-screen flex-col">
        <div className="flex h-16 items-center px-6">
          <Link href="/" className="text-stone-900">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          {children}
        </div>
      </div>
    </div>
  );
}
