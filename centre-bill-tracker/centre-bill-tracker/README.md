# Centre Bill Tracker Portal (V1)

A centralized portal to track internet bills across all company centres —
replacing manual Excel-based tracking. Built strictly to the approved V1
SRD and database schema.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React (Vite) + Tailwind CSS |
| Backend  | Node.js + Express |
| Database | MySQL (or any MySQL-compatible service, e.g. TiDB Cloud) |
| Auth     | JWT (Bearer token) + bcrypt password hashing |

## Project Structure

```
centre-bill-tracker/
├── backend/            Express API (see backend/src for controllers, models, routes)
├── frontend/           React app (Vite)
├── render.yaml          Optional Render Blueprint for one-click backend deploy
└── DEPLOYMENT.md         Full deployment guide (Vercel + Render + cloud MySQL)
```

## Modules (V1 Scope)

1. **Login** — Admin and Operations roles, JWT-based sessions
2. **Dashboard** — 5 summary cards + latest bills list, computed live
3. **Centre Management** — Admin-only CRUD; Operations has read access
4. **Bill Management** — Add/edit bills, forward-only status flow (Pending → Received → Paid)

Out of scope for V1 (see SRD section 10): GST/TDS, Excel import/export, PDF
upload, reports, charts, audit logs, email/WhatsApp notifications, advanced
vendor management, multi-level permissions, and a User Management UI (users
are provisioned via a seed script only).

## Local Development Setup

### Prerequisites
- Node.js 18+
- A running MySQL server (local install, or a free cloud instance — see `DEPLOYMENT.md`)

### 1. Database
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS centre_bill_tracker"
mysql -u root -p centre_bill_tracker < backend/src/database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET
npm install
npm run seed     # creates the one Admin + one Operations account
npm run dev       # starts on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Default VITE_API_BASE_URL=http://localhost:5000/api works out of the box
npm install
npm run dev       # starts on http://localhost:5173
```

### 4. Log in
Use the credentials from `backend/.env` (`SEED_ADMIN_USERNAME` /
`SEED_ADMIN_PASSWORD`, defaults `admin` / `Admin@123`). **Change these
defaults before any real deployment.**

## Deploying to the Internet (Free Tier)

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the complete guide: cloud MySQL
setup, Render backend deployment, Vercel frontend deployment, environment
variables, and how to migrate to paid hosting later without any
architecture changes.

## Business Rules Enforced (server-side, not just UI)

- One bill per centre per bill month (unique constraint + pre-check)
- Invoice numbers are globally unique
- Due date is mandatory on every bill
- Amount must be greater than 0
- Bill status only moves forward: Pending → Received → Paid (no skipping, no reverting)
- Only an Admin can move a bill from Received → Paid; `payment_date` is set
  automatically to today's date on that transition and is never accepted
  from the client
- A centre with linked bills cannot be hard-deleted — only deactivated
- Account numbers are unique when provided; WiFi ID and account number may
  be left blank
