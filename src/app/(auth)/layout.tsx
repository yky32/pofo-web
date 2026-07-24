import Link from "next/link";
import { AuthSideCarousel } from "@/components/auth/auth-side-carousel";
import { Logo } from "@/components/brand/logo";

/**
 * Auth shell: left photo panel stays fixed on large screens;
 * only the right form column scrolls when content grows (e.g. Team signup).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:h-svh lg:grid-cols-2 lg:overflow-hidden">
      {/* Left: fixed viewport panel — does not scroll with the form */}
      <div className="relative hidden min-h-0 lg:block">
        <div className="absolute inset-0">
          <AuthSideCarousel />
        </div>
      </div>

      {/* Right: only this column scrolls */}
      <div className="flex min-h-screen flex-col lg:h-svh lg:min-h-0 lg:overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center bg-[oklch(0.995_0.003_85)]/90 px-6 backdrop-blur-sm">
          <Link href="/" className="text-stone-900">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-6 lg:py-12">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
