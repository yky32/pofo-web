import { PhotoFrame } from "@/components/photo/photo-frame";
import { studioPhotos } from "@/lib/photos";

const samples = [
  { src: studioPhotos.kiss, title: "Mei & Kai" },
  { src: studioPhotos.golden, title: "Golden hour" },
  { src: studioPhotos.portrait, title: "Studio study" },
  { src: studioPhotos.ceremony, title: "Ceremony" },
  { src: studioPhotos.outdoor, title: "Outdoor" },
  { src: studioPhotos.rings, title: "Details" },
];

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="label-lab text-steel">Public</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Portfolio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Published finals. Demo frames below.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {samples.map((item) => (
          <PhotoFrame
            key={item.title}
            src={item.src}
            alt={item.title}
            caption={item.title}
            aspect="aspect-[4/5]"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        ))}
      </div>
    </div>
  );
}
