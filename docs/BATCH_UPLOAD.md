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

### Storage choice

| Option | Pros | Cons | When |
|--------|------|------|------|
| **Cloudflare R2** (S3 API) | Cheap egress, presigned PUT, multipart | Extra env/setup | **Recommended for production volume** |
| **Supabase Storage** | Already wired | Cost/limits at multi‑GB; less ideal multipart story | MVP / moderate volume |

Pofo already has `src/lib/r2.ts` (presign helpers) and Supabase Storage for smaller batches.

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

1. **v1:** Use full JPEG URL as `preview_url` (current). Client view loads with `sizes` / browser downscale.
2. **v2:** Client generates small JPEG (e.g. 1600px long edge) with `createImageBitmap` + canvas **in parallel** with original upload (or after).
3. **v3:** Worker queue: original in R2 → Cloudflare Image / Sharp worker → `thumbnail_key`.

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

## Phase B — R2 setup

1. Cloudflare dashboard → **R2** → Create bucket (e.g. `pofo-shots`).
2. **Manage R2 API Tokens** → create token with Object Read & Write on that bucket.
3. Enable **Public access** (r2.dev subdomain) **or** attach a custom domain → copy public base URL.
4. **CORS policy** on the bucket (Settings → CORS), e.g.:

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

5. Add to `.env.local` and Vercel:

```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pofo-shots
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

6. Restart dev / redeploy. Upload UI shows **Cloudflare R2** when ready.

### Flow (code)

```text
prepareBatchUpload (server) → presigned PUT slots
  → client PUT file (pool of 5)
  → registerUploadedShots (DB chunks)
```

If R2 env incomplete → same UI uses **Supabase Storage** (path upload via SDK).

## Security

- Auth required; storage path prefix = `auth.uid()`.
- Presigned URLs short-lived (5–15 min), scoped to key.
- RLS: owner-only write on `shots`; clients still via share RPC only.
- Virus/malware: optional later (ClamAV worker); not MVP.

## Cost sketch (order of magnitude)

- 500 jobs/mo × 500 × 10 MB ≈ **2.5 TB/mo** ingest — plan R2 + Supabase DB accordingly.
- Prefer **R2 zero egress** for client delivery CDN pattern later.
