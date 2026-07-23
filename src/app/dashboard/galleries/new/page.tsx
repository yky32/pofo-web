import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewGalleryPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="label-quiet">Create</p>
        <h1 className="mt-2 font-heading text-3xl tracking-tight">
          New gallery
        </h1>
        <p className="mt-2 text-muted-foreground">Name the set. Upload next.</p>
      </div>

      <div className="panel space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Alicia & James — Wedding"
            className="rounded-md"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Client name</Label>
          <Input id="client" placeholder="Alicia Chen" className="rounded-md" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="limit">Selection limit</Label>
          <Input
            id="limit"
            type="number"
            defaultValue={40}
            min={1}
            max={200}
            className="rounded-md"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/dashboard/galleries/gal_1">Create</Link>
          </Button>
          <Button variant="outline" className="rounded-md" asChild>
            <Link href="/dashboard/galleries">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
