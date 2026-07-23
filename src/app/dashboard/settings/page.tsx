import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          Account
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium text-stone-900">
          Settings
        </h1>
        <p className="mt-1 text-stone-500">
          Studio profile shown on galleries and portfolio.
        </p>
      </div>

      <div className="paper space-y-5 rounded-[5px] p-6">
        <div className="space-y-2">
          <Label htmlFor="studio">Studio name</Label>
          <Input
            id="studio"
            defaultValue="Light & Frame Studio"
            className="rounded-[5px] border-stone-300 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            defaultValue="Wayne"
            className="rounded-[5px] border-stone-300 bg-white"
          />
        </div>
        <Button className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800">
          Save changes
        </Button>
      </div>
    </div>
  );
}
