"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Upload } from "lucide-react";
import { registerUploadedShots } from "@/actions/shots";
import {
  prepareBatchUpload,
  type UploadBackend,
  type UploadSlot,
} from "@/actions/uploads";
import { Button } from "@/components/ui/button";
import {
  makeClientThumbnail,
  thumbnailObjectKey,
} from "@/lib/client-thumb";
import { createClient } from "@/lib/supabase/client";
import { chunkArray, runPool, withRetry } from "@/lib/upload-pool";
import { cn } from "@/lib/utils";

const MAX_BYTES = 30 * 1024 * 1024;
const MAX_FILES_PER_PICK = 800;
const CONCURRENCY = 5;
const PREPARE_CHUNK = 100;
const REGISTER_CHUNK = 50;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg";

type FileStatus = "queued" | "uploading" | "done" | "failed";

type FileItem = {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
};

export type PhotoUploadVariant = "hero" | "compact";

function friendlyUploadError(raw: string): string {
  const m = raw.toLowerCase();
  if (
    m.includes("row-level security") ||
    m.includes("violates row-level") ||
    m.includes("rls")
  ) {
    return "Storage permission blocked this file. Ask your admin to re-run supabase/storage.sql, then retry.";
  }
  if (m.includes("bucket not found") || m.includes("not found")) {
    return "Photo storage isn’t set up yet. Run supabase/storage.sql in the Supabase SQL Editor.";
  }
  if (m.includes("payload too large") || m.includes("maximum allowed")) {
    return "File is too large (max 30MB).";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Network error — check your connection and retry.";
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("session")) {
    return "Session expired — refresh the page and sign in again.";
  }
  // Keep short; drop noisy prefixes
  return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
}

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
    throw new Error(`Upload failed (${res.status})`);
  }
}

async function putToSupabase(slot: UploadSlot, file: File) {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("shots")
    .upload(slot.storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: slot.contentType || file.type || "image/jpeg",
    });
  if (error) throw new Error(error.message);
}

