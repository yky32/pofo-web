import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Link2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryStatusBadge } from "@/components/gallery-status-badge";
import { PhotoImage } from "@/components/photo/photo-image";
import { mockGalleries } from "@/lib/mock-data";
import { contactSheet, galleryCovers, studioPhotos } from "@/lib/photos";
import { getAppUrl } from "@/lib/env";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gallery = mockGalleries.find((g) => g.id === id);

  if (!gallery) notFound();

  const cover = galleryCovers[gallery.id] ?? studioPhotos.studio;
  const sharePreview = `${getAppUrl()}/g/demo-${gallery.id}`;
  const sheet = contactSheet.slice(0, 15);

  return (
    <div className="space-y-10">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2 text-neutral-500"
        asChild
      >
        <Link href="/dashboard/galleries">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Galleries
        </Link>
      </Button>

      <section className="relative aspect-[21/9] min-h-[200px] overflow-hidden bg-neutral-100">
        <PhotoImage src={cover} alt={gallery.title} sizes="100vw" priority />
      </section>

      <div className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <GalleryStatusBadge status={gallery.status} />
            <span className="label-micro">
              {gallery.photo_count} photos
            </span>
          </div>
          <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight text-neutral-900 sm:text-4xl">
            {gallery.title}
          </h1>
          <p className="mt-2 text-neutral-500">
            {gallery.client_name}
            {gallery.description ? ` · ${gallery.description}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-none border-neutral-300"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none border-neutral-300"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button
            size="sm"
            className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-8 border-b border-neutral-200 pb-8 sm:grid-cols-3">
        <div>
          <p className="label-micro">Photos</p>
          <p className="mt-2 font-heading text-3xl font-medium">
            {gallery.photo_count ?? 0}
          </p>
        </div>
        <div>
          <p className="label-micro">Selected</p>
          <p className="mt-2 font-heading text-3xl font-medium">
            {gallery.selection_count ?? 0}
            <span className="text-lg text-neutral-400">
              /{gallery.selection_limit}
            </span>
          </p>
        </div>
        <div>
          <p className="label-micro">Client link</p>
          <p className="mt-2 truncate text-sm text-neutral-500">{sharePreview}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-none border-neutral-300"
            asChild
          >
            <Link href={`/g/demo-${gallery.id}`} target="_blank">
              Open client view
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="photos">
        <TabsList className="h-auto rounded-none border-b border-neutral-200 bg-transparent p-0">
          <TabsTrigger
            value="photos"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Contact sheet
          </TabsTrigger>
          <TabsTrigger
            value="selections"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Selections
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="photos" className="mt-8">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 sm:gap-3">
            {sheet.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="photo-edge relative aspect-square"
              >
                <PhotoImage src={src} alt={`Frame ${i + 1}`} sizes="20vw" />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="selections" className="mt-8">
          <div className="border border-neutral-200 p-10 text-center">
            <p className="font-heading text-xl font-medium">
              {gallery.selection_count ?? 0} favorites
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Client picks appear here.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="settings" className="mt-8">
          <div className="border border-neutral-200 p-10">
            <p className="font-heading text-xl font-medium">Settings</p>
            <p className="mt-2 text-sm text-neutral-500">
              Password, expiry, RAW window — next.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
