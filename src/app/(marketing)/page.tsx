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
      {/* Immersive HD hero */}
      <section className="relative min-h-[88vh] overflow-hidden">
        <div className="photo-stage absolute inset-0 film-grain">
          <PhotoImage
            src={studioPhotos.heroMain}
            alt="Wedding photography"
            priority
            sizes="100vw"
            className="scale-105 object-cover"
          />
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-stone-950/25 via-stone-950/15 to-[oklch(0.978_0.01_75)]" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-stone-950/40 via-transparent to-transparent" />
          {/* Haze bloom */}
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_30%_70%,oklch(0.95_0.03_70_/_0.25),transparent_50%)]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:justify-center lg:pb-24">
          <div className="glass max-w-xl rounded-3xl p-7 sm:p-9">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
              V1.1 · Photo-first delivery
            </p>
            <h1 className="mt-4 font-heading text-4xl font-medium leading-[1.05] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
              Deliver photos
              <br />
              <span className="text-stone-500">like they deserve.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-stone-600 sm:text-lg">
              Immersive private galleries. Simple proofing. A hazy, beautiful
              handoff from shoot to client.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="rounded-full bg-stone-900/95 px-7 text-stone-50 shadow-lg shadow-stone-900/15 hover:bg-stone-800"
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
                className="rounded-full border-white/60 bg-white/40 backdrop-blur hover:bg-white/60"
                asChild
              >
                <Link href="/dashboard">See the studio</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-stone-400">
              Free during MVP · No credit card
            </p>
          </div>
        </div>
      </section>

      {/* Floating glass collage over haze */}
      <section className="relative -mt-10 pb-8 sm:-mt-16">
        <div className="haze-layer mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative z-10 grid grid-cols-12 gap-3 sm:gap-4">
            <div className="col-span-7">
              <PhotoFrame
                src={studioPhotos.golden}
                alt="Golden hour"
                aspect="aspect-[5/4]"
                sizes="(max-width:1024px) 60vw, 50vw"
              />
            </div>
            <div className="col-span-5 flex flex-col gap-3 sm:gap-4">
              <PhotoFrame
                src={studioPhotos.rings}
                alt="Detail"
                aspect="aspect-square"
                sizes="30vw"
              />
              <PhotoFrame
                src={studioPhotos.ceremony}
                alt="Ceremony"
                aspect="aspect-[4/3]"
                sizes="30vw"
              />
            </div>
          </div>
          <div className="relative z-10 mt-4 flex justify-center">
            <div className="glass-soft rounded-full px-5 py-2 text-xs text-stone-600">
              <span className="font-heading text-base text-stone-800">286</span>
              {" "}photos · shared privately
            </div>
          </div>
        </div>
      </section>

      {/* Immersive full-bleed stage */}
      <section id="immersive" className="relative py-6 sm:py-10">
        <div className="photo-stage relative mx-auto max-w-[1400px] overflow-hidden rounded-[1.75rem] film-grain sm:rounded-[2rem]">
          <div className="relative aspect-[21/9] min-h-[280px] sm:min-h-[420px]">
            <PhotoImage
              src={studioPhotos.outdoor}
              alt="Immersive wedding moment"
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-stone-950/50 via-transparent to-stone-950/10" />
            <div className="absolute inset-x-0 bottom-0 z-[2] p-6 sm:p-10">
              <div className="glass-dark max-w-md rounded-2xl p-5 text-white sm:p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                  Immersive stage
                </p>
                <p className="mt-2 font-heading text-2xl font-medium sm:text-3xl">
                  HD photos, full room.
                </p>
                <p className="mt-2 text-sm text-white/70">
                  Built for moments that need space — not thumbnails in a folder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Film strip */}
      <section className="border-y border-stone-900/5 bg-stone-900/95 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FilmStrip
            photos={[
              studioPhotos.heroSideA,
              studioPhotos.golden,
              studioPhotos.kiss,
              studioPhotos.outdoor,
            ]}
          />
          <p className="mt-4 text-center text-xs tracking-[0.2em] text-stone-500 uppercase">
            Your work, presented with care
          </p>
        </div>
      </section>

      {/* Features — glass cards */}
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

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="glass rounded-2xl p-6 transition hover:shadow-[0_20px_50px_-24px_rgba(28,25,23,0.25)]"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-stone-700 ring-1 ring-white/80">
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

      {/* Look — immersive client CTA */}
      <section id="look" className="pb-8 sm:pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="photo-stage relative overflow-hidden rounded-3xl film-grain">
            <div className="relative aspect-[21/9] min-h-[280px] sm:min-h-[360px]">
              <PhotoImage
                src={studioPhotos.golden}
                alt="Golden hour couple"
                sizes="100vw"
                className="scale-105 object-cover"
              />
              <div className="absolute inset-0 z-[1] bg-gradient-to-r from-stone-950/55 via-stone-950/20 to-transparent" />
              <div className="absolute inset-0 z-[2] flex items-end p-6 sm:p-10">
                <div className="glass-dark max-w-md rounded-2xl p-6 text-white sm:p-8">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                    Client view
                  </p>
                  <h2 className="mt-2 font-heading text-3xl font-medium sm:text-4xl">
                    They open a link.
                    <br />
                    They fall into the set.
                  </h2>
                  <Button
                    className="mt-6 rounded-full bg-white/95 text-stone-900 hover:bg-white"
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

      {/* Workflow */}
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

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="glass rounded-2xl p-7">
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

      {/* CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="glass relative overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-16">
            <div className="absolute -right-8 top-0 hidden h-full w-1/2 md:block">
              <div className="relative h-full w-full opacity-80">
                <PhotoImage
                  src={studioPhotos.portrait}
                  alt=""
                  sizes="40vw"
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.99_0.005_80_/_0.95)] via-[oklch(0.99_0.005_80_/_0.5)] to-transparent" />
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
