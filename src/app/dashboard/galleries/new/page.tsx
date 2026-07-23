import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewGalleryPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="label-lab text-steel">Create</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          New gallery
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name the job. Upload next.
        </p>
      </div>

      <div className="panel space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Alicia & James — Wedding" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Client name</Label>
          <Input id="client" placeholder="Alicia Chen" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="limit">Selection limit</Label>
          <Input id="limit" type="number" defaultValue={40} min={1} max={200} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="bg-steel hover:bg-steel/90" asChild>
            <Link href="/dashboard/galleries/gal_1">Create</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/galleries">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
