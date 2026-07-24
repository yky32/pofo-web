"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Upload } from "lucide-react";
import { registerUploadedShots } from "@/actions/shots";
import {
  prepareBatchUpload,
  type UploadBackend,
  type UploadSlot,
} from "@/actions/uploads";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { Button } from "@/components/ui/button";
import {
  makeClientPreview,
  makeClientThumbnail,
  previewObjectKey,
  thumbnailObjectKey,
} from "@/lib/client-thumb";
import {
  groupFilesByBasename,
  isRawFile,
  maxBytesForFile,
} from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import { chunkArray, runPool, withRetry } from "@/lib/upload-pool";
import { cn } from "@/lib/utils";

const MAX_FILES_PER_PICK = 800;
const CONCURRENCY = 5;
const PREPARE_CHUNK = 100;
const REGISTER_CHUNK = 50;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.cr2,.cr3,.nef,.arw,.dng,.raf,.orf,.rw2,.pef,.srw";

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
    return "File is too large (JPEG 30MB · RAW 100MB).";
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
  const [storageUpgradeOpen, setStorageUpgradeOpen] = useState(false);

  const patchItem = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  // Warn before leaving mid-upload
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  async function putFile(slot: UploadSlot, file: File, backend: UploadBackend) {
    if (backend === "r2") await putToR2(slot, file);
    else await putToSupabase(slot, file);
  }

  async function putDerivative(
    baseSlot: UploadSlot,
    path: string,
    blob: Blob,
    backend: UploadBackend
  ): Promise<string | null> {
    if (backend === "r2") return null; // needs separate presign — skip Phase A
    const file = new File([blob], path.split("/").pop() || "deriv.jpg", {
      type: "image/jpeg",
    });
    const slot: UploadSlot = {
      ...baseSlot,
      storagePath: path,
      contentType: "image/jpeg",
      uploadUrl: null,
    };
    await putToSupabase(slot, file);
    return path;
  }

  async function runUpload(fileList: File[]) {
    setError(null);
    setSuccess(null);
    setShowDetails(false);

    if (!fileList.length) return;

    if (fileList.length > MAX_FILES_PER_PICK) {
      setError(`Select at most ${MAX_FILES_PER_PICK} files at a time.`);
      return;
    }

    for (const f of fileList) {
      const max = maxBytesForFile(f.name, f.type);
      if (f.size > max) {
        const label = isRawFile(f.name, f.type) ? "100MB" : "30MB";
        setError(`"${f.name}" is over ${label}.`);
        return;
      }
    }

    const allowed = fileList.filter((f) => {
      if (isRawFile(f.name, f.type)) return true;
      if (f.type?.startsWith("image/")) return true;
      if (/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) return true;
      return false;
    });
    if (!allowed.length) {
      setError(
        "Only JPEG / PNG / WebP / HEIC / RAW (CR2, NEF, ARW, DNG…) are supported."
      );
      return;
    }

    // Pair JPEG+RAW by basename → one logical shot each
    const groups = groupFilesByBasename(allowed);
    type Logical = {
      id: string;
      displayName: string;
      jpeg?: File;
      raw?: File;
      extras: File[];
    };
    const logical: Logical[] = [];
    for (const g of groups) {
      if (g.jpeg || g.raw) {
        logical.push({
          id: `${Date.now()}-${g.key}-${Math.random().toString(36).slice(2, 7)}`,
          displayName: g.jpeg?.name || g.raw?.name || g.key,
          jpeg: g.jpeg as File | undefined,
          raw: g.raw as File | undefined,
          extras: (g.others as File[]) ?? [],
        });
      }
      for (const o of g.others) {
        logical.push({
          id: `${Date.now()}-x-${Math.random().toString(36).slice(2, 7)}`,
          displayName: o.name,
          jpeg: isRawFile(o.name, o.type) ? undefined : o,
          raw: isRawFile(o.name, o.type) ? o : undefined,
          extras: [],
        });
      }
    }

    // Flat queue for progress UI
    const queue: FileItem[] = [];
    for (const L of logical) {
      if (L.jpeg)
        queue.push({ id: `${L.id}-jpg`, file: L.jpeg, status: "queued" });
      if (L.raw)
        queue.push({ id: `${L.id}-raw`, file: L.raw, status: "queued" });
    }

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
            contentType:
              item.file.type ||
              (isRawFile(item.file.name, item.file.type)
                ? "application/octet-stream"
                : "image/jpeg"),
            sizeBytes: item.file.size,
            assetRole: isRawFile(item.file.name, item.file.type)
              ? "raw"
              : "original",
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
        rawPath?: string | null;
        previewPath?: string | null;
        kind?: "jpeg" | "raw" | "paired";
        processingStatus?: "ready" | "pending";
      };

      // Upload each physical file
      const tasks = queue.map((item) => async () => {
        const slot = slotByClientId.get(item.id);
        if (!slot) throw new Error("Missing upload slot");
        patchItem(item.id, { status: "uploading", error: undefined });
        await withRetry(
          () => putFile(slot, item.file, activeBackend),
          3
        );
        patchItem(item.id, { status: "done" });
        return { item, slot };
      });

      const settled = await runPool(tasks, CONCURRENCY, (d, t) => {
        setDone(d);
        setTotal(t);
      });

      const uploadedById = new Map<
        string,
        { item: FileItem; slot: UploadSlot }
      >();
      settled.forEach((result, i) => {
        if (result.status === "fulfilled") {
          uploadedById.set(queue[i].id, result.value);
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

      if (uploadedById.size === 0) {
        setError("Couldn’t upload any files. Check connection and try again.");
        return;
      }

      // Build register rows (logical shots)
      const registerRows: Meta[] = [];
      for (const L of logical) {
        const jpgUp = L.jpeg ? uploadedById.get(`${L.id}-jpg`) : undefined;
        const rawUp = L.raw ? uploadedById.get(`${L.id}-raw`) : undefined;
        if (!jpgUp && !rawUp) continue;

        let thumbnailKey: string | null = null;
        let previewPath: string | null = null;
        if (jpgUp && activeBackend !== "r2") {
          try {
            const [thumbBlob, prevBlob] = await Promise.all([
              makeClientThumbnail(jpgUp.item.file),
              makeClientPreview(jpgUp.item.file),
            ]);
            if (thumbBlob) {
              thumbnailKey = await putDerivative(
                jpgUp.slot,
                thumbnailObjectKey(jpgUp.slot.storagePath),
                thumbBlob,
                activeBackend
              );
            }
            if (prevBlob) {
              previewPath = await putDerivative(
                jpgUp.slot,
                previewObjectKey(jpgUp.slot.storagePath),
                prevBlob,
                activeBackend
              );
            }
          } catch {
            /* derivatives best-effort */
          }
        }

        if (jpgUp && rawUp) {
          registerRows.push({
            storagePath: jpgUp.slot.storagePath,
            rawPath: rawUp.slot.storagePath,
            previewUrl: jpgUp.slot.previewUrl,
            filename: jpgUp.item.file.name,
            mimeType: jpgUp.item.file.type || "image/jpeg",
            sizeBytes: jpgUp.item.file.size + rawUp.item.file.size,
            thumbnailKey,
            previewPath,
            kind: "paired",
            processingStatus: "ready",
          });
        } else if (jpgUp) {
          registerRows.push({
            storagePath: jpgUp.slot.storagePath,
            previewUrl: jpgUp.slot.previewUrl,
            filename: jpgUp.item.file.name,
            mimeType: jpgUp.item.file.type || "image/jpeg",
            sizeBytes: jpgUp.item.file.size,
            thumbnailKey,
            previewPath,
            kind: "jpeg",
            processingStatus: "ready",
          });
        } else if (rawUp) {
          registerRows.push({
            storagePath: rawUp.slot.storagePath,
            previewUrl: "",
            filename: rawUp.item.file.name,
            mimeType: rawUp.item.file.type || "application/octet-stream",
            sizeBytes: rawUp.item.file.size,
            kind: "raw",
            processingStatus: "pending",
          });
        }
      }

      let registered = 0;
      let sortStart: number | undefined;
      for (const chunk of chunkArray(registerRows, REGISTER_CHUNK)) {
        const result = await registerUploadedShots({
          projectId,
          files: chunk,
          sortOrderStart: sortStart,
        });
        if (result.error) {
          if (result.error.startsWith("STORAGE_LIMIT")) {
            setStorageUpgradeOpen(true);
            setError(null);
          } else {
            setError(
              `Files reached storage, but saving the gallery failed: ${friendlyUploadError(result.error)}`
            );
          }
          break;
        }
        registered += result.registered ?? chunk.length;
        sortStart = result.nextSortOrder;
      }

      const failedFiles = queue.length - uploadedById.size;
      if (registered > 0) {
        setSuccess(
          failedFiles > 0
            ? `${registered} shot${registered === 1 ? "" : "s"} added · ${failedFiles} file(s) failed`
            : `${registered} shot${registered === 1 ? "" : "s"} added`
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
          isHero ? "px-6 py-14 sm:py-16" : "px-3 py-3 sm:px-4 sm:py-4",
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
              : "flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center"
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
                Drop JPEG and/or RAW (same basename pairs into one shot). JPEG
                up to 30MB · RAW up to 100MB.
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
                className="w-full shrink-0 rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800 sm:w-auto"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {busy ? "Uploading…" : "Upload photos"}
              </Button>
              <p className="hidden min-w-0 text-xs leading-snug text-stone-500 sm:block">
                JPEG + RAW · same name pairs · 30MB / 100MB
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

      <UpgradeModal
        open={storageUpgradeOpen}
        reason="storage_limit"
        onClose={() => setStorageUpgradeOpen(false)}
      />
    </div>
  );
}
