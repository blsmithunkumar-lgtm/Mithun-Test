# Deployment Guide — Centre Bill Tracker Portal (V1)

This guide deploys the application entirely on free-tier services, reachable
over the internet from any location, with **zero cost** and **no domain
purchase required**:

| Component | Service | Why |
|---|---|---|
| Frontend  | **Vercel** (Hobby/free plan) | Free static hosting, HTTPS, global CDN |
| Backend   | **Render** (free Web Service) | Free Node.js hosting, HTTPS, auto-deploy from Git |
| Database  | **TiDB Cloud Starter** (free plan) | Genuinely free indefinitely (no card, no expiry), MySQL wire-compatible, works unchanged with the `mysql2` driver already used in this project |

Everything is environment-variable-driven — no code changes are needed to
move between local development, this free setup, and paid hosting later.

> **A note on Vercel's terms:** Vercel's Hobby plan is intended for
> personal/non-commercial projects. It works perfectly for the V1
> development-and-testing phase described here, but if this becomes a
> permanent tool the company relies on day-to-day, plan to move the
> frontend to Vercel Pro (or another host) at that point — the deployment
> steps below are identical either way, only the plan changes.

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

## 2. Environment Variable Configuration

Nothing is hardcoded anywhere in the codebase — every credential, URL, and
secret is read from environment variables.

### Backend (`backend/.env` locally, or Render's Environment tab in production)

| Variable | Example (production) | Notes |
|---|---|---|
| `PORT` | *(leave unset)* | Render injects this automatically |
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
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` | Your deployed Render URL + `/api` |

**Never commit `.env` files** — both `backend/.gitignore` and
`frontend/.gitignore` already exclude them. Only `.env.example` (no real
secrets) is committed.

---

## 3. Backend Deployment (Render)

1. Push this project to a GitHub (or GitLab/Bitbucket) repository.
2. In Render, click **New +** → **Web Service** → connect your repository.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add all backend environment variables from the table above under the
   **Environment** tab.
5. Deploy. Render gives you a URL like `https://centre-bill-tracker-api.onrender.com`.
6. Verify it's alive: visit `https://<your-render-url>/health` — should
   return `{"success":true,"message":"Centre Bill Tracker API is running"}`.
7. Run the seed script once, from your local machine, pointed at the
   production database (use the same `DB_*` values you put in Render):
   ```bash
   cd backend
   npm install
   npm run seed
   ```
   (Or temporarily run `npm run seed` from Render's dashboard Shell tab,
   then close it — either works.)

**Alternative:** the included `render.yaml` at the project root lets you use
Render's **New +** → **Blueprint** flow instead of manual setup — it
pre-fills the build/start commands and generates `JWT_SECRET` for you; you
still fill in the `DB_*` and `CLIENT_ORIGIN` values yourself.

**Free tier behavior to expect:** the service spins down after 15 minutes
of no traffic and takes 30–60 seconds to wake up on the next request. For 4
internal users, this just means the first request of the day (or after a
break) is slow — nothing to fix, just expected free-tier behavior. It goes
away automatically the moment you upgrade to a paid Render instance.

---

## 4. Frontend Deployment (Vercel)

1. In Vercel, click **Add New** → **Project** → import the same repository.
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
3. Add the environment variable `VITE_API_BASE_URL` pointing at your Render
   backend URL (with `/api` at the end), e.g.
   `https://centre-bill-tracker-api.onrender.com/api`.
4. Deploy. Vercel gives you a URL like `https://centre-bill-tracker.vercel.app`.
5. `frontend/vercel.json` (already included) rewrites all routes to
   `index.html`, so React Router's client-side routes (e.g. `/bills`,
   `/dashboard`) work correctly on direct load and on refresh.

---

## 5. Connect the Frontend and Backend (CORS)

1. Go back to Render → your backend service → Environment tab.
2. Set `CLIENT_ORIGIN` to your actual Vercel URL, e.g.
   `https://centre-bill-tracker.vercel.app` (no trailing slash). If you
   also want to keep testing from `localhost:5173`, use a comma-separated
   list: `https://centre-bill-tracker.vercel.app,http://localhost:5173`.
3. Save — Render redeploys automatically. The backend only accepts requests
   from origins listed here (see `backend/src/app.js`); anything else is
   rejected by CORS.

## 6. Final Verification Checklist

- [ ] `https://<render-url>/health` returns success
- [ ] Visiting the Vercel URL shows the login page
- [ ] Logging in with the seeded Admin account works and reaches the Dashboard
- [ ] Logging in with the seeded Operations account works, and management
      actions (Add Centre, Edit Bill, Mark Paid) are correctly hidden/blocked
- [ ] Adding a centre and a bill from the deployed app persists correctly
      (refresh the page — data should still be there, confirming it's
      reading from the cloud database, not local state)
- [ ] Direct-loading a deep link, e.g. `https://<vercel-url>/bills`, and
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
   `DB_SSL` in Render's environment variables. No code changes.

**Backend:** Any Node.js host works (Render paid tier, Railway, a VPS,
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
