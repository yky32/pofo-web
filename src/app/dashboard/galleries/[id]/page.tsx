import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import {
  countProjectSelections,
  listProjectShots,
  listSelectedShots,
} from "@/actions/shots";
import { getProject } from "@/actions/projects";
import { listShareLinks } from "@/actions/share";
import { GalleryStatusBadge } from "@/components/gallery-status-badge";
import { PhotoImage } from "@/components/photo/photo-image";
import { MosaicGrid } from "@/components/photo/mosaic-grid";
import { ContactSheet } from "@/components/projects/contact-sheet";
import { DeliveryStepper } from "@/components/projects/delivery-stepper";
import { ExportSelectionButton } from "@/components/projects/export-selection-button";
import { PhotoUpload } from "@/components/projects/photo-upload";
import { ProjectStatusControl } from "@/components/projects/project-status-control";
import { PublishToPortfolioButton } from "@/components/projects/publish-to-portfolio-button";
import { SeedPhotosButton } from "@/components/projects/seed-photos-button";
import { ShareLinkPanel } from "@/components/projects/share-link-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { mockGalleries } from "@/lib/mock-data";
import { contactSheet, galleryCovers, studioPhotos } from "@/lib/photos";
import { shotDisplayUrl, type Shot } from "@/types/database";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let gallery = mockGalleries.find((g) => g.id === id) ?? null;
  let isDemo = true;
  let shots: Shot[] = [];
  let selectedShots: Awaited<ReturnType<typeof listSelectedShots>> = [];
  let selectionCount = 0;
  let shareLinks: Awaited<ReturnType<typeof listShareLinks>> = [];

  if (isSupabaseConfigured()) {
    const real = await getProject(id);
    if (real) {
      gallery = real;
      isDemo = false;
      shots = await listProjectShots(id);
      selectedShots = await listSelectedShots(id);
      selectionCount = await countProjectSelections(id);
      shareLinks = await listShareLinks(id);
    } else if (!gallery) {
      notFound();
    }
  } else if (!gallery) {
    notFound();
  }

  if (!gallery) notFound();

  const coverFromShot = shots.map(shotDisplayUrl).find(Boolean);
  const photoCount = isDemo ? (gallery.photo_count ?? 0) : shots.length;
  const hasPhotos = photoCount > 0;
  const cover =
    coverFromShot ||
    (hasPhotos
      ? galleryCovers[gallery.id] || studioPhotos.studio
      : null);

  type SheetItem = {
    id: string;
    src: string;
    alt: string;
    studio_note?: string | null;
    studio_flag?: string | null;
  };

  const sheetItems: SheetItem[] = isDemo
    ? contactSheet.slice(0, 15).map((src, i) => ({
        id: `d-${i}`,
        src,
        alt: `Frame ${i + 1}`,
      }))
    : (shots
        .map((s) => {
          // Prefer web thumbnail when available (faster contact sheet)
          const thumb = s.thumb_url || null;
          const src = thumb || shotDisplayUrl(s);
          if (!src) return null;
          return {
            id: s.id,
            src,
            alt: s.filename ?? "Photo",
            studio_note: s.studio_note ?? null,
            studio_flag: s.studio_flag ?? null,
          } satisfies SheetItem;
        })
        .filter(Boolean) as SheetItem[]);

  const selectedCount = isDemo
    ? (gallery.selection_count ?? 0)
    : selectionCount;

  const activeLink = shareLinks.find((l) => l.is_active);
  const clientHref = isDemo
    ? `/g/demo-${gallery.id}`
    : activeLink
      ? `/g/${activeLink.token}`
      : null;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2 text-stone-500"
        asChild
      >
        <Link href="/dashboard/galleries">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Projects
        </Link>
      </Button>

      {/* Full-width cover — no max-height (that was shrinking width via aspect-ratio) */}
      <section className="relative w-full overflow-hidden rounded-[8px] film-grain">
        <div className="relative h-[220px] w-full bg-stone-200 sm:h-[280px] lg:h-[320px]">
          {cover ? (
            <PhotoImage
              src={cover}
              alt={gallery.title}
              sizes="100vw"
              priority
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-stone-300 via-stone-200 to-stone-100" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <GalleryStatusBadge status={gallery.status} />
              <span className="text-xs text-white/65">
                {photoCount} photo{photoCount === 1 ? "" : "s"}
                {isDemo ? " · demo" : ""}
              </span>
            </div>
            <h1 className="mt-2 font-heading text-3xl font-medium text-white sm:text-4xl">
              {gallery.title}
            </h1>
            {(gallery.client_name || gallery.description) && (
              <p className="mt-1 text-sm text-white/70">
                {[gallery.client_name, gallery.description]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </div>
      </section>

      {!isDemo ? (
        <DeliveryStepper
          photoCount={photoCount}
          hasShareLink={Boolean(activeLink)}
          selectedCount={selectedCount}
          selectionLimit={gallery.selection_limit}
          isFinal={gallery.status === "final"}
        />
      ) : null}

      <div className="w-full min-w-0 space-y-5">
        {!isDemo && hasPhotos ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-stone-200/80 bg-white/60 px-3 py-2.5 backdrop-blur-sm">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <PhotoUpload projectId={gallery.id} variant="compact" />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <ShareLinkPanel
                projectId={gallery.id}
                links={shareLinks}
                appUrl={getAppUrl()}
                hasPhotos={hasPhotos}
              />
              <ExportSelectionButton
                projectTitle={gallery.title}
                allShots={shots}
                proofedShots={selectedShots}
              />
              <ProjectStatusControl
                projectId={gallery.id}
                status={gallery.status}
              />
            </div>
          </div>
        ) : null}

        {isDemo && hasPhotos ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" className="rounded-full" asChild>
              <Link href={`/g/demo-${gallery.id}`} target="_blank">
                Open client view
              </Link>
            </Button>
          </div>
        ) : null}

        {hasPhotos ? (
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-800">{photoCount}</span>{" "}
            photos
            <span className="mx-2 text-stone-300">·</span>
            <span className="font-medium text-stone-800">{selectedCount}</span>
            <span className="text-stone-400">/{gallery.selection_limit}</span>{" "}
            proofed
            {activeLink || isDemo ? (
              <>
                <span className="mx-2 text-stone-300">·</span>
                <span className="text-emerald-700">Link live</span>
              </>
            ) : null}
          </p>
        ) : null}

        <Tabs defaultValue="photos">
          <TabsList className="rounded-full bg-white/60 p-1 ring-1 ring-white/80 backdrop-blur-sm">
            <TabsTrigger value="photos" className="rounded-full">
              Contact sheet
            </TabsTrigger>
            <TabsTrigger value="selections" className="rounded-full">
              Proofing ({selectedCount})
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-5">
            {sheetItems.length > 0 ? (
              isDemo ? (
                <MosaicGrid items={sheetItems} density="studio" />
              ) : (
                <ContactSheet projectId={gallery.id} items={sheetItems} />
              )
            ) : (
              <div className="rounded-[8px] border border-stone-200/70 bg-white/40 px-4 py-6 sm:px-8 sm:py-10">
                {!isDemo ? (
                  <div className="mx-auto max-w-lg space-y-4">
                    <PhotoUpload projectId={gallery.id} variant="hero" />
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <span>or</span>
                        <SeedPhotosButton
                          projectId={gallery.id}
                          variant="link"
                        />
                      </div>
                      <p className="text-[11px] text-stone-400">
                        Client share unlocks after you add photos
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="font-heading text-xl text-stone-900">
                      Demo project
                    </p>
                    <p className="mt-2 text-sm text-stone-500">Read only.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="selections" className="mt-5">
            {isDemo ? (
              <div className="rounded-[8px] border border-stone-200/70 bg-white/40 p-8 text-center">
                <p className="font-heading text-xl text-stone-900">
                  {selectedCount} proofed
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Demo data — use a live project for proofing.
                </p>
              </div>
            ) : selectedShots.length > 0 ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-stone-500">
                    {selectedShots.length} of {gallery.selection_limit} proofed
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <PublishToPortfolioButton
                      projectId={gallery.id}
                      shotIds={selectedShots.map((s) => s.id)}
                    />
                    <ExportSelectionButton
                      projectTitle={gallery.title}
                      allShots={shots}
                      proofedShots={selectedShots}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {selectedShots.map((shot) => {
                    const src = shotDisplayUrl(shot);
                    if (!src) return null;
                    return (
                      <div
                        key={shot.id}
                        className="group relative aspect-square overflow-hidden rounded-[6px] bg-stone-50 ring-1 ring-rose-100/80"
                      >
                        <PhotoImage
                          src={src}
                          alt={shot.filename ?? "Proofed photo"}
                          sizes="20vw"
                        />
                        <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-600 shadow">
                          <Heart className="h-3.5 w-3.5 fill-rose-600" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[8px] border border-stone-200/70 bg-white/40 p-10 text-center">
                <p className="font-heading text-xl text-stone-900">
                  No proofing yet
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                  {photoCount === 0
                    ? "Add photos, then share a link for proofing."
                    : clientHref
                      ? "Send the link — proofed photos show up here."
                      : "Create a client link to start proofing."}
                </p>
                {clientHref ? (
                  <Button
                    className="mt-6 rounded-full"
                    variant="secondary"
                    asChild
                  >
                    <Link href={clientHref} target="_blank">
                      Preview client view
                    </Link>
                  </Button>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-5">
            <div className="max-w-lg space-y-5 rounded-[8px] border border-stone-200/70 bg-white/40 p-6 sm:p-8">
              <div>
                <p className="font-heading text-xl text-stone-900">
                  Project settings
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
                    <dt className="text-stone-400">Title</dt>
                    <dd className="text-right text-stone-800">
                      {gallery.title}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
                    <dt className="text-stone-400">Client</dt>
                    <dd className="text-right text-stone-800">
                      {gallery.client_name ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-stone-100 py-2">
                    <dt className="text-stone-400">Proofing limit</dt>
                    <dd className="text-right text-stone-800">
                      {gallery.selection_limit}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-stone-400">Status</dt>
                    <dd className="text-right">
                      {!isDemo ? (
                        <ProjectStatusControl
                          projectId={gallery.id}
                          status={gallery.status}
                        />
                      ) : (
                        <span className="text-stone-800">{gallery.status}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
