# Apply MVP1 database features (one-time)

Run these files **in order** in the Supabase Dashboard → **SQL Editor** → **New query** → paste → **Run**.

| # | File | Adds |
|---|------|------|
| 1 | `supabase/schema.sql` | Core tables, RLS, proofing RPCs |
| 2 | `supabase/storage.sql` | Private `shots` bucket policies |
| 3 | `supabase/profiles-providers.sql` | `profiles.providers[]` |
| 4 | `supabase/share-gate.sql` | Password-gate public meta |
| 5 | `supabase/features-p1-p2.sql` | Notes/flags, analytics, thumbs, bulk select |
| 6 | `supabase/features-p3.sql` | Portfolio + original download window |
| 7 | `supabase/slug.sql` (optional) | Studio slug RPC helpers |

If you already applied 1–4 earlier, only run **5** and **6**.

Also ensure Vercel env has:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for private client images)
- `NEXT_PUBLIC_APP_URL`
