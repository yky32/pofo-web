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
    description: "Clients select favorites. You stay focused.",
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
      {/* Hero — museum wall */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <p className="label-micro">Design v3 · White Cube</p>
          <h1 className="mt-6 max-w-3xl font-heading text-5xl font-medium leading-[1.02] tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
            Space for the work.
            <br />
            <span className="text-neutral-400">Nothing else.</span>
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-neutral-500">
            Private client galleries with room to breathe. Simple proofing.
            Professional delivery — without the noise.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="rounded-none bg-neutral-900 px-8 text-white hover:bg-neutral-800"
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
              className="rounded-none border-neutral-300"
              asChild
            >
              <Link href="/dashboard">View studio</Link>
            </Button>
          </div>
        </div>

        {/* Full-width photo band */}
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid grid-cols-12 gap-2 sm:gap-3">
            <div className="col-span-7">
              <PhotoFrame
                src={studioPhotos.heroMain}
                alt="Wedding portrait"
                priority
                aspect="aspect-[5/4]"
                sizes="60vw"
              />
            </div>
            <div className="col-span-5 flex flex-col gap-2 sm:gap-3">
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

      {/* Quiet strip */}
      <section className="border-b border-neutral-200 bg-neutral-50 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-micro mb-6 text-center">Selected work</p>
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

      {/* Features */}
      <section id="features" className="border-b border-neutral-200 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="label-micro">Features</p>
            <h2 className="mt-4 font-heading text-4xl font-medium tracking-tight text-neutral-900 sm:text-5xl">
              Only what you need after the shoot.
            </h2>
          </div>

          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <Icon className="h-5 w-5 text-neutral-900" strokeWidth={1.25} />
                <h3 className="mt-5 font-heading text-xl font-medium tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Look */}
      <section id="look" className="border-b border-neutral-200">
        <div className="relative">
          <div className="relative aspect-[21/9] min-h-[280px]">
            <PhotoImage
              src={studioPhotos.golden}
              alt="Client gallery"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-white/10" />
            <div className="absolute inset-0 flex items-end">
              <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
                <div className="max-w-md bg-white/95 p-6 backdrop-blur sm:p-8">
                  <p className="label-micro">Client view</p>
                  <h2 className="mt-3 font-heading text-3xl font-medium tracking-tight text-neutral-900">
                    A quiet room for their photos.
                  </h2>
                  <Button
                    className="mt-6 rounded-none bg-neutral-900 text-white hover:bg-neutral-800"
                    asChild
                  >
                    <Link href="/g/demo-gal_1">Preview gallery</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="border-b border-neutral-200 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-micro text-center">Workflow</p>
          <h2 className="mt-4 text-center font-heading text-4xl font-medium tracking-tight sm:text-5xl">
            Four steps.
          </h2>

          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="border-t border-neutral-900 pt-6">
                <span className="label-micro text-neutral-900">{step.n}</span>
                <h3 className="mt-3 font-heading text-2xl font-medium tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="label-micro">Early access</p>
          <h2 className="mx-auto mt-4 max-w-xl font-heading text-4xl font-medium tracking-tight sm:text-5xl">
            Ready for a cleaner wall?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-neutral-500">
            Join the waitlist. Free during MVP.
          </p>
          <Button
            size="lg"
            className="mt-8 rounded-none bg-neutral-900 px-8 text-white hover:bg-neutral-800"
            asChild
          >
            <Link href="/signup">Get early access</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
