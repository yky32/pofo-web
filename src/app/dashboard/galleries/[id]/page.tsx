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
    <div className="space-y-8">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2 rounded-full text-muted-foreground"
        asChild
      >
        <Link href="/dashboard/galleries">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Galleries
        </Link>
      </Button>

      <section className="relative overflow-hidden rounded-3xl">
        <div className="relative aspect-[21/9] min-h-[200px]">
          <PhotoImage src={cover} alt={gallery.title} sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <GalleryStatusBadge
                status={gallery.status}
                className="bg-white/95 shadow-sm"
              />
              <span className="text-xs text-white/70">
                {gallery.photo_count} photos
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
        <Button variant="outline" size="sm" className="rounded-full">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <Link2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button size="sm" className="rounded-full bg-rose hover:bg-rose/90">
          <Download className="mr-2 h-4 w-4" />
          Export selection
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="label-soft">Photos</p>
          <p className="mt-1 font-heading text-3xl font-medium">
            {gallery.photo_count ?? 0}
          </p>
        </div>
        <div className="panel p-5">
          <p className="label-soft">Selected</p>
          <p className="mt-1 font-heading text-3xl font-medium">
            {gallery.selection_count ?? 0}
            <span className="text-lg text-muted-foreground">
              /{gallery.selection_limit}
            </span>
          </p>
        </div>
        <div className="panel p-5">
          <p className="label-soft">Client link</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {sharePreview}
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
        </div>
      </div>

      <Tabs defaultValue="photos">
        <TabsList className="rounded-full bg-secondary/80 p-1">
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 sm:gap-3">
            {sheet.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="photo-edge relative aspect-square ring-1 ring-black/5"
              >
                <PhotoImage src={src} alt={`Frame ${i + 1}`} sizes="20vw" />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="selections" className="mt-5">
          <div className="panel p-8 text-center">
            <p className="font-heading text-xl font-medium">
              {gallery.selection_count ?? 0} favorites
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Client picks land here. Export, retouch, upload Finals.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <div className="panel p-8">
            <p className="font-heading text-xl font-medium">Gallery settings</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Password, expiry, RAW window — next.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
