import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="label-soft">Account</p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">Studio profile.</p>
      </div>

      <div className="panel space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input
            id="studio"
            defaultValue="Light & Frame Studio"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" defaultValue="Wayne" className="rounded-xl" />
        </div>
        <Button className="rounded-full bg-rose hover:bg-rose/90">
          Save changes
        </Button>
      </div>
    </div>
  );
}
