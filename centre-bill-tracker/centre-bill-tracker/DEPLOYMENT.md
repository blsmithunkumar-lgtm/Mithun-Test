# Deployment Guide — Centre Bill Tracker Portal (V1)

This guide deploys the application entirely on free-tier services, reachable
over the internet from any location, with **zero cost** and **no domain
purchase required**:

| Component | Service | Why |
|---|---|---|
| Frontend  | **Vercel** | Static hosting, HTTPS, global CDN |
| Backend   | **Vercel** (Node.js Function) | Serverless API deployment from Git |
| Database  | **TiDB Cloud Starter** (free plan) | Genuinely free indefinitely (no card, no expiry), MySQL wire-compatible, works unchanged with the `mysql2` driver already used in this project |

Everything is environment-variable-driven — no code changes are needed to
move between local development, this free setup, and paid hosting later.

> **Current deployment note:** The Centre Bill Tracker frontend and backend
> are deployed as separate Vercel projects. The backend project uses
> `backend/vercel.json` and routes requests to `backend/api/index.js`.
> Keep the frontend API URL and backend CORS allowlist aligned with the
> actual production domains. Confirm current plan limits and suitability in
> Vercel before relying on the app for business-critical daily operations.

---

## 1. Database Setup (TiDB Cloud Starter — free, MySQL-compatible)

1. Go to **tidbcloud.com** and sign up (no credit card required).
2. Create a new cluster → choose the **Starter** (free) tier → pick a region
   close to your users (e.g. Mumbai/Singapore for India-based teams).
3. Once the cluster is ready, open **Connect** and note down:
   - Host (e.g. `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`)
   - Port: `4000`
   - Username (includes a cluster prefix, e.g. `3pTAoNNegb47Uc8.root`)
   - Password (set it here, or generate one)
4. Download the connection's **CA certificate** if prompted (TiDB Cloud
   connections require TLS — this app already supports that, see section 2).
