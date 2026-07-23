"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { registerUploadedShots } from "@/actions/shots";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_FILES = 40;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export function PhotoUpload({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setSuccess(null);

    const files = Array.from(fileList).slice(0, MAX_FILES);
    const invalid = files.find(
      (f) => f.size > MAX_BYTES || !f.type.startsWith("image/")
    );
    if (invalid) {
      setError("Use images under 20MB (JPEG, PNG, WebP).");
      return;
    }

    setBusy(true);
    setProgress(`Uploading 0 / ${files.length}…`);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in.");
        return;
      }

      const uploaded: {
        storagePath: string;
        previewUrl: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
      }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} / ${files.length}…`);
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${projectId}/${Date.now()}-${i}-${safe}`;

        const { error: upErr } = await supabase.storage
          .from("shots")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "image/jpeg",
          });

        if (upErr) {
          setError(upErr.message);
          break;
        }

        const { data: pub } = supabase.storage.from("shots").getPublicUrl(path);
        uploaded.push({
          storagePath: path,
          previewUrl: pub.publicUrl,
          filename: file.name,
          mimeType: file.type || "image/jpeg",
          sizeBytes: file.size,
        });
      }

      if (uploaded.length === 0) {
        if (!error) setError("Upload failed.");
        return;
      }

      setProgress("Saving to project…");
      const result = await registerUploadedShots({
        projectId,
        files: uploaded,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.success ?? "Uploaded.");
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {busy ? progress || "Uploading…" : "Upload photos"}
      </Button>
      {error ? <p className="text-xs text-red-600/90">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
      <p className="text-xs text-stone-400">
        JPEG / PNG / WebP · up to 20MB each · max {MAX_FILES} at a time
      </p>
    </div>
  );
}
