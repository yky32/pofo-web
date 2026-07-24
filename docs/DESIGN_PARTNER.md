# Design partner runbook

Use this to onboard **3–5 photographers** without calling Pofo a public product.

## Your setup (once)

1. **App URL**
   - Local: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - Prod Vercel: `https://<your-deployment>` (no trailing slash)

2. **Supabase**
   - Service role on Vercel (required for client gallery signed images)
   - Apply SQL:
     ```bash
     # from repo root, with SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD
     ./scripts/supabase-apply-schema.sh all
     ```
     Includes `slug.sql` + `features-portfolio-page.sql`.

3. **Preview worker**
   - Set `CRON_SECRET` on Vercel
   - `vercel.json` runs `/api/cron/process-previews` every 10 minutes
   - Photographer can also click **Build previews** on a project

4. **Email (optional)**
   - `RESEND_API_KEY` + `RESEND_FROM_EMAIL` for share / proofing complete
   - Without Resend: copy link + mailto still work

5. **Smoke check**
   ```bash
   ./scripts/design-partner-ready.sh
   ```

## Partner job (30–45 min)

| Step | Photographer | You watch for |
|------|----------------|---------------|
| 1 | Sign up / log in | Auth, profile slug |
| 2 | Create project (title, client, limit ~40) | Create modal |
| 3 | Upload **50–100 JPEGs** (or mixed if RAW ready) | Progress, retry, previews |
| 4 | Open contact sheet / cinema | Load time, placeholders |
| 5 | Create share link (+ password optional) | Copy shows studio host when subdomain works |
| 6 | Client opens link on **phone** | Hearts, bulk, “I’m done” |
| 7 | You export proof ZIP / filename list | Matches hearts |
| 8 | Optional: Add photos → Portfolio → View public | Studio page |

## What to promise partners

- Free design partner, no SLA  
- JPEG-primary unless you’ve verified RAW previews  
- You may fix mid-job; they get a working gallery for one real client  

## What not to promise

- Solo/Pro paid features (Stripe stub)  
- Team multi-admin  
- Pixieset parity (print store, storefront)  

## After each partner

Log frictions (upload / preview / share / mobile / export). Fix top 3 only before next partner.

## Definition of “partner success”

- [ ] Client completed proofing on mobile  
- [ ] Export matches selection  
- [ ] No engineer required during client session  
- [ ] Photographer would use it again for another job  
