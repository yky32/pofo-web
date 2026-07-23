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
      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <PhotoImage
          src={studioPhotos.ceremony}
          alt=""
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-10 text-white">
          <p className="label-lab text-white/70">Pofo lab</p>
          <p className="mt-2 text-2xl font-semibold leading-snug">
            Deliver with
            <br />
            contact-sheet clarity.
          </p>
        </div>
      </div>

      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex h-14 items-center border-b border-border px-6">
          <Link href="/">
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
