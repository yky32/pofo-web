import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Link2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryStatusBadge } from "@/components/gallery-status-badge";
import { PhotoImage } from "@/components/photo/photo-image";
import { getProject } from "@/actions/projects";
import { mockGalleries } from "@/lib/mock-data";
import { contactSheet, galleryCovers, studioPhotos } from "@/lib/photos";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let gallery = mockGalleries.find((g) => g.id === id) ?? null;
  let isDemo = true;

  if (isSupabaseConfigured()) {
    const real = await getProject(id);
    if (real) {
      gallery = real;
      isDemo = false;
    } else if (!gallery) {
      notFound();
    }
  } else if (!gallery) {
    notFound();
  }

  if (!gallery) notFound();

  const cover = galleryCovers[gallery.id] ?? studioPhotos.studio;
  const sharePreview = `${getAppUrl()}/g/demo-${gallery.id}`;
  const sheet = isDemo ? contactSheet.slice(0, 15) : [];

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
                {isDemo
                  ? `${gallery.photo_count ?? 0} photos (demo)`
                  : "No photos yet — upload next"}
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-stone-300"
          disabled
          title="Coming in Phase 2"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload photos
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-stone-300"
          disabled
          title="Coming in Phase 3"
        >
          <Link2 className="mr-2 h-4 w-4" />
          Share link
        </Button>
        <Button
          size="sm"
          className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
          disabled
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
            {gallery.photo_count ?? 0}
          </p>
        </div>
        <div className="paper rounded-[5px] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
            Selected
          </p>
          <p className="mt-1 font-heading text-3xl text-stone-900">
            {gallery.selection_count ?? 0}
            <span className="text-lg text-stone-400">
              /{gallery.selection_limit}
            </span>
          </p>
        </div>
        <div className="paper rounded-[5px] p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
            Client link
          </p>
          <p className="mt-1 truncate text-sm text-stone-600">{sharePreview}</p>
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
              <p className="font-heading text-xl text-stone-900">No photos yet</p>
              <p className="mt-2 text-sm text-stone-500">
                Phase 2 will add R2 upload + contact sheet.
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="selections" className="mt-5">
          <div className="paper rounded-[5px] p-8 text-center">
            <p className="font-heading text-xl text-stone-900">
              {gallery.selection_count ?? 0} favorites
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Client proofing comes after share links.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <div className="paper rounded-[5px] p-8">
            <p className="font-heading text-xl text-stone-900">Project settings</p>
            <p className="mt-2 text-sm text-stone-500">
              Title: {gallery.title}
              <br />
              Client: {gallery.client_name ?? "—"}
              <br />
              Selection limit: {gallery.selection_limit}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
