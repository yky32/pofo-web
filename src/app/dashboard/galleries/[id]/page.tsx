import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import {
  countProjectSelections,
  listProjectShots,
} from "@/actions/shots";
import { getProject } from "@/actions/projects";
import { listShareLinks } from "@/actions/share";
import { GalleryStatusBadge } from "@/components/gallery-status-badge";
import { PhotoImage } from "@/components/photo/photo-image";
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
  let selectionCount = 0;
  let shareLinks: Awaited<ReturnType<typeof listShareLinks>> = [];

  if (isSupabaseConfigured()) {
    const real = await getProject(id);
    if (real) {
      gallery = real;
      isDemo = false;
      shots = await listProjectShots(id);
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
    coverFromShot ||
    galleryCovers[gallery.id] ||
    studioPhotos.studio;

  const sheet = isDemo
    ? contactSheet.slice(0, 15)
    : shots
        .map((s) => shotDisplayUrl(s))
        .filter((u): u is string => Boolean(u));

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

      <div className="flex flex-wrap items-start gap-4">
        {!isDemo ? (
          <SeedPhotosButton
            projectId={gallery.id}
            disabled={shots.length > 0}
          />
        ) : null}
        <Button
          size="sm"
          className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          disabled
          title="Coming soon"
        >
          <Download className="mr-2 h-4 w-4" />
          Export selection
        </Button>
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
            Selections
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-full">
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="photos" className="mt-5">
          {sheet.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {sheet.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="group relative aspect-square overflow-hidden rounded-[5px] bg-stone-50 ring-1 ring-white/70"
                >
                  <PhotoImage
                    src={src}
                    alt={`Frame ${i + 1}`}
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
                Add sample photos to try share + client proofing. Real R2
                upload comes next.
              </p>
              {!isDemo ? (
                <div className="mt-6 flex justify-center">
                  <SeedPhotosButton projectId={gallery.id} />
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
        <TabsContent value="selections" className="mt-5">
          <div className="paper rounded-[5px] p-8 text-center">
            <p className="font-heading text-xl text-stone-900">
              {selectedCount} favorites
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {isDemo
                ? "Demo data — connect Supabase for live proofing."
                : clientHref
                  ? "Clients select on the private share link."
                  : "Create a share link so clients can pick favorites."}
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
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <div className="paper rounded-[5px] p-8">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
