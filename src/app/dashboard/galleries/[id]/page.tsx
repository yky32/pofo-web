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
import { ExportSelectionButton } from "@/components/projects/export-selection-button";
import { MarkFinalButton } from "@/components/projects/mark-final-button";
import { PhotoUpload } from "@/components/projects/photo-upload";
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
  const cover =
    coverFromShot || galleryCovers[gallery.id] || studioPhotos.studio;

  const sheet = isDemo
    ? contactSheet.slice(0, 15).map((src, i) => ({ key: `d-${i}`, src, alt: `Frame ${i + 1}` }))
    : shots
        .map((s) => {
          const src = shotDisplayUrl(s);
          if (!src) return null;
          return { key: s.id, src, alt: s.filename ?? "Photo" };
        })
        .filter((x): x is { key: string; src: string; alt: string } => Boolean(x));

  const photoCount = isDemo ? (gallery.photo_count ?? 0) : shots.length;
  const selectedCount = isDemo
    ? (gallery.selection_count ?? 0)
    : selectionCount;

  const activeLink = shareLinks.find((l) => l.is_active);
  const clientHref = isDemo
    ? `/g/demo-${gallery.id}`
    : activeLink
      ? `/g/${activeLink.token}`
      : null;

  const step =
    photoCount === 0
      ? 1
      : !activeLink && !isDemo
        ? 2
        : selectedCount === 0
          ? 3
          : 4;

  return (
    <div className="space-y-8">
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

      <section className="relative overflow-hidden rounded-[5px] film-grain">
        <div className="relative aspect-[21/9] min-h-[200px]">
          <PhotoImage
            src={cover}
            alt={gallery.title}
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <GalleryStatusBadge
                status={gallery.status}
                className="bg-white/90 text-stone-800"
              />
              <span className="text-xs text-white/60">
                {photoCount} photos
                {isDemo ? " (demo)" : ""}
              </span>
            </div>
            <h1 className="mt-2 font-heading text-3xl font-medium text-white sm:text-4xl">
              {gallery.title}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {gallery.client_name}
              {gallery.description ? ` · ${gallery.description}` : null}
            </p>
          </div>
        </div>
      </section>

      {/* Delivery checklist */}
      {!isDemo ? (
        <ol className="paper flex flex-wrap gap-3 rounded-[5px] p-4 text-xs text-stone-500 sm:gap-6">
          {[
            { n: 1, label: "Add photos" },
            { n: 2, label: "Share link" },
            { n: 3, label: "Client selects" },
            { n: 4, label: "Export / final" },
          ].map((s) => (
            <li
              key={s.n}
              className={
                step >= s.n
                  ? "font-medium text-stone-800"
                  : "text-stone-400"
              }
            >
              <span
                className={
                  step > s.n
                    ? "mr-1.5 text-emerald-600"
                    : step === s.n
                      ? "mr-1.5 text-amber-600"
                      : "mr-1.5"
                }
              >
                {step > s.n ? "✓" : s.n + "."}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        {!isDemo ? (
          <>
            <PhotoUpload projectId={gallery.id} />
            <SeedPhotosButton projectId={gallery.id} />
            <ExportSelectionButton
              projectTitle={gallery.title}
              shots={selectedShots}
            />
            <MarkFinalButton
              projectId={gallery.id}
              disabled={gallery.status === "final"}
            />
          </>
        ) : (
          <p className="text-sm text-stone-500">Demo project — read only.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="paper rounded-[5px] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
            Photos
          </p>
          <p className="mt-1 font-heading text-3xl text-stone-900">
            {photoCount}
          </p>
        </div>
        <div className="paper rounded-[5px] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
            Selected
          </p>
          <p className="mt-1 font-heading text-3xl text-stone-900">
            {selectedCount}
            <span className="text-lg text-stone-400">
              /{gallery.selection_limit}
            </span>
          </p>
        </div>
        <div className="paper rounded-[5px] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
            Client link
          </p>
          {isDemo ? (
            <>
              <p className="mt-1 truncate text-sm text-stone-600">
                {getAppUrl()}/g/demo-{gallery.id}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 rounded-full"
                asChild
              >
                <Link href={`/g/demo-${gallery.id}`} target="_blank">
                  Open client view
                </Link>
              </Button>
            </>
          ) : (
            <div className="mt-3">
              <ShareLinkPanel
                projectId={gallery.id}
                links={shareLinks}
                appUrl={getAppUrl()}
                hasPhotos={shots.length > 0}
              />
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="photos">
        <TabsList className="rounded-full bg-white/60 p-1 ring-1 ring-white/80 backdrop-blur-sm">
          <TabsTrigger value="photos" className="rounded-full">
            Contact sheet
          </TabsTrigger>
          <TabsTrigger value="selections" className="rounded-full">
            Selections ({selectedCount})
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full">
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="photos" className="mt-5">
          {sheet.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {sheet.map((item) => (
                <div
                  key={item.key}
                  className="group relative aspect-square overflow-hidden rounded-[5px] bg-stone-50 ring-1 ring-white/70"
                >
                  <PhotoImage
                    src={item.src}
                    alt={item.alt}
                    sizes="20vw"
                    className="transition duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="paper rounded-[5px] p-10 text-center">
              <p className="font-heading text-xl text-stone-900">
                No photos yet
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Upload from your computer, or add sample photos to try the
                share flow.
              </p>
              {!isDemo ? (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <PhotoUpload projectId={gallery.id} />
                  <SeedPhotosButton projectId={gallery.id} />
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
        <TabsContent value="selections" className="mt-5">
          {isDemo ? (
            <div className="paper rounded-[5px] p-8 text-center">
              <p className="font-heading text-xl text-stone-900">
                {selectedCount} favorites
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Demo data — use a live project for client picks.
              </p>
            </div>
          ) : selectedShots.length > 0 ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-stone-500">
                  Client favorites · {selectedShots.length} of{" "}
                  {gallery.selection_limit}
                </p>
                <ExportSelectionButton
                  projectTitle={gallery.title}
                  shots={selectedShots}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {selectedShots.map((shot) => {
                  const src = shotDisplayUrl(shot);
                  if (!src) return null;
                  return (
                    <div
                      key={shot.id}
                      className="group relative aspect-square overflow-hidden rounded-[5px] bg-stone-50 ring-1 ring-rose-100"
                    >
                      <PhotoImage
                        src={src}
                        alt={shot.filename ?? "Favorite"}
                        sizes="25vw"
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
            <div className="paper rounded-[5px] p-8 text-center">
              <p className="font-heading text-xl text-stone-900">
                No favorites yet
              </p>
              <p className="mt-2 text-sm text-stone-500">
                {clientHref
                  ? "Send the private link — selections appear here."
                  : "Create a share link so the client can pick favorites."}
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
          <div className="paper space-y-4 rounded-[5px] p-8">
            <div>
              <p className="font-heading text-xl text-stone-900">
                Project settings
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Title: {gallery.title}
                <br />
                Client: {gallery.client_name ?? "—"}
                <br />
                Selection limit: {gallery.selection_limit}
                <br />
                Status: {gallery.status}
              </p>
            </div>
            {!isDemo ? (
              <MarkFinalButton
                projectId={gallery.id}
                disabled={gallery.status === "final"}
              />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
