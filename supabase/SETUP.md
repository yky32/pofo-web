# Supabase setup — Phase 1–4 (Auth + Projects + Share + Proofing)

Do this once so Pofo can sign you in, save projects, share client links, and collect favorites.

---

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) → **New project**
2. Pick org, name (e.g. `pofo`), password, region
3. Wait until the project is ready

---

## 2. Copy API keys into `.env.local`

In Supabase: **Project Settings → API**

| Env var | Where |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` (server only — optional for Phase 1) |

Also set:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Example `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # not required for Phase 1
```

**Never commit** `.env.local` or the service role key.

Restart the dev server after saving env:

```bash
bun dev
```

---

## 3. Run the SQL schema

1. Supabase → **SQL Editor** → **New query**
2. Paste the full contents of `supabase/schema.sql`
3. **Run**

This creates:

- `profiles` (+ auto row on signup)
- `projects` / `containers`
- `shots` (preview URLs or future R2 keys)
- `share_links` + `shot_selections` (client proofing)
- RLS (owners only on tables)
- RPCs `get_client_gallery` / `toggle_client_selection` (token access for clients)

Re-running the script is safe (idempotent).

---

## 4. Auth settings (recommended for local dev)

**Authentication → Providers → Email**

- Enable Email
- For local testing: turn **off** “Confirm email” so you can log in immediately  
  (turn it back on for production if you want)

**Authentication → URL configuration**

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

---

## 5. Smoke test

1. Open http://localhost:3000/signup  
2. Create an account  
3. You should land on `/dashboard` (empty projects)  
4. **New project** → fill title → create  
5. Project appears in the list and detail page  

---

## What you need to provide (summary)

| Item | You create | Give to the app |
|------|------------|-----------------|
| Supabase project | Yes | — |
| Project URL | Yes | `NEXT_PUBLIC_SUPABASE_URL` |
| Anon key | Yes | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Run `schema.sql` | Yes | In SQL Editor |
| Email confirm on/off | Optional | Auth settings |

**Not needed yet (Phase 2+):** Cloudflare R2 keys, service role (unless we add admin jobs).

---

## Vercel (production later)

Add the same `NEXT_PUBLIC_*` vars in  
**Vercel → Project → Settings → Environment Variables**, then redeploy.

Set `NEXT_PUBLIC_APP_URL=https://pofo-web.vercel.app` (or your domain).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Supabase is not configured” | Check `.env.local` values and restart `bun dev` |
| Login works but create project fails | Confirm `schema.sql` ran without errors |
| “relation projects does not exist” | Re-run schema in SQL Editor |
| Stuck after signup | Disable email confirm for local, or check inbox |
| RLS / permission denied | Policies require `owner_id = auth.uid()`; ensure you’re logged in |
