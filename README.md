# Nexa Backend (minimal)

This folder contains a minimal Express + Postgres backend for the Nexa Loan Management demo.

Quick start

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.

2. Install dependencies:

```powershell
cd backend
npm install
```

If you're on Windows PowerShell and see an error like "npm.ps1 cannot be loaded because running scripts is disabled on this system", use the included helper script which invokes the Windows npm executable directly.

```powershell
# From the backend folder
.\setup.ps1
# or, if you've already installed packages
#.\setup.ps1 -SkipInstall
```

3. Run migrations (creates tables from `init.sql`):

```powershell
npm run migrate
```

4. Seed an admin user (optional):

```powershell
# either set ADMIN_EMAIL and ADMIN_PASSWORD in your environment/.env, or rely on defaults
npm run seed
```

5. Start the server:

```powershell
npm start
# or dev with reload
npm run dev
```

API overview

- `POST /api/auth/register` — register a user; sets httpOnly JWT cookie
- `POST /api/auth/login` — login; sets httpOnly JWT cookie
- `POST /api/auth/logout` — clears cookie
- `GET /api/me` — protected; returns user info

Products
- `GET /api/products` — list loan products
- `GET /api/products/:id` — product details

Applications
- `POST /api/applications` — submit loan application (authenticated)
- `GET /api/applications` — list your applications
- `GET /api/applications/admin/all` — admin: list all applications
- `PATCH /api/applications/:id` — admin: update status (approve/reject)

Loans & Payments
- `GET /api/loans` — list your loans
- `GET /api/loans/admin/all` — admin: list all loans
- `POST /api/pay/pay` — make mock payment (authenticated)
- `GET /api/pay/loan/:loanId` — payments for loan

Notes
- JWT is stored in an httpOnly cookie named by `COOKIE_NAME` env variable (defaults to `nexa_token`).
- In production set `NODE_ENV=production` to make cookies `secure`.
- `migrate.js` runs `init.sql` as a single script. Run it against a test DB first if unsure.

Deploying to Render (single service)
 - Create a new Web Service on Render and connect your Git repo containing this project.
 - Set the Root Directory to `backend` (so Render runs from backend/).
 - Environment variables (add these in the Render dashboard):
	 - `DATABASE_URL` — Postgres connection string
	 - `JWT_SECRET` — secure random secret for signing tokens
	 - `NODE_ENV` — set to `production` in Render
	 - Optional: `FRONTEND_URL` if you plan to call the backend from a separate frontend service
	 - Optional: `ADMIN_EMAIL`, `ADMIN_PASSWORD` for seeding admin
 - Build & Start commands: Render will run `npm install` then `npm start` by default. `Procfile` (present) will start `node index.js`.
 - The backend serves the static frontend files from the `Frontend/` folder, so deploying this service will host both frontend and backend automatically.

Security & production notes
 - Cookies are set with `httpOnly` and `sameSite='lax'`. In production ensure `NODE_ENV=production` so cookies are marked `secure` and only sent over HTTPS.
 - Render terminates SSL at the platform edge; Express has `app.set('trust proxy', true)` configured so secure cookies and client IPs work correctly.
 - Always use a strong `JWT_SECRET`; rotate it if compromised.
 - Consider adding a centralised secret manager for production secrets.