export function PhotoUpload({
  projectId,
  variant = "compact",
  className,
}: {
  projectId: string;
  variant?: PhotoUploadVariant;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<FileItem[]>([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const patchItem = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  async function runUpload(fileList: File[]) {
    setError(null);
    setSuccess(null);
    setShowDetails(false);

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
      (f) =>
        f.type && !f.type.startsWith("image/") && !/\.jpe?g$/i.test(f.name)
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
      const slotByClientId = new Map<string, UploadSlot>();
      let activeBackend: UploadBackend = "supabase";

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
          setError(friendlyUploadError(prepared.error));
          return;
        }

        activeBackend = prepared.backend;
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
        thumbnailKey?: string | null;
      };

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

        // Best-effort web thumbnail (does not fail the upload)
        let thumbnailKey: string | null = null;
        try {
          const thumbBlob = await makeClientThumbnail(item.file);
          if (thumbBlob) {
            const thumbPath = thumbnailObjectKey(slot.storagePath);
            const thumbFile = new File(
              [thumbBlob],
              `thumb-${item.file.name.replace(/\.[^.]+$/, "")}.jpg`,
              { type: "image/jpeg" }
            );
            const thumbSlot: UploadSlot = {
              ...slot,
              storagePath: thumbPath,
              contentType: "image/jpeg",
              uploadUrl: null, // R2 needs a separate prepare — use Supabase path for thumbs when possible
            };
            if (activeBackend === "r2") {
              // Skip R2 thumb without presign; full res is enough
            } else {
              await putToSupabase(thumbSlot, thumbFile);
              thumbnailKey = thumbPath;
            }
          }
        } catch {
          /* ignore thumb failures */
        }

        patchItem(item.id, { status: "done" });
        return {
          storagePath: slot.storagePath,
          previewUrl: slot.previewUrl,
          filename: item.file.name,
          mimeType: item.file.type || "image/jpeg",
          sizeBytes: item.file.size,
          thumbnailKey,
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
          patchItem(queue[i].id, {
            status: "failed",
            error: friendlyUploadError(msg),
          });
        }
      });

      if (uploaded.length === 0) {
        const firstFail = items.find((i) => i.status === "failed")?.error;
        // items state may be stale; pull from settled
        const reason =
          settled.find((r) => r.status === "rejected") &&
          settled.find((r): r is PromiseRejectedResult => r.status === "rejected")
            ? friendlyUploadError(
                settled.find((r): r is PromiseRejectedResult => r.status === "rejected")!
                  .reason instanceof Error
                  ? (
                      settled.find(
                        (r): r is PromiseRejectedResult => r.status === "rejected"
                      )!.reason as Error
                    ).message
                  : "Upload failed"
              )
            : null;
        setError(
          reason
            ? `Couldn’t upload any photos. ${reason}`
            : "Couldn’t upload any photos. Check connection and try again."
        );
        void firstFail;
        return;
      }

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
            `Files reached storage, but saving the gallery failed: ${friendlyUploadError(result.error)}`
          );
          break;
        }
        registered += result.registered ?? chunk.length;
        sortStart = result.nextSortOrder;
      }

      const failed = queue.length - uploaded.length;
      if (registered > 0) {
        setSuccess(
          failed > 0
            ? `${registered} photos added · ${failed} failed`
            : `${registered} photo${registered === 1 ? "" : "s"} added`
        );
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(
        friendlyUploadError(e instanceof Error ? e.message : "Upload failed.")
      );
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
  const showProgress = busy || (total > 0 && (busy || failedCount > 0 || success));
  const isHero = variant === "hero";

  return (
    <div className={cn("w-full", className)}>
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
          "rounded-[8px] border border-dashed transition-colors",
          isHero ? "px-6 py-14 sm:py-16" : "px-4 py-4",
          dragOver
            ? "border-stone-400 bg-stone-100/90"
            : isHero
              ? "border-stone-200/90 bg-stone-50/40"
              : "border-stone-200 bg-white/50"
        )}
      >
        <div
          className={cn(
            "flex gap-3",
            isHero
              ? "flex-col items-center text-center"
              : "flex-wrap items-center"
          )}
        >
          {isHero ? (
            <>
              <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900/5 text-stone-700">
                <ImagePlus className="h-5 w-5" />
              </div>
              <p className="font-heading text-xl text-stone-900">
                Start this delivery
              </p>
              <p className="max-w-sm text-sm text-stone-500">
                Drop a batch of wedding JPEGs here, or choose files from your
                computer. Up to 30MB each.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 rounded-full bg-stone-900 px-5 text-stone-50 hover:bg-stone-800"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {busy ? "Uploading…" : "Choose photos"}
              </Button>
            </>
          ) : (
            <>
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
                Drop files here · JPEG / PNG · max 30MB
              </p>
            </>
          )}
        </div>

        {showProgress && busy ? (
          <div className={cn("space-y-1.5", isHero ? "mx-auto mt-8 max-w-sm" : "mt-4")}>
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

      {error ? (
        <div
          className={cn(
            "mt-3 rounded-[8px] border border-rose-200/80 bg-rose-50/90 px-3.5 py-3 text-left",
            isHero && "mx-auto max-w-md"
          )}
        >
          <p className="text-sm font-medium text-rose-900">
            {failedCount > 0
              ? `Couldn’t save ${failedCount} photo${failedCount === 1 ? "" : "s"}`
              : "Upload failed"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rose-800/90">{error}</p>
          {items.some((i) => i.status === "failed") ? (
            <button
              type="button"
              className="mt-2 text-[11px] font-medium text-rose-700 underline-offset-2 hover:underline"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "Hide details" : "Show file details"}
            </button>
          ) : null}
          {showDetails ? (
            <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto text-[11px] text-rose-700/80">
              {items
                .filter((i) => i.status === "failed")
                .slice(0, 20)
                .map((i) => (
                  <li key={i.id} className="truncate">
                    {i.file.name}
                    {i.error ? ` — ${i.error}` : ""}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {success ? (
        <p
          className={cn(
            "mt-2 text-xs text-emerald-700",
            isHero && "text-center"
          )}
        >
          {success}
        </p>
      ) : null}
    </div>
  );
}
