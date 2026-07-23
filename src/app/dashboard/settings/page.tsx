import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="label-quiet">Account</p>
        <h1 className="mt-2 font-heading text-3xl tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">Studio profile.</p>
      </div>

      <div className="panel space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input
            id="studio"
            defaultValue="Light & Frame Studio"
            className="rounded-md"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" defaultValue="Wayne" className="rounded-md" />
        </div>
        <Button className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          Save
        </Button>
      </div>
    </div>
  );
}
