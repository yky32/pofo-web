"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, Upload } from "lucide-react";
import { processProjectPreviews } from "@/actions/previews";
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

/** After files hit storage: save rows → refresh gallery UI */
type FinishPhase = null | "saving" | "refreshing" | "done";

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
    m.includes("server components render") ||
    m.includes("omitted in production") ||
    m.includes("digest")
  ) {
    return "Server hiccup during upload. Hard-refresh, stay on this project page, and try 1–2 small JPEGs again.";
  }
  if (
    m.includes("row-level security") ||
    m.includes("violates row-level") ||
    m.includes("rls")
  ) {
    return "Storage permission blocked this file. Re-run supabase/storage.sql in the SQL Editor, then retry.";
  }
  if (m.includes("bucket not found")) {
    return "Photo storage isn’t set up yet. Run supabase/storage.sql in the Supabase SQL Editor.";
  }
  if (m.includes("mime type") || m.includes("not supported")) {
    return "File type not allowed in the shots bucket. Use JPEG/PNG/WebP (or re-run storage.sql for RAW types).";
  }
  if (m.includes("payload too large") || m.includes("maximum allowed")) {
    return "File is too large (JPEG 30MB · RAW 100MB). Raise the bucket limit or use a smaller file.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Network error — check your connection and retry.";
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("session")) {
    return "Session expired — refresh the page and sign in again.";
  }
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
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
  /** bytes uploaded this batch · for speed */
  const [bytesDone, setBytesDone] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const speedStartedAt = useRef<number | null>(null);
  const [speedBps, setSpeedBps] = useState<number | null>(null);
  const [finishPhase, setFinishPhase] = useState<FinishPhase>(null);
  const [finishLabel, setFinishLabel] = useState("");
  const [refreshPending, startRefresh] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Clear finish overlay after refresh settles
  useEffect(() => {
    if (finishPhase !== "refreshing") return;
    if (refreshPending) return;
    setFinishPhase("done");
    const t = window.setTimeout(() => {
      setFinishPhase(null);
      setFinishLabel("");
    }, 700);
    return () => window.clearTimeout(t);
  }, [finishPhase, refreshPending]);

  const patchItem = useCallback((id: string, patch: Partial<FileItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  // Warn before leaving mid-upload or mid-refresh
  useEffect(() => {
    const block =
      busy || finishPhase === "saving" || finishPhase === "refreshing";
    if (!block) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy, finishPhase]);

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
    setBytesDone(0);
    setBytesTotal(queue.reduce((s, i) => s + i.file.size, 0));
    setSpeedBps(null);
    speedStartedAt.current = Date.now();
    setError(null);
    setSuccess(null);

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

      let uploadedBytes = 0;

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
        uploadedBytes += item.file.size;
        setBytesDone(uploadedBytes);
        const started = speedStartedAt.current ?? Date.now();
        const elapsed = Math.max(0.5, (Date.now() - started) / 1000);
        setSpeedBps(uploadedBytes / elapsed);
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

      // Files are up — soft handoff so the grid doesn't pop in glitchily
      setFinishPhase("saving");
      setFinishLabel(
        registerRows.length === 1
          ? "Saving photo to gallery…"
          : `Saving ${registerRows.length} photos to gallery…`
      );

      let registered = 0;
      let sortStart: number | undefined;
      for (const chunk of chunkArray(registerRows, REGISTER_CHUNK)) {
        const result = await registerUploadedShots({
          projectId,
          files: chunk,
          sortOrderStart: sortStart,
        });
        if (result.error) {
          setFinishPhase(null);
          setFinishLabel("");
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
        const okMsg =
          failedFiles > 0
            ? `${registered} shot${registered === 1 ? "" : "s"} added · ${failedFiles} file(s) failed`
            : `${registered} shot${registered === 1 ? "" : "s"} added`;
        setSuccess(okMsg);
        setFinishPhase("refreshing");
        setFinishLabel("Loading previews…");
        setBusy(false);
        // Best-effort server derivatives for any pending JPEG rows (non-blocking)
        void processProjectPreviews({ projectId, limit: 40 }).catch(() => {
          /* cron / manual Build previews is the fallback */
        });
        startRefresh(() => {
          try {
            router.refresh();
          } catch {
            /* ignore */
          }
        });
      } else {
        setFinishPhase(null);
        setFinishLabel("");
      }
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Upload failed.";
      console.error("runUpload", e);
      setError(friendlyUploadError(msg));
      setFinishPhase(null);
      setFinishLabel("");
    } finally {
      setBusy(false);
    }
  }

  function onPick(list: FileList | null) {
    if (!list?.length) return;
    void runUpload(Array.from(list));
  }

  /** Re-upload only failed files from the last batch */
  function retryFailed() {
    const failed = items.filter((i) => i.status === "failed");
    if (!failed.length || busy) return;
    void runUpload(failed.map((i) => i.file));
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const finishing =
    finishPhase === "saving" ||
    finishPhase === "refreshing" ||
    finishPhase === "done";
  const showProgress =
    busy ||
    finishing ||
    (total > 0 && (busy || failedCount > 0 || success));
  const isHero = variant === "hero";
  const speedLabel =
    speedBps && speedBps > 0
      ? speedBps > 1024 * 1024
        ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`
        : `${Math.round(speedBps / 1024)} KB/s`
      : null;

  const barPct =
    finishPhase === "saving"
      ? 100
      : finishPhase === "refreshing" || finishPhase === "done"
        ? 100
        : pct;

  const progressCaption = finishing
    ? finishLabel || "Finishing…"
    : busy
      ? `${done} / ${total}${failedCount > 0 ? ` · ${failedCount} failed` : ""}${speedLabel ? ` · ${speedLabel}` : ""}`
      : null;

  return (
    <div className={cn("w-full", className)}>
      {/* Full-viewport soft curtain while gallery reloads after 100% */}
      {mounted && finishing
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed inset-0 z-[240] flex items-end justify-center p-6 sm:items-center",
                "bg-stone-950/25 backdrop-blur-[2px] transition-opacity duration-300",
                finishPhase === "done" ? "opacity-0" : "opacity-100"
              )}
              aria-live="polite"
              aria-busy={finishPhase !== "done"}
            >
              <div
                className={cn(
                  "pointer-events-auto w-full max-w-sm rounded-2xl border border-white/60 bg-white/95 p-5 shadow-2xl shadow-stone-900/15 backdrop-blur-xl",
                  "animate-in fade-in-0 zoom-in-95 duration-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      finishPhase === "done"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-stone-100 text-stone-800"
                    )}
                  >
                    {finishPhase === "done" ? (
                      <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
                    ) : (
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        strokeWidth={1.75}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-stone-900">
                      {finishPhase === "done"
                        ? success || "Added to gallery"
                        : finishPhase === "saving"
                          ? "Upload complete"
                          : "Almost there"}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                      {finishPhase === "done"
                        ? "Gallery updated"
                        : finishLabel || "Preparing contact sheet…"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn(
                      "h-full rounded-full bg-stone-900 transition-[width] duration-500 ease-out",
                      finishPhase === "refreshing" &&
                        "animate-pulse bg-stone-800",
                      finishPhase === "done" && "bg-emerald-600"
                    )}
                    style={{
                      width:
                        finishPhase === "saving"
                          ? "92%"
                          : finishPhase === "refreshing"
                            ? "97%"
                            : "100%",
                    }}
                  />
                </div>
                {finishPhase === "refreshing" ? (
                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square animate-pulse rounded-md bg-stone-100"
                        style={{ animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
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
          if (busy || finishing) return;
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
                disabled={busy || finishing}
                onClick={() => inputRef.current?.click()}
              >
                {busy || finishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {finishing
                  ? "Finishing…"
                  : busy
                    ? "Uploading…"
                    : "Choose photos"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                className="w-full shrink-0 rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800 sm:w-auto"
                disabled={busy || finishing}
                onClick={() => inputRef.current?.click()}
              >
                {busy || finishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {finishing
                  ? "Finishing…"
                  : busy
                    ? "Uploading…"
                    : "Upload photos"}
              </Button>
              <p className="hidden min-w-0 text-xs leading-snug text-stone-500 sm:block">
                JPEG + RAW · same name pairs · 30MB / 100MB
              </p>
            </>
          )}
        </div>

        {showProgress && (busy || finishing) ? (
          <div
            className={cn(
              "space-y-1.5",
              isHero ? "mx-auto mt-8 max-w-sm" : "mt-4"
            )}
          >
            <div className="flex justify-between gap-2 text-[11px] text-stone-500">
              <span className="min-w-0 truncate">
                {progressCaption}
              </span>
              <span className="shrink-0 tabular-nums">
                {finishing ? (
                  finishPhase === "done" ? (
                    "Done"
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {finishPhase === "saving" ? "Saving" : "Loading"}
                    </span>
                  )
                ) : (
                  <>
                    {barPct}%
                    {bytesTotal > 0
                      ? ` · ${Math.min(100, Math.round((bytesDone / bytesTotal) * 100))}% data`
                      : ""}
                  </>
                )}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200/80">
              <div
                className={cn(
                  "h-full rounded-full bg-stone-900 transition-[width] duration-300 ease-out",
                  finishPhase === "refreshing" && "animate-pulse",
                  finishPhase === "done" && "bg-emerald-600"
                )}
                style={{ width: `${barPct}%` }}
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
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {failedCount > 0 && !busy ? (
              <button
                type="button"
                className="rounded-full bg-rose-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-rose-800"
                onClick={retryFailed}
              >
                Retry failed ({failedCount})
              </button>
            ) : null}
            {items.some((i) => i.status === "failed") ? (
              <button
                type="button"
                className="text-[11px] font-medium text-rose-700 underline-offset-2 hover:underline"
                onClick={() => setShowDetails((v) => !v)}
              >
                {showDetails ? "Hide details" : "Show file details"}
              </button>
            ) : null}
          </div>
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
