"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { registerUploadedShots } from "@/actions/shots";
import {
  getUploadBackend,
  prepareBatchUpload,
  type UploadBackend,
  type UploadSlot,
} from "@/actions/uploads";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { chunkArray, runPool, withRetry } from "@/lib/upload-pool";
import { cn } from "@/lib/utils";

const MAX_BYTES = 30 * 1024 * 1024;
const MAX_FILES_PER_PICK = 800;
const CONCURRENCY = 5;
const PREPARE_CHUNK = 100;
const REGISTER_CHUNK = 50;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg";

type FileStatus = "queued" | "uploading" | "done" | "failed";

type FileItem = {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
};

async function putToR2(slot: UploadSlot, file: File) {
  if (!slot.uploadUrl) throw new Error("Missing presigned URL");
  const res = await fetch(slot.uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": slot.contentType || file.type || "image/jpeg",
    },
  });
  if (!res.ok) {
    throw new Error(`R2 upload failed (${res.status})`);
  }
}

async function putToSupabase(slot: UploadSlot, file: File) {
  const supabase = createClient();
  const { error } = await supabase.storage.from("shots").upload(slot.storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: slot.contentType || file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
}

export function PhotoUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [backend, setBackend] = useState<UploadBackend>("supabase");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<FileItem[]>([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    void getUploadBackend().then(setBackend);
  }, []);

  const patchItem = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  async function runUpload(fileList: File[]) {
    setError(null);
    setSuccess(null);

    if (!fileList.length) return;

    if (fileList.length > MAX_FILES_PER_PICK) {
      setError(`Select at most ${MAX_FILES_PER_PICK} photos at a time.`);
      return;
    }

    const tooBig = fileList.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(
        `"${tooBig.name}" is over 30MB. Compress or use RAW delivery later.`
      );
      return;
    }

    const nonImage = fileList.find(
      (f) => f.type && !f.type.startsWith("image/") && !/\.jpe?g$/i.test(f.name)
    );
    if (nonImage) {
      setError("Only image files are supported (JPEG / PNG / WebP / HEIC).");
      return;
    }

    const queue: FileItem[] = fileList.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      status: "queued",
    }));

    setItems(queue);
    setBusy(true);
    setDone(0);
    setTotal(queue.length);

    try {
      // 1) Prepare slots (presign R2 or Supabase paths) in chunks
      const slotByClientId = new Map<string, UploadSlot>();
      let activeBackend: UploadBackend = backend;

      for (const group of chunkArray(queue, PREPARE_CHUNK)) {
        const prepared = await prepareBatchUpload({
          projectId,
          files: group.map((item) => ({
            clientId: item.id,
            filename: item.file.name,
            contentType: item.file.type || "image/jpeg",
            sizeBytes: item.file.size,
          })),
        });

        if (!prepared.ok) {
          setError(prepared.error);
          return;
        }

        activeBackend = prepared.backend;
        setBackend(prepared.backend);
        for (const slot of prepared.slots) {
          slotByClientId.set(slot.clientId, slot);
        }
      }

      type Meta = {
        storagePath: string;
        previewUrl: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
      };

      // 2) Concurrent direct-to-storage PUTs
      const tasks = queue.map((item) => async (): Promise<Meta> => {
        const slot = slotByClientId.get(item.id);
        if (!slot) throw new Error("Missing upload slot");

        patchItem(item.id, { status: "uploading", error: undefined });

        await withRetry(async () => {
          if (activeBackend === "r2") {
            await putToR2(slot, item.file);
          } else {
            await putToSupabase(slot, item.file);
          }
        }, 3);

        patchItem(item.id, { status: "done" });
        return {
          storagePath: slot.storagePath,
          previewUrl: slot.previewUrl,
          filename: item.file.name,
          mimeType: item.file.type || "image/jpeg",
          sizeBytes: item.file.size,
        };
      });

      const settled = await runPool(tasks, CONCURRENCY, (d, t) => {
        setDone(d);
        setTotal(t);
      });

      const uploaded: Meta[] = [];
      settled.forEach((result, i) => {
        if (result.status === "fulfilled") {
          uploaded.push(result.value);
        } else {
          const msg =
            result.reason instanceof Error
              ? result.reason.message
              : "Upload failed";
          patchItem(queue[i].id, { status: "failed", error: msg });
        }
      });

      if (uploaded.length === 0) {
        setError("No photos uploaded. Check connection and try again.");
        return;
      }

      // 3) Register metadata in chunks
      let registered = 0;
      let sortStart: number | undefined;
      for (const chunk of chunkArray(uploaded, REGISTER_CHUNK)) {
        const result = await registerUploadedShots({
          projectId,
          files: chunk,
          sortOrderStart: sortStart,
        });
        if (result.error) {
          setError(
            `Uploaded files, but saving metadata failed: ${result.error}`
          );
          break;
        }
        registered += result.registered ?? chunk.length;
        sortStart = result.nextSortOrder;
      }

      const failed = queue.length - uploaded.length;
      if (registered > 0) {
        const via = activeBackend === "r2" ? "R2" : "Storage";
        setSuccess(
          failed > 0
            ? `${registered} saved via ${via} · ${failed} failed`
            : `${registered} photos added (${via})`
        );
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function onPick(list: FileList | null) {
    if (!list?.length) return;
    void runUpload(Array.from(list));
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (busy) return;
          void runUpload(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "rounded-[5px] border border-dashed px-4 py-5 transition-colors",
          dragOver
            ? "border-stone-400 bg-stone-100/80"
            : "border-stone-200 bg-stone-50/50"
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            className="rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {busy ? "Uploading…" : "Upload photos"}
          </Button>
          <p className="text-xs text-stone-500">
            Drop large batches here · up to 30MB ·{" "}
            <span className="text-stone-600">
              {backend === "r2" ? "Cloudflare R2" : "Supabase Storage"}
            </span>
          </p>
        </div>

        {busy || total > 0 ? (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>
                {done} / {total}
                {failedCount > 0 ? ` · ${failedCount} failed` : ""}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200/80">
              <div
                className="h-full rounded-full bg-stone-900 transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-600/90">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{success}</p> : null}

      {items.some((i) => i.status === "failed") ? (
        <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[11px] text-stone-500">
          {items
            .filter((i) => i.status === "failed")
            .slice(0, 20)
            .map((i) => (
              <li key={i.id} className="truncate text-red-600/80">
                {i.file.name}: {i.error}
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
