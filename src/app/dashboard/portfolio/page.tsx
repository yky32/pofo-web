import { getMyPortfolioPage, listMyPortfolio } from "@/actions/portfolio";
import { getMyProfile } from "@/actions/profile";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { PhotoFrame } from "@/components/photo/photo-frame";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { parsePortfolioPage } from "@/lib/portfolio-page";
import { studioPhotos } from "@/lib/photos";

const samples = [
  { src: studioPhotos.kiss, title: "Mei & Kai" },
  { src: studioPhotos.golden, title: "Golden hour" },
  { src: studioPhotos.portrait, title: "Studio study" },
  { src: studioPhotos.ceremony, title: "Ceremony" },
  { src: studioPhotos.outdoor, title: "Outdoor" },
  { src: studioPhotos.rings, title: "Details" },
];

export default async function PortfolioPage() {
  const configured = isSupabaseConfigured();
  const profile = configured ? await getMyProfile() : null;
  const items = configured ? await listMyPortfolio() : [];
  const studioName =
    profile?.studio_name || profile?.display_name || profile?.slug || null;
  const pageConfig = configured
    ? await getMyPortfolioPage()
    : parsePortfolioPage(null, studioName);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
            Public
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900 sm:text-4xl">
            Portfolio
          </h1>
          <p className="mt-1 max-w-lg text-stone-500">
            Publish approved frames and design your public studio page — theme,
            sections, and contact — without a free-form website builder.
          </p>
        </div>
      </div>

      {configured ? (
        <PortfolioWorkspace
          items={items}
          studioSlug={profile?.slug ?? null}
          studioName={studioName}
          appUrl={getAppUrl()}
          pageConfig={pageConfig}
        />
      ) : (
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
            Supabase is not configured — showing sample layout only.
          </p>
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
      )}
    </div>
  );
}
