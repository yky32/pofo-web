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
    description: "Previews first. Originals when you’re ready.",
  },
  {
    icon: Shield,
    title: "Private links",
    description: "Password and expiry, gently secured.",
  },
  {
    icon: Heart,
    title: "Proofing",
    description: "Clients pick favorites without the chaos.",
  },
  {
    icon: Timer,
    title: "Timed downloads",
    description: "Access that closes when the job does.",
  },
];

const steps = [
  { n: "1", title: "Upload", body: "Drop the set after offline edit." },
  { n: "2", title: "Share", body: "Send one calm private link." },
  { n: "3", title: "Select", body: "They heart their favorites." },
  { n: "4", title: "Deliver", body: "Finals in. Portfolio optional." },
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="lg:col-span-5">
            <span className="inline-flex rounded-full bg-rose/10 px-3 py-1 text-xs font-medium text-rose">
              Design v4 · Soft Atelier
            </span>
            <h1 className="mt-5 font-heading text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Deliver with
              <br />
              <span className="text-rose">soft hands.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Beautiful private galleries and easy proofing — warm, simple, and
              made for wedding photographers.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="rounded-full bg-rose px-7 hover:bg-rose/90"
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
                className="rounded-full border-border bg-card/60"
                asChild
              >
                <Link href="/dashboard">See the studio</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free during MVP · No credit card
            </p>
          </div>

          <div className="relative lg:col-span-7">
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-7">
                <PhotoFrame
                  src={studioPhotos.heroMain}
                  alt="Wedding couple"
                  priority
                  aspect="aspect-[4/5]"
                  sizes="(max-width:1024px) 60vw, 40vw"
                />
              </div>
              <div className="col-span-5 flex flex-col gap-3 sm:gap-4 pt-8">
                <PhotoFrame
                  src={studioPhotos.rings}
                  alt="Detail"
                  aspect="aspect-square"
                  sizes="25vw"
                />
                <PhotoFrame
                  src={studioPhotos.ceremony}
                  alt="Ceremony"
                  aspect="aspect-[4/5]"
                  sizes="25vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/40 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-soft mb-6 text-center">Moments, gently framed</p>
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

      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <p className="label-soft">Features</p>
            <h2 className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
              Everything after the shoot, simplified.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="panel p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose/10 text-rose">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h3 className="font-heading text-xl font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="look" className="pb-8 sm:pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="relative aspect-[21/9] min-h-[260px]">
              <PhotoImage
                src={studioPhotos.golden}
                alt="Client gallery"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
              <div className="absolute inset-0 flex items-center p-6 sm:p-12">
                <div className="max-w-md">
                  <p className="label-soft">Client view</p>
                  <h2 className="mt-2 font-heading text-3xl font-medium tracking-tight sm:text-4xl">
                    They open a link.
                    <br />
                    It feels like care.
                  </h2>
                  <Button
                    className="mt-6 rounded-full bg-primary hover:bg-primary/90"
                    asChild
                  >
                    <Link href="/g/demo-gal_1">Preview client gallery</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="label-soft">Workflow</p>
            <h2 className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
              Four soft steps.
            </h2>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="panel p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose/15 text-sm font-semibold text-rose">
                  {step.n}
                </span>
                <h3 className="mt-4 font-heading text-xl font-medium">
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

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="panel relative overflow-hidden px-6 py-12 sm:px-12 sm:py-16">
            <div className="absolute -right-6 top-0 hidden h-full w-2/5 opacity-80 md:block">
              <div className="relative h-full w-full">
                <PhotoImage
                  src={studioPhotos.portrait}
                  alt=""
                  sizes="40vw"
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-card via-card/70 to-transparent" />
              </div>
            </div>
            <div className="relative max-w-md">
              <p className="label-soft">Early access</p>
              <h2 className="mt-2 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
                Ready for a softer delivery?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Join free during MVP. Unlimited galleries while we build.
              </p>
              <Button
                size="lg"
                className="mt-8 rounded-full bg-rose px-7 hover:bg-rose/90"
                asChild
              >
                <Link href="/signup">Get early access</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
