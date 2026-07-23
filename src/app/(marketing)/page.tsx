import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Link2,
  Shield,
  Timer,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoFrame } from "@/components/photo/photo-frame";
import { FilmStrip } from "@/components/photo/film-strip";
import { PhotoImage } from "@/components/photo/photo-image";
import { studioPhotos } from "@/lib/photos";

const features = [
  {
    icon: Upload,
    title: "JPEG + RAW",
    description: "Previews first. Originals when you say so.",
  },
  {
    icon: Shield,
    title: "Private links",
    description: "Password + expiry. Your files, your rules.",
  },
  {
    icon: Heart,
    title: "Client proofing",
    description: "They pick favorites. You keep the chat clean.",
  },
  {
    icon: Timer,
    title: "Timed downloads",
    description: "RAW access that doesn’t live forever.",
  },
];

const steps = [
  { n: "01", title: "Upload", body: "Drop the set after your offline edit." },
  { n: "02", title: "Share", body: "Send a private gallery link." },
  { n: "03", title: "Select", body: "Client marks favorites in minutes." },
  { n: "04", title: "Deliver", body: "Upload finals. Optional portfolio." },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero — image-first + quiet breathing motion */}
      <section className="relative overflow-hidden">
        {/* Soft ambient glows */}
        <div
          aria-hidden
          className="hero-glow pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,oklch(0.92_0.04_75/0.55),transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden
          className="hero-glow-delay pointer-events-none absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,oklch(0.9_0.03_40/0.4),transparent_70%)] blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:pb-24 lg:pt-16">
          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="hero-enter text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
              Client delivery for photographers
            </p>
            <h1 className="hero-enter hero-enter-delay-1 mt-4 font-heading text-5xl font-medium leading-[1.05] tracking-tight text-stone-900 sm:text-6xl lg:text-[3.5rem]">
              Deliver photos
              <br />
              <span className="text-stone-500">like they deserve.</span>
            </h1>
            <p className="hero-enter hero-enter-delay-2 mt-6 max-w-md text-base leading-relaxed text-stone-600 sm:text-lg">
              Private galleries. Simple proofing. No Drive folders. Just a
              beautiful handoff from shoot to client.
            </p>
            <div className="hero-enter hero-enter-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="hero-cta-pulse rounded-full bg-stone-900 px-7 text-stone-50 hover:bg-stone-800"
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
                className="rounded-full border-stone-300 bg-transparent"
                asChild
              >
                <Link href="/dashboard">See the studio</Link>
              </Button>
            </div>
            <p className="hero-enter hero-enter-delay-4 mt-5 text-sm text-stone-400">
              Free during MVP · No credit card
            </p>
          </div>

          {/* Photo collage — staggered breathe */}
          <div className="relative lg:col-span-7">
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="hero-breathe col-span-7 row-span-2">
                <PhotoFrame
                  src={studioPhotos.heroMain}
                  alt="Wedding couple portrait"
                  priority
                  aspect="aspect-[4/5]"
                  sizes="(max-width:1024px) 60vw, 40vw"
                  className="h-full shadow-[0_20px_50px_-18px_rgba(28,25,23,0.22)]"
                  imageClassName="hero-image-ken"
                />
              </div>
              <div className="hero-breathe-delay col-span-5">
                <PhotoFrame
                  src={studioPhotos.rings}
                  alt="Ring detail"
                  aspect="aspect-square"
                  sizes="25vw"
                  className="shadow-[0_16px_40px_-16px_rgba(28,25,23,0.18)]"
                />
              </div>
              <div className="hero-breathe-delay-2 col-span-5">
                <PhotoFrame
                  src={studioPhotos.ceremony}
                  alt="Ceremony moment"
                  aspect="aspect-[4/5]"
                  sizes="25vw"
                  className="shadow-[0_16px_40px_-16px_rgba(28,25,23,0.18)]"
                />
              </div>
            </div>
            <div className="hero-float-chip pointer-events-none absolute -bottom-4 -left-2 hidden sm:block lg:-left-6">
              <div className="paper rounded-[5px] px-3 py-2 text-xs text-stone-500 shadow-[0_12px_28px_-12px_rgba(28,25,23,0.2)]">
                <span className="font-heading text-base text-stone-800">
                  286
                </span>{" "}
                photos · shared privately
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Film strip band — light glass strip */}
      <section className="border-y border-stone-900/5 bg-white/50 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FilmStrip
            photos={[
              studioPhotos.heroSideA,
              studioPhotos.golden,
              studioPhotos.kiss,
              studioPhotos.outdoor,
            ]}
          />
          <p className="mt-4 text-center text-xs tracking-[0.2em] text-stone-400 uppercase">
            Your work, presented with care
          </p>
        </div>
      </section>

      {/* Features — simple cards with photo accents */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
              Features
            </p>
            <h2 className="mt-3 font-heading text-4xl font-medium tracking-tight text-stone-900 sm:text-5xl">
              Built around the photo, not the software.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="paper rounded-[5px] p-6 transition hover:shadow-[0_16px_40px_-20px_rgba(28,25,23,0.2)]"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h3 className="font-heading text-xl font-medium text-stone-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Look — full-bleed photo frame (100% width) */}
      <section id="look" className="relative w-full">
        <div className="relative w-full overflow-hidden film-grain">
          <div className="relative h-[70vh] min-h-[360px] w-full sm:h-[80vh] sm:min-h-[480px]">
            <PhotoImage
              src={studioPhotos.golden}
              alt="Golden hour couple"
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/70 via-stone-950/30 to-transparent" />
            <div className="absolute inset-0 flex items-end p-6 sm:p-10 md:p-14">
              <div className="mx-auto w-full max-w-6xl">
                <div className="max-w-md text-white">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                    Client view
                  </p>
                  <h2 className="mt-2 font-heading text-3xl font-medium sm:text-4xl md:text-5xl">
                    They open a link.
                    <br />
                    They fall in love with the set.
                  </h2>
                  <Button
                    className="mt-6 rounded-full bg-white text-stone-900 hover:bg-stone-100"
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


      {/* Workflow — neat numbered */}
      <section id="workflow" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
              Workflow
            </p>
            <h2 className="mt-3 font-heading text-4xl font-medium tracking-tight text-stone-900 sm:text-5xl">
              Four steps. Done.
            </h2>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-[5px] bg-stone-200/40 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="bg-white/70 p-7 backdrop-blur-sm">
                <span className="font-mono text-xs tracking-widest text-stone-400">
                  {step.n}
                </span>
                <h3 className="mt-3 font-heading text-2xl font-medium text-stone-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA with photo strip */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="paper relative overflow-hidden rounded-[5px] px-6 py-12 sm:px-12 sm:py-16">
            <div className="absolute -right-8 top-0 hidden h-full w-1/2 opacity-90 md:block">
              <div className="relative h-full w-full">
                <PhotoImage
                  src={studioPhotos.portrait}
                  alt=""
                  sizes="40vw"
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.99_0.005_80)] via-[oklch(0.99_0.005_80_/_0.7)] to-transparent" />
              </div>
            </div>
            <div className="relative max-w-md">
              <h2 className="font-heading text-4xl font-medium tracking-tight text-stone-900 sm:text-5xl">
                Ready for a cleaner delivery?
              </h2>
              <p className="mt-4 text-stone-500">
                Join early access. Unlimited galleries while we build the MVP.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full bg-stone-900 px-7 text-stone-50 hover:bg-stone-800"
                  asChild
                >
                  <Link href="/signup">
                    Get early access
                    <Link2 className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