5. Create the database and load the schema. From your local machine (with
   the `mysql` client installed), or via TiDB Cloud's web-based SQL editor:
   ```bash
   mysql --connect-timeout 15 -u '<prefix>.root' -h <host> -P 4000 \
     -D test --ssl-mode=VERIFY_IDENTITY -p
   ```
   Then inside the MySQL shell:
   ```sql
   CREATE DATABASE centre_bill_tracker;
   USE centre_bill_tracker;
   SOURCE backend/src/database/schema.sql;
   ```
   (Or paste the contents of `backend/src/database/schema.sql` into TiDB
   Cloud's web SQL editor against the `centre_bill_tracker` database.)

**Free tier limits (as of mid-2026):** 5 GiB row storage, 50 million request
units/month, up to 5 free clusters per organization. This comfortably covers
a 4-user internal billing tool. If you ever outgrow it, migrating to a paid
TiDB Cloud tier or a different MySQL host is a connection-string change only
— see section 7.

---


## 1B. Production release gate (mandatory)

Do not merge Phase 2 or Phase 3 to production until every gate below is complete.
A successful GitHub Actions run uses a temporary MySQL database and is **not**
evidence that the production schema has been changed or that production data
can be saved and reopened.

### Gate A — identify the actual production database

1. Confirm the production backend deployment and the exact database host/name
   from the hosting provider's environment settings. Do not copy credentials
   into Git, chat, CI logs, or a ticket.
2. Confirm the DB account can read the current schema and has permission to
   create the new tables. If access is denied, stop and restore authorized
   owner access first; do not work around access controls.

### Gate B — create and verify a private backup

Run from a trusted machine with the MySQL client tools installed. Set
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in the
local shell from the hosting provider's secure settings. Do not paste values
into commands or commit them. Store the backup outside the repository in an
encrypted, access-controlled location.

```bash
set -eu
umask 077
BACKUP_FILE="$HOME/centre-bill-tracker-$(date -u +%Y%m%dT%H%M%SZ).sql"
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="${DB_PORT:-4000}" --user="$DB_USER" \
  --ssl-mode=VERIFY_IDENTITY --single-transaction \
  --routines --triggers --events "$DB_NAME" > "$BACKUP_FILE"
test -s "$BACKUP_FILE"
grep -q 'CREATE TABLE' "$BACKUP_FILE"
sha256sum "$BACKUP_FILE"
```

For providers that require a specific CA certificate, add the provider's
documented CA option. Do not treat a non-empty file alone as a full restore
test: confirm the backup contains the expected existing tables and perform a
restore test into a separate, non-production database before release.

### Gate C — apply additive migrations in order

After the backup and restore test succeed, apply the Phase 2 migration first:

```sql
SOURCE backend/src/database/migrations/20261017_phase2_billing_payments_invoices.sql;
```

Verify all five tables exist: `bill_items`, `bill_payments`,
`bill_attachments`, `bill_amortizations`, and `bill_approvals`.
Then deploy Phase 2 and test with a designated test bill/user before real
finance transactions. Do not use a real bill to test payments.

Only after Phase 2 is verified, approved, and deployed, apply Phase 3:

```sql
SOURCE backend/src/database/migrations/20261017_phase3_audit_logs.sql;
```

Verify `bill_audit_logs` and both indexes exist, then deploy Phase 3.

### Gate D — production smoke test and recovery

Using an authorized test account and a non-financial test bill, verify:
- login and role permissions work;
- bill details save, refresh, and reopen from the database;
- breakdown total validation and approval flow work;
- payment/TDS arithmetic rejects overpayment and does not mark a bill Paid
  until the exact invoice total is settled;
- invoice upload/download, report CSV, and audit history work;
- no database errors appear in backend logs.

If a deployment fails, restore the previous application deployment first.
These migrations are additive; do not drop the new tables as an ad-hoc rollback.
Keep the private database backup until the new version has been verified and
the agreed retention period has elapsed.

## 1A. Phase 2 database migration (existing installations)

For an existing database, do **not** re-run the full schema file over live data.
After reviewing and approving the Phase 2 release, back up the database and
apply this additive migration to the existing `centre_bill_tracker` database:

```sql
SOURCE backend/src/database/migrations/20261017_phase2_billing_payments_invoices.sql;
```

The migration creates the bill category, payment, invoice attachment,
prepaid amortization, and approval tables. It is designed to be re-runnable.
The GitHub Actions migration smoke test verifies the tables can be created
twice against a temporary MySQL database. It does **not** run against production.

Phase 2 payment workflow:
1. Mark the bill as **Received**.
2. Submit an approval request in the Finance panel.
3. An Admin approves or rejects the request.
4. Once approved, record bank payments and any TDS withheld. Partial payments
   are supported; the bill becomes **Paid** only when bank payments plus TDS
   settle the bill total. The final settlement must be recorded by an Admin.
5. The Finance panel also supports invoice files (PDF/JPG/PNG/WEBP, max 4 MB),
   bill bifurcation, 3- or 6-month prepaid amortization, and payment CSV export.

TDS is recorded as an explicit amount; the app does not assume a tax rate or
taxable base. Confirm the applicable accounting treatment before entering it.
Invoice files are stored in the database in this initial version, so monitor
database storage as attachments accumulate.

## 2. Environment Variable Configuration

Nothing is hardcoded anywhere in the codebase — every credential, URL, and
secret is read from environment variables.

### Backend (`backend/.env` locally, or the backend Vercel project's Environment Variables in production)

| Variable | Example (production) | Notes |
|---|---|---|
| `PORT` | *(normally leave unset)* | Vercel manages the function's listening port |
| `NODE_ENV` | `production` | |
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` | From TiDB Cloud |
| `DB_PORT` | `4000` | TiDB Cloud's MySQL port |
| `DB_USER` | `3pTAoNNegb47Uc8.root` | Includes the cluster prefix |
| `DB_PASSWORD` | *(your TiDB password)* | |
| `DB_NAME` | `centre_bill_tracker` | |
| `DB_SSL` | `true` | Required for TiDB Cloud / any managed MySQL |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` | Keep true unless your provider needs otherwise |
| `JWT_SECRET` | *(long random string)* | Generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `8h` | |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` | Comma-separate multiple origins if needed |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | *(your choice)* | Used once by `npm run seed` |
| `SEED_OPERATIONS_USERNAME` / `SEED_OPERATIONS_PASSWORD` | *(your choice)* | Used once by `npm run seed` |

### Frontend (`frontend/.env` locally, or Vercel's Environment Variables settings)

| Variable | Example (production) | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://mithun-test.vercel.app/api` | Use the actual backend production URL + `/api`; verify the configured value in the frontend project's environment settings. |

**Never commit `.env` files** — both `backend/.gitignore` and
`frontend/.gitignore` already exclude them. Only `.env.example` (no real
secrets) is committed.

---

## 3. Backend Deployment (Vercel)

The production backend is a separate Vercel project. Preserve its existing
project configuration when updating deployments; do not create a duplicate
project merely to follow this guide.

1. Open the existing backend project in Vercel (currently named `mithun-test`).
2. Confirm its Root Directory points to the backend application directory
   (`centre-bill-tracker/centre-bill-tracker/backend` if the repository root
   is selected as the project root). If the project already uses a different
   valid root setting, document and preserve that working configuration.
3. Confirm the project uses the committed `backend/vercel.json`, which maps
   `api/index.js` to the Vercel Node.js runtime and rewrites requests to it.
4. Configure the backend variables from the table above under
   **Settings → Environment Variables**, scoped to Production as appropriate.
   Never copy secret values into Git, chat, issue comments, or logs.
5. Deploy through the existing Git integration and verify
   `https://mithun-test.vercel.app/health` returns
   `{"success":true,"message":"Centre Bill Tracker API is running"}`.
6. Check **Runtime Logs** for the production deployment when validating
   database connectivity. Build logs only confirm build-time activity; an
   empty runtime-log view is not proof that the database is connected.
7. Run database seed operations only when explicitly needed and approved.
   Use a trusted local environment with authorized database credentials;
   do not seed production casually or rely on a hosting dashboard Shell.

Do not use the health response alone as proof of database persistence. Confirm
that a non-financial test record can be created, refreshed, and reopened before
calling the production database integration verified.

---

## 4. Frontend Deployment (Vercel)

The frontend is already deployed as a separate Vercel project. Update that
existing project rather than creating a duplicate.

1. Open the existing frontend project in Vercel (currently named
   `mithun-test-ltzp`).
2. Preserve its working Root Directory and Vite build settings. If configuring
   from the repository root, the frontend directory is
   `centre-bill-tracker/centre-bill-tracker/frontend`.
3. In **Settings → Environment Variables**, set `VITE_API_BASE_URL` to the
   backend production URL followed by `/api`, currently expected to be
   `https://mithun-test.vercel.app/api`. Verify the live value in Vercel
   without copying it into chat or source control.
4. Redeploy the frontend after changing environment variables.
5. Confirm `frontend/vercel.json` rewrites client-side routes to
   `index.html`, so routes such as `/bills` and `/dashboard` load and
   refresh without a 404.

---

## 5. Connect the Frontend and Backend (CORS)

1. Open the backend Vercel project → **Settings → Environment Variables**.
2. Set `CLIENT_ORIGIN` to the actual frontend production URL (no trailing
   slash). Add a comma-separated list only if additional origins are genuinely
   required, for example a local development origin.
3. Save the variable and redeploy the backend if Vercel does not automatically
   create a new deployment. The backend only accepts requests from origins
   listed here (see `backend/src/app.js`); anything else is rejected by CORS.

## 6. Final Verification Checklist

- [ ] `https://mithun-test.vercel.app/health` returns success
- [ ] Visiting the Vercel URL shows the login page
- [ ] Logging in with the seeded Admin account works and reaches the Dashboard
- [ ] Logging in with the seeded Operations account works, and management
      actions (Add Centre and Edit Bill) are correctly hidden/blocked, and payment settlement requires an approved bill plus the payment ledger
- [ ] Adding a centre and a bill from the deployed app persists correctly
      (refresh the page — data should still be there, confirming it's
      reading from the cloud database, not local state)
- [ ] Direct-loading a deep link, e.g. `https://<your-frontend-vercel-url>/bills`, and
      refreshing the page both work without a 404

---

## 7. Migrating From Free Hosting to Paid Hosting (Later)

The architecture was deliberately kept host-agnostic — nothing below
requires touching application code, only configuration.

**Database:** Any MySQL-compatible provider works as-is because the app
talks to it purely through the standard MySQL wire protocol via `mysql2`.
To migrate:
1. Provision the new database (e.g. TiDB Cloud paid tier, AWS RDS,
   PlanetScale, DigitalOcean Managed MySQL).
2. Run `backend/src/database/schema.sql` against it.
3. Export/import existing data with `mysqldump` (works against TiDB Cloud
   too, since it's MySQL wire-compatible).
4. Update `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` /
   `DB_SSL` in the backend Vercel project's environment variables. No code changes.

**Backend:** Any Node.js host works (Vercel, Railway, a VPS,
AWS/GCP/Azure). Because config is entirely environment-variable-driven:
1. Deploy the same `backend/` folder with `npm install && npm start`.
2. Set the same environment variables listed in section 2.
3. Update `CLIENT_ORIGIN` to match wherever the frontend now lives.
4. Update the frontend's `VITE_API_BASE_URL` to point at the new backend
   URL, and redeploy the frontend.
5. If you later put the backend behind a custom domain, no further code
   changes are needed — the CORS check in `app.js` cares only about the
   `CLIENT_ORIGIN` value, and Express doesn't hardcode any URL itself.

**Frontend:** Any static host works (Vercel Pro, Netlify, Cloudflare
Pages, S3+CloudFront). It's a standard Vite build (`npm run build`
produces a static `dist/` folder) — deploy that folder anywhere, keeping
an SPA rewrite rule (`frontend/vercel.json` is Vercel-specific; other
hosts have their own equivalent "redirect all routes to index.html" setting).

**Custom domain (optional, whenever you're ready):** Both Vercel and
Render support attaching a custom domain directly in their dashboards once
you purchase one — no application code changes required either way.
