# Large batch photo upload (300–800 × ~10MB)

## Scale

| Metric | Typical wedding | Implication |
|--------|-----------------|-------------|
| Count | 300–800 JPEGs | Need queue + concurrency, not one-by-one UI freezes |
| Size | ~8–12 MB each | ~3–8 GB per project |
| Total time | Depends on client uplink | 100 Mbps ≈ 5–10+ min; must be resumable-friendly |
| Browser | Chrome/Safari on laptop | Direct-to-storage only — **never** stream through Next.js |

## What does **not** work

1. Upload all files through a Next.js API route (body limits, timeouts, memory).
2. Strict sequential upload of 800 files (too slow; one failure aborts the night).
3. Inserting 800 DB rows in one server action payload (size + timeout).
4. Generating Sharp thumbnails on the request path for every file at upload time.
5. Free-tier Supabase Storage for multi‑GB projects (plan/storage limits).

## Target architecture

```
Photographer browser
  │  1. Pick folder / many files (File System Access API optional)
  │  2. Local queue + validate (type, size)
  │  3. Concurrent workers (N = 4–6)
  │     └─► PUT file → object storage (presigned URL or Supabase Storage)
  │  4. On each success → batch buffer of metadata
  │  5. Every K successes → server action registerShots(chunk)
  │
Postgres (shots rows: storage_key, preview_url, filename, …)
  │
Async (later)
  └─► thumbnail / web-preview job (queue worker or Edge Function)
```

### Storage choice (switchable)

App code goes through `src/lib/storage.ts` + `prepareBatchUpload` — never hardcodes a CDN URL.

| Option | Pros | Cons | When |
|--------|------|------|------|
| **Supabase Storage** (default) | Zero extra infra; private bucket + signed URLs | Cost/limits at multi‑GB | MVP / moderate volume |
| **Cloudflare R2** (S3 API) | Cheap egress, presigned PUT/GET | Extra env/setup | Scale-up when volume grows |

**How switching works**

1. Default: no R2 env → `getStorageBackend()` = `"supabase"`.
2. Set `R2_ACCOUNT_ID` + keys + `R2_BUCKET_NAME` → backend flips to `"r2"` (no code change).
3. Rows always store **`storage_key`** (object path). **`preview_url`** is only for demo/external samples.
4. UI reads **`display_url`**: short-lived signed GET (Supabase `createSignedUrls` or R2 presigned).

Private by design: the `shots` bucket is non-public; client share galleries mint signed URLs after the share-token RPC (needs `SUPABASE_SERVICE_ROLE_KEY`).

### Concurrency model

- **Pool size:** 4–6 parallel PUTs (balance speed vs browser + Wi‑Fi).
- **Per-file retry:** 2–3 exponential backoff on network errors.
- **Continue on failure:** mark failed files; allow “Retry failed”.
- **Idempotent keys:** stable path  
  `{ownerId}/{projectId}/{contentHashOrUuid}-{safeName}`  
  so retries don’t double-register if you check `storage_key` uniqueness later.

### Metadata registration

- Chunk inserts: **50–100** `shots` rows per `registerUploadedShots` call.
- Client keeps `sort_order` continuous across chunks.
- Optional later: unique index on `(project_id, storage_key)` to dedupe.

### Previews for contact sheet

Do **not** block upload on full-res re-encode.

1. **v1 (current):** Store `storage_key` only; attach 1h signed `display_url` when listing / client gallery. Browser downscales with `sizes`.
2. **v2:** Client generates small JPEG (e.g. 1600px long edge) with `createImageBitmap` + canvas **in parallel** with original upload (or after).
3. **v3:** Worker queue: original in storage → Cloudflare Image / Sharp worker → `thumbnail_key`.

### UX (photographer)

1. **Upload panel** on project: drag-drop zone + “Select photos”.
2. Progress: `234 / 612 · 3 failed · ~12 MB/s`.
3. List: pending / uploading / done / failed (virtualized if long).
4. Can leave page only with warning while active (optional `beforeunload`).
5. After batch: contact sheet refreshes (router.refresh / revalidate).

### Limits to set (product)

| Limit | Suggested |
|-------|-----------|
| Max file size | 25–30 MB JPEG (RAW later via separate kind) |
| Max files per project (MVP) | 2000 |
| Concurrent workers | 5 |
| Register chunk size | 50 |

### Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **A** | Concurrent uploads, progress, retries, chunked DB insert, higher batch cap |
| **B (now)** | R2 presigned multi-file session; auto-fallback to Supabase Storage |
| **C** | Resumable (tus or S3 multipart) for flaky hotel Wi‑Fi |
| **D** | Async derivatives + optional RAW |

## Supabase Storage (default — private)

1. SQL Editor → run `supabase/storage.sql` (private `shots` bucket + owner folder policies).
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` / Vercel (server only) so client share links can sign images.
3. Re-run `schema.sql` or `slug.sql` so `get_client_gallery` returns `storage_key`.
4. Upload UI shows **Supabase Storage**. Paths: `owners/{uid}/projects/{projectId}/{uuid}-{file}`.

## Phase B — R2 setup (when you scale)

1. Cloudflare dashboard → **R2** → Create bucket (e.g. `pofo-shots`). Keep it **private**.
2. **Manage R2 API Tokens** → create token with Object Read & Write on that bucket.
3. **CORS policy** on the bucket (Settings → CORS), e.g.:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3002",
      "https://pofo-web.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Add to `.env.local` and Vercel (no code change required):

```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pofo-shots
# Optional — only if you want permanent public object URLs (not required for private delivery)
# R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

5. Restart dev / redeploy. Upload UI shows **Cloudflare R2**. New uploads go to R2; reads use presigned GET via the same `display_url` path.

> Note: existing Supabase objects stay on Supabase unless you migrate keys. `resolveObjectKey` still signs legacy public Supabase URLs when present.

### Flow (code)

```text
prepareBatchUpload (server) → R2 presigned PUT **or** Supabase path slots
  → client PUT/upload (pool of 5)
  → registerUploadedShots (storage_key; preview_url usually null)
  → list / client gallery → withDisplayUrls → short-lived display_url
```

## Security

- Auth required; storage path prefix = `owners/{auth.uid()}/…`.
- Bucket private; no permanent public object URLs for uploads.
- Signed / presigned read URLs short-lived (~1h), scoped to key.
- Client access: share-token RPC first, then service-role signing only for that payload.
- RLS: owner-only write on `shots`; clients only via share RPCs.
- Virus/malware: optional later (ClamAV worker); not MVP.

## Cost sketch (order of magnitude)

- 500 jobs/mo × 500 × 10 MB ≈ **2.5 TB/mo** ingest — plan R2 + Supabase DB accordingly.
- Prefer **R2 zero egress** for client delivery CDN pattern later.
