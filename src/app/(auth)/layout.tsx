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
      <div className="relative hidden overflow-hidden lg:block">
        <PhotoImage
          src={studioPhotos.ceremony}
          alt=""
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
        <div className="absolute bottom-0 left-0 p-10 text-white">
          <p className="font-heading text-3xl font-medium leading-snug">
            Your photos.
            <br />
            Softly delivered.
          </p>
        </div>
      </div>

      <div className="flex min-h-screen flex-col">
        <div className="flex h-16 items-center px-6">
          <Link href="/" className="text-foreground">
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
