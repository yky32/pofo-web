import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="label-lab text-steel">Account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Studio profile.</p>
      </div>

      <div className="panel space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input id="studio" defaultValue="Light & Frame Studio" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" defaultValue="Wayne" />
        </div>
        <Button className="bg-steel hover:bg-steel/90">Save</Button>
      </div>
    </div>
  );
}
