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
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2 text-muted-foreground"
        asChild
      >
        <Link href="/dashboard/galleries">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Galleries
        </Link>
      </Button>

      <section className="relative overflow-hidden rounded-lg border border-border">
        <div className="relative aspect-[21/8] min-h-[180px]">
          <PhotoImage src={cover} alt={gallery.title} sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <GalleryStatusBadge
                status={gallery.status}
                className="bg-white/95"
              />
              <span className="font-mono text-[10px] text-white/70">
                {gallery.photo_count} FRAMES
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
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
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <Button variant="outline" size="sm">
          <Link2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button size="sm" className="bg-steel hover:bg-steel/90">
          <Download className="mr-2 h-4 w-4" />
          Export selection
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="label-lab">Frames</p>
          <p className="mt-1 text-2xl font-semibold">{gallery.photo_count ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="label-lab">Selected</p>
          <p className="mt-1 text-2xl font-semibold">
            {gallery.selection_count ?? 0}
            <span className="text-base text-muted-foreground">
              /{gallery.selection_limit}
            </span>
          </p>
        </div>
        <div className="panel p-4">
          <p className="label-lab">Client link</p>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {sharePreview}
          </p>
          <Button variant="secondary" size="sm" className="mt-2" asChild>
            <Link href={`/g/demo-${gallery.id}`} target="_blank">
              Open client view
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="photos">
        <TabsList className="h-9">
          <TabsTrigger value="photos">Contact sheet</TabsTrigger>
          <TabsTrigger value="selections">Selections</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="photos" className="mt-4">
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 sm:gap-1.5">
            {sheet.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="photo-edge relative aspect-square ring-1 ring-border"
              >
                <PhotoImage src={src} alt={`Frame ${i + 1}`} sizes="20vw" />
                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/50 px-1 font-mono text-[8px] text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="selections" className="mt-4">
          <div className="panel p-8 text-center">
            <p className="text-lg font-semibold">
              {gallery.selection_count ?? 0} favorites
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Client picks appear here.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <div className="panel p-8">
            <p className="font-semibold">Gallery settings</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Password, expiry, RAW window — next.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
