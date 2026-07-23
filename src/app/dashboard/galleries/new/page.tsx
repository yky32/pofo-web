import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewGalleryPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          Create
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900">
          New gallery
        </h1>
        <p className="mt-1 text-stone-500">
          Name the set. Upload comes next.
        </p>
      </div>

      <div className="paper space-y-5 rounded-sm p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Alicia & James — Wedding"
            className="rounded-sm border-stone-300 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Client name</Label>
          <Input
            id="client"
            placeholder="Alicia Chen"
            className="rounded-sm border-stone-300 bg-white"
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
            className="rounded-sm border-stone-300 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
            asChild
          >
            <Link href="/dashboard/galleries/gal_1">Create gallery</Link>
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-stone-300"
            asChild
          >
            <Link href="/dashboard/galleries">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
