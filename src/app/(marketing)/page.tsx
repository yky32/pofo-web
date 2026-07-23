import Link from "next/link";
import { ArrowRight, Heart, Shield, Timer, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoFrame } from "@/components/photo/photo-frame";
import { FilmStrip } from "@/components/photo/film-strip";
import { PhotoImage } from "@/components/photo/photo-image";
import { studioPhotos } from "@/lib/photos";

const features = [
  {
    icon: Upload,
    title: "JPEG + RAW",
    description: "Previews first. Originals when you choose.",
  },
  {
    icon: Shield,
    title: "Private links",
    description: "Password and expiry. Your control.",
  },
  {
    icon: Heart,
    title: "Proofing",
    description: "Clients select favorites without the noise.",
  },
  {
    icon: Timer,
    title: "Timed downloads",
    description: "Access that ends with the job.",
  },
];

const steps = [
  { n: "01", title: "Upload", body: "Add the set after your edit." },
  { n: "02", title: "Share", body: "One private link for the client." },
  { n: "03", title: "Select", body: "They mark favorites in minutes." },
  { n: "04", title: "Deliver", body: "Finals up. Portfolio optional." },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero — V3 air + V1 warmth */}
      <section className="border-b border-border/70">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20">
          <p className="label-quiet">Design v6 · Gallery Paper</p>
          <h1 className="mt-5 max-w-3xl font-heading text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Space for the work.
            <br />
            <span className="text-muted-foreground">Warmth for the client.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Private galleries with room to breathe — simple proofing, premium
            delivery, nothing in the way of the photos.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="rounded-md bg-primary px-7 text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link href="/signup">
                Start free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-md border-border"
              asChild
            >
              <Link href="/dashboard">View studio</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <div className="col-span-7">
              <PhotoFrame
                src={studioPhotos.heroMain}
                alt="Wedding portrait"
                priority
                aspect="aspect-[5/4]"
                sizes="60vw"
              />
            </div>
            <div className="col-span-5 flex flex-col gap-3 sm:gap-4">
              <PhotoFrame
                src={studioPhotos.rings}
                alt="Detail"
                aspect="aspect-square"
                sizes="40vw"
              />
              <PhotoFrame
                src={studioPhotos.ceremony}
                alt="Ceremony"
                aspect="aspect-[4/3]"
                sizes="40vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/70 bg-muted/40 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-quiet mb-6 text-center">Selected work</p>
          <FilmStrip
            photos={[
              studioPhotos.heroSideA,
              studioPhotos.golden,
              studioPhotos.kiss,
              studioPhotos.outdoor,
            ]}
          />
        </div>
      </section>

      <section id="features" className="border-b border-border/70 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="label-quiet">Features</p>
            <h2 className="mt-3 font-heading text-4xl tracking-tight sm:text-5xl">
              Only what you need after the shoot.
            </h2>
          </div>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-xl tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="look" className="border-b border-border/70">
        <div className="relative aspect-[21/9] min-h-[280px]">
          <PhotoImage
            src={studioPhotos.golden}
            alt="Client gallery"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
              <div className="max-w-md rounded-lg bg-card/95 p-6 shadow-[0_12px_40px_-16px_rgba(40,30,20,0.2)] ring-1 ring-border/60 backdrop-blur sm:p-8">
                <p className="label-quiet">Client view</p>
                <h2 className="mt-3 font-heading text-3xl tracking-tight">
                  A quiet room for their photos.
                </h2>
                <Button
                  className="mt-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  asChild
                >
                  <Link href="/g/demo-gal_1">Preview gallery</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-border/70 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-quiet text-center">Workflow</p>
          <h2 className="mt-3 text-center font-heading text-4xl tracking-tight sm:text-5xl">
            Four steps.
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="border-t border-primary/80 pt-5">
                <span className="label-quiet text-foreground">{step.n}</span>
                <h3 className="mt-2 font-heading text-2xl tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="label-quiet">Early access</p>
          <h2 className="mx-auto mt-3 max-w-xl font-heading text-4xl tracking-tight sm:text-5xl">
            Ready for a cleaner delivery?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Free during MVP. Unlimited galleries while we build.
          </p>
          <Button
            size="lg"
            className="mt-8 rounded-md bg-primary px-8 text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/signup">Get early access</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
