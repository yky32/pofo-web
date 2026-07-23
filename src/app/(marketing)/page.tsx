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
    description: "Previews now. Originals on your schedule.",
  },
  {
    icon: Shield,
    title: "Private links",
    description: "Token, password, expiry — controlled access.",
  },
  {
    icon: Heart,
    title: "Proofing",
    description: "Clients select frames. Counts stay clear.",
  },
  {
    icon: Timer,
    title: "Timed downloads",
    description: "RAW windows that close when the job ends.",
  },
];

const steps = [
  { n: "01", title: "Upload", body: "Ingest the set post-edit." },
  { n: "02", title: "Share", body: "Issue a private client link." },
  { n: "03", title: "Select", body: "Capture favorites in-app." },
  { n: "04", title: "Deliver", body: "Push finals. Optional portfolio." },
];

export default function HomePage() {
  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="label-lab text-steel">Design v5 · Contact Lab</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Client delivery,
              <br />
              <span className="text-steel">lab precision.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Private galleries and proofing built like a contact sheet —
              clear, fast, and professional.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="bg-steel hover:bg-steel/90" asChild>
                <Link href="/signup">
                  Start free
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Open studio</Link>
              </Button>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              MVP · no card required
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <PhotoFrame
                src={studioPhotos.heroMain}
                alt="Cover"
                priority
                aspect="aspect-[3/4]"
                sizes="30vw"
                className="col-span-2"
              />
              <div className="flex flex-col gap-2">
                <PhotoFrame
                  src={studioPhotos.rings}
                  alt="Detail"
                  aspect="aspect-square"
                  sizes="15vw"
                />
                <PhotoFrame
                  src={studioPhotos.ceremony}
                  alt="Ceremony"
                  aspect="aspect-[3/4]"
                  sizes="15vw"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 font-mono text-[10px] text-muted-foreground">
              <span>JOB · ALICIA_JAMES_2026</span>
              <span className="text-steel">286 FRAMES · PRIVATE</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/40 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-lab mb-4 text-center">Contact sheet preview</p>
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

      <section id="features" className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-lab text-steel">Features</p>
          <h2 className="mt-2 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the workflow after the shoot.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <Icon className="h-4 w-4 text-steel" strokeWidth={1.75} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="look" className="border-b border-border">
        <div className="relative aspect-[21/9] min-h-[240px]">
          <PhotoImage
            src={studioPhotos.golden}
            alt="Client view"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
              <div className="max-w-md">
                <p className="label-lab text-steel">Client view</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  One link. Full contact sheet.
                </h2>
                <Button className="mt-6 bg-steel hover:bg-steel/90" asChild>
                  <Link href="/g/demo-gal_1">Preview client gallery</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="label-lab text-center text-steel">Workflow</p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Four steps. No noise.
          </h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="panel p-5">
                <span className="font-mono text-xs text-steel">{step.n}</span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="label-lab text-steel">Early access</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready for a cleaner pipeline?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Free during MVP. Unlimited galleries while we build.
          </p>
          <Button size="lg" className="mt-8 bg-steel hover:bg-steel/90" asChild>
            <Link href="/signup">Get early access</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
