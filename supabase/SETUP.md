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
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` (server only — **needed for private share images**) |

Also set:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Example `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # server only; signs client gallery images
```

**Never commit** `.env.local` or the service role key.

Restart the dev server after saving env:

```bash
bun dev
```

---

## 3. Run the SQL schema

1. Supabase → **SQL Editor** → **New query**
2. Paste the full contents of `supabase/schema.sql` → **Run**
3. Paste `supabase/storage.sql` → **Run** (private `shots` bucket)
4. Optional: paste `supabase/slug.sql` if you use studio subdomains

This creates:

- `profiles` (+ auto row on signup)
- `projects` / `containers`
- `shots` (`storage_key` for private objects; optional demo `preview_url`)
- `share_links` + `shot_selections` (client proofing)
- Private Storage bucket `shots` + owner folder policies
- RLS (owners only on tables)
- RPCs `get_client_gallery` / `toggle_client_selection` (token access for clients; RPC returns `storage_key` so the app can mint signed URLs)

Re-running the scripts is safe (idempotent).

**Client share images:** without `SUPABASE_SERVICE_ROLE_KEY`, owner dashboard still works (session can sign), but anonymous client galleries cannot mint signed URLs for private objects.

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

## 6. Studio slug (subdomains)

Run `supabase/slug.sql` after the main schema (idempotent).

This adds:

- `profiles.slug` + `custom_domain`
- signup trigger allocates a unique slug
- RPCs: `get_studio_by_slug`, `get_client_gallery(token, expected_slug)`

App env (optional):

```bash
NEXT_PUBLIC_ROOT_DOMAIN=pofo.app
```

Until DNS is live, studio pages use `/s/{slug}` and local `{slug}.localhost:3002`.

## 7. Social login (Google / Apple) — Triftly-style OAuth

Pofo uses the same Supabase OAuth pattern as Triftly (provider → redirect → session).

### App routes

| Path | Role |
|------|------|
| `/login`, `/signup` | Google + Apple buttons |
| `/auth/callback` | PKCE `exchangeCodeForSession` then redirect to dashboard |

### Supabase Dashboard

1. **Authentication → Providers → Google** → enable, paste Web Client ID + Secret  
2. **Authentication → Providers → Apple** → enable (Services ID + secret) if you want Apple  
3. **Authentication → URL configuration → Redirect URLs** add:

```
http://localhost:3002/auth/callback
http://localhost:3000/auth/callback
https://pofo-web.vercel.app/auth/callback
https://YOUR_DOMAIN/auth/callback
```

4. Site URL: `http://localhost:3002` (dev) or production app URL  

### Google Cloud Console

1. Create OAuth **Web** client  
2. Authorized redirect URI = the URI shown in Supabase Google provider settings  
   (looks like `https://vjtdasuuxkxfiibziymb.supabase.co/auth/v1/callback`)  
3. Optional: add your production origins  

### SQL

After slug migration, run:

```bash
# or SQL Editor: paste supabase/oauth-profile.sql
```

Improves `handle_new_user` for OAuth `full_name` / `picture` → profile + slug.

### Env

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3002   # must match redirect host
```

Production: set the same on Vercel (`https://pofo-web.vercel.app`).

## 8. Multiple providers on one account (Google + Apple + email)

Same model as Triftly:

| Layer | Stores |
|-------|--------|
| `auth.users` | One person / one account id |
| `auth.identities` | google, apple, email rows (managed by Supabase) |
| `public.profiles` | Studio profile only — **no** provider column |

### Enabled

- **Manual linking** (`security_manual_linking_enabled`) — link more IdPs while signed in
- Settings → **Sign-in methods** → Link Google / Link Apple / Unlink

### User flows

1. Sign up with Google → later Settings → Link Apple (same studio)
2. Sign up with email → Settings → Link Google
3. Sign in with any linked provider → same `profiles` row / projects

### Note

Signing in with a *new* provider + *same email* may create a **second** account unless linking is used while logged in, or Supabase automatic email matching applies. Prefer **Link** from Settings for a clean multi-provider account.
