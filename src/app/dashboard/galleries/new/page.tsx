import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewGalleryPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="label-micro">Create</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-neutral-900">
          New gallery
        </h1>
        <p className="mt-2 text-neutral-500">Name the set. Upload next.</p>
      </div>

      <div className="space-y-5 border border-neutral-200 p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Alicia & James — Wedding"
            className="rounded-none border-neutral-300"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Client name</Label>
          <Input
            id="client"
            placeholder="Alicia Chen"
            className="rounded-none border-neutral-300"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="limit">Selection limit</Label>
          <Input
            id="limit"
            type="number"
            defaultValue={40}
            min={1}
            max={200}
            className="rounded-none border-neutral-300"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800"
            asChild
          >
            <Link href="/dashboard/galleries/gal_1">Create</Link>
          </Button>
          <Button
            variant="outline"
            className="rounded-none border-neutral-300"
            asChild
          >
            <Link href="/dashboard/galleries">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
