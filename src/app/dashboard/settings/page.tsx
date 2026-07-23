import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="label-micro">Account</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-neutral-900">
          Settings
        </h1>
        <p className="mt-2 text-neutral-500">Studio profile.</p>
      </div>

      <div className="space-y-5 border border-neutral-200 p-6">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input
            id="studio"
            defaultValue="Light & Frame Studio"
            className="rounded-none border-neutral-300"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            defaultValue="Wayne"
            className="rounded-none border-neutral-300"
          />
        </div>
        <Button className="rounded-none bg-neutral-900 text-white hover:bg-neutral-800">
          Save
        </Button>
      </div>
    </div>
  );
}
