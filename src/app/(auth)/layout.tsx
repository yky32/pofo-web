import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PhotoImage } from "@/components/photo/photo-image";
import { studioPhotos } from "@/lib/photos";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-neutral-100 lg:block">
        <PhotoImage
          src={studioPhotos.ceremony}
          alt=""
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>

      <div className="flex min-h-screen flex-col bg-white">
        <div className="flex h-16 items-center border-b border-neutral-200 px-6">
          <Link href="/" className="text-neutral-900">
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
