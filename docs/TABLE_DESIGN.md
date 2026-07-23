# Table design benchmark: Triftly vs Pofo

Reference: `triftly-app/supabase/migrations/*` and Pofo `supabase/schema.sql` + `slug.sql` + `storage.sql`.

---

## 1. Schema organization

| Dimension | **Triftly** | **Pofo** | Verdict |
|-----------|-------------|----------|---------|
| Evolution | Numbered migrations `001_…`, `002_…` | Monolithic `schema.sql` + additive files (`slug.sql`, `storage.sql`, `oauth-profile.sql`) | Triftly better for teams; Pofo OK for MVP if every file is idempotent |
| Apply path | `supabase db push` in CI | SQL Editor / `supabase db query --linked --file` | Adopt Triftly-style `migrations/` when >1 engineer |
| Idempotency | Mixed (some `if not exists`) | Strong (`if not exists`, `drop policy if exists`) | Pofo safer to re-run |

**Recommendation:** Keep shipping features with idempotent SQL; before multi-dev scale, convert to `supabase/migrations/00x_*.sql` like Triftly.

---

## 2. Identity / auth tables

| Concern | **Triftly** | **Pofo** | Notes |
|---------|-------------|----------|--------|
| Public user row | `public.users` (id → `auth.users`) | `public.profiles` (id → `auth.users`) | Same pattern, different name |
| Auto-create on signup | `handle_new_user` trigger | Same + **slug allocation** + OAuth name/avatar | Pofo richer for multi-tenant brand |
| OAuth providers | Google + Apple (native + browser) | Google + Apple (web OAuth PKCE) | Same Supabase providers; mobile extras N/A on web |
| Email OTP | Yes (mobile) | Password + OAuth | Product choice |
| Display name source | metadata / email local | metadata `full_name` / `name` / email + slugify | OAuth-ready |

### Pofo `profiles` (current target)

| Column | Type | Role |
|--------|------|------|
| `id` | uuid PK → auth.users | Identity |
| `display_name` | text | Human name (OAuth `full_name`) |
| `studio_name` | text | Brand label |
| `slug` | text unique | `{slug}.pofo.app` tenancy |
| `custom_domain` | text unique nullable | Future white-label |
| `avatar_url` | text | OAuth picture |
| timestamps | timestamptz | Audit |

**vs Triftly `users`:** Triftly adds `default_currency`, `locale`, `fcm_token` (mobile/travel). Pofo correctly omits those; keeps photography domain fields.

---

## 3. Core domain tables

### Triftly (trip collaboration)

```
users 1──* trips
trips 1──* trip_members, trip_days, spots, expenses, buddies…
share_token on trips + join RPCs
```

Focus: **multi-user trip**, realtime, share-join, expenses.

### Pofo (client delivery)

```
profiles 1──* projects
projects 1──* containers 1──* shots
projects 1──* share_links 1──* shot_selections
storage.objects (bucket shots)
```

Focus: **owner delivers to anonymous client** via token (not multi-editor).

| Pattern | Triftly | Pofo | Benchmark |
|---------|---------|------|-----------|
| Ownership | `owner_id` + members | `owner_id` only (MVP) | Pofo simpler; add team later |
| Client access | `share_token` + membership | `share_links.token` + **SECURITY DEFINER RPCs** | Pofo better isolation (no broad anon RLS on shots) |
| Soft delete | `is_active` on several tables | Hard cascade + link revoke | Triftly better for undo; Pofo fine for MVP |
| Enums | check constraints / text | Postgres enums `project_status`, `shot_kind` | Pofo cleaner typing |
| Denormalization | trip_id on children | `project_id` on shots/selections | Both correct for RLS/query |

---

## 4. RLS & RPC design (security benchmark)

| Pattern | Triftly | Pofo | Score |
|---------|---------|------|-------|
| Owner policies | `auth.uid() = owner_id` | Same | Equal |
| Member policies | `user_is_trip_member()` helpers | N/A (no members yet) | Triftly more mature collab |
| Anon client data | Shared trip bundle RPC | `get_client_gallery` / `toggle_client_selection` | **Equal best practice** |
| Public profile | Member profile RPCs | `get_studio_by_slug` | Equal |
| Storage | App-side / later | `storage.buckets` + path `{uid}/{project_id}/…` | Pofo explicit |

**Golden rule (both products):** clients never get table-wide `select` on private rows; they go through **token-scoped SECURITY DEFINER functions**.

---

## 5. Indexes

| Need | Triftly | Pofo |
|------|---------|------|
| Owner list | trips by owner | `projects(owner_id, updated_at desc)` |
| Token lookup | `share_token` unique | `share_links(token)` unique |
| Children by parent | trip_id FKs | `shots(project_id, sort_order)`, `containers(project_id, sort_order)` |
| Tenancy | — | `profiles(slug)` unique partial |

Pofo is **well indexed for delivery + slug**. Add `shot_selections(share_link_id)` (already present).

---

## 6. Migration discipline scorecard

| Criterion | Triftly | Pofo (target) |
|-----------|:-------:|:-------------:|
| Clear ownership column | 9 | 9 |
| Cascade deletes defined | 9 | 9 |
| RLS on all user tables | 9 | 9 |
| Token/RPC for public access | 9 | 9 |
| Versioned migrations | 10 | 5 |
| Multi-tenant slug | 2 | 9 |
| OAuth profile bootstrap | 8 | 9 |
| Storage bucket in schema | 3 | 8 |
| Soft-delete / audit log | 7 | 4 |

**Overall:** Triftly wins **process** (migrations, collab). Pofo wins **domain fit** for studio delivery + slug tenancy. Both share the same good security spine.

---

## 7. Recommended next schema steps (Pofo)

1. Fold `slug.sql` / `storage.sql` / `oauth-profile.sql` into numbered `migrations/` (Triftly style).  
2. Optional: `profiles.email` denorm for admin (Triftly has it).  
3. Optional: `share_links.password_hash` when you enable password galleries.  
4. Later teams: `project_members` mirroring Triftly `trip_members`.  

---

## 8. Auth flow comparison (implemented)

| Step | Triftly (mobile) | Pofo (web) |
|------|------------------|------------|
| Start OAuth | `signInWithOAuth` / in-app ASWebAuth | Server action `signInWithOAuth` |
| Redirect | `triftly://login-callback` | `{APP_URL}/auth/callback?next=` |
| Session | `getSessionFromUrl` / deep link | `exchangeCodeForSession(code)` |
| Profile row | trigger on `auth.users` | Same + slug + avatar |
| UI | Google / Apple circles | Google / Apple buttons on login & signup |

---

*Last updated with social login implementation for Pofo web.*
