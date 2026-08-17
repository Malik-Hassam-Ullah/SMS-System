# 🏫 School Management System (SMS)

A multi-school, multi-branch School Management System — built with **React + Node.js + Supabase**.

> Supports multiple schools, multiple branches per school. Each branch has its own isolated data, Admin, Accountant, and Teachers.

---

## ✅ Features

| Module | Description |
|---|---|
| 🔐 Auth & RBAC | JWT-based login, 3 roles: Admin / Accountant / Teacher |
| 🏫 Students | Add, Edit, Import via CSV/Excel |
| 👨‍🏫 Teachers | Registration with automatic login account creation |
| 🗂️ Academic | Classes, Sections, Subjects, Sessions, Exams |
| 📝 Marks | Bulk marks entry by teachers, auto-grading |
| 📅 Attendance | Daily marking + percentage report |
| 💰 Fees | Vouchers, Partial Payments, Outstanding Balances, Printing |
| 📨 Messages | Bulk messaging (SMS/WhatsApp API placeholder ready) |
| 📜 Certificates | Character & Leaving Certificates with auto-validation |
| 🔍 Audit Logs | Every admin action is logged automatically |

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite, Tailwind CSS v3, Zustand, React Hook Form, Recharts
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Auth**: Supabase Auth + JWT
- **Deployment**: Vercel (Frontend) + Render (Backend)

---

## 🚀 Step 1 — Supabase Setup

### 1.1 Create a New Supabase Project

1. Go to 👉 [https://supabase.com](https://supabase.com) and sign in.
2. Click **"New Project"**.
3. Give it a name (e.g. `DemoSchool`), choose a region, and set a database password.
4. Wait for the project to be ready (~60 seconds).

---

### 1.2 Get Your API Keys 🔑

Once the project is ready:

1. In the left sidebar, click **"Project Settings"** (gear icon at the bottom).
2. Click **"API"** from the settings menu.

You will see:

```
Project URL:     https://xxxxxxxxxx.supabase.co     ← copy this
anon public:     eyJhbGci...                         ← copy this
service_role:    eyJhbGci...                         ← copy this (keep SECRET!)
```

> ⚠️ **IMPORTANT**: The `service_role` key has full admin access to the database. Never expose it in the frontend. Only use it in the backend `.env`.

---

### 1.3 Run the Database Schema

1. In the Supabase sidebar, click **"SQL Editor"**.
2. Click **"New Query"**.
3. Open the file `supabase/schema.sql` from this project on your computer.
4. Copy all the contents and paste into the SQL Editor.
5. Click **"Run"** (Ctrl+Enter).
6. You should see: `Success. No rows returned.`

---

### 1.4 Run the Seed Data (Demo School)

1. Click **"New Query"** again in the SQL Editor.
2. Open `supabase/seed.sql` from this project.
3. Copy all contents and paste into the SQL Editor.
4. Click **"Run"**.
5. This creates:
   - `Demo School` with one branch: `Main Branch`
   - Default fee structures
   - 3 user accounts linked:
     - **Admin**: `admin@demo.com` / `Admin@1234`
     - **Accountant**: `accountant@demo.com` / `Account@1234`
     - **Teacher**: `teacher@demo.com` / `Teacher@1234`

> 📝 The seed script creates these users automatically in Supabase Auth.

---

## ⚙️ Step 2 — Environment Variables

### Backend `.env` — Create this file at `f:\SMS\backend\.env`

```env
PORT=5000
NODE_ENV=development

# ─── Supabase ─────────────────────────────────────────────────
# Project Settings > API > Project URL
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# Project Settings > API > service_role (secret — never expose!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your_service_role_key...

# Project Settings > API > anon public
SUPABASE_ANON_KEY=eyJhbGci...your_anon_key...

# ─── JWT ──────────────────────────────────────────────────────
# Make up any long random string (minimum 32 characters)
JWT_SECRET=change_this_to_any_long_random_secret_string_32chars

# ─── Messaging APIs (fill later when customer provides) ───────
# SMS_API_KEY=
# SMS_API_URL=
# WHATSAPP_API_KEY=
# WHATSAPP_API_URL=
```

---

### Frontend `.env` — Create this file at `f:\SMS\frontend\.env`

```env
# Project Settings > API > Project URL
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# Project Settings > API > anon public (safe to use in frontend)
VITE_SUPABASE_ANON_KEY=eyJhbGci...your_anon_key...

# Backend URL (localhost for development)
VITE_API_URL=http://localhost:5000
```

> 💡 **Tip**: Both `VITE_SUPABASE_URL` and `SUPABASE_URL` should be the same value. Same for the anon key.

---

## 💻 Step 3 — Run Locally

Open **two terminals** inside `f:\SMS\`:

### Terminal 1 — Backend
```bash
cd backend
npm install
npm run dev
```
✅ Backend will start at: `http://localhost:5000`

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```
✅ Frontend will open at: `http://localhost:5173`

---

## 🔐 Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `Admin@1234` |
| Accountant | `accountant@demo.com` | `Account@1234` |
| Teacher | `teacher@demo.com` | `Teacher@1234` |

---

## 🌍 Deployment (Each Customer = Separate Instance)

### Your Strategy:
> Each customer gets their own Supabase project, Vercel frontend, and Render backend.
> You share the same GitHub repo — add each customer as a contributor.

| Layer | Platform | Notes |
|---|---|---|
| Database | Supabase | Fresh project per customer, run `schema.sql` |
| Frontend | Vercel | Deploy `frontend/` folder, set customer's env vars |
| Backend | Render | Deploy `backend/` folder as Web Service, set customer's env vars |

### Steps for New Customer:
1. Create a new Supabase project → run `schema.sql` + `seed.sql`
2. Go to Vercel → Import GitHub repo → set **Root Directory** to `frontend` → add env vars
3. Go to Render → New Web Service → connect GitHub repo → set **Root Directory** to `backend` → add env vars
4. Add their GitHub account as a **Collaborator** in your repo settings

---

## 📁 Project Structure

```
SMS/
├── backend/
│   ├── src/
│   │   ├── config/          # Supabase client
│   │   ├── middleware/       # Auth + Error handlers
│   │   ├── routes/          # All API routes
│   │   └── utils/           # Audit logger
│   ├── .env                 # Your secrets (gitignored)
│   ├── .env.example         # Template (committed to git)
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── api/             # All API function modules
│   │   ├── components/      # Layout + Common UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # All page components by role
│   │   ├── store/           # Zustand auth store
│   │   └── utils/           # Formatters (PKR, dates, grades)
│   ├── .env                 # Your secrets (gitignored)
│   ├── .env.example         # Template (committed to git)
│   └── vite.config.js
│
├── supabase/
│   ├── schema.sql           # Full DB schema + RLS policies
│   └── seed.sql             # Demo school data (gitignored)
│
├── CREDENTIALS.md           # Demo credentials guide (gitignored)
└── README.md
```

---

## ❓ Common Issues

**Q: Frontend shows blank page / console error about env vars?**
→ Make sure your `frontend/.env` file exists and has the `VITE_` prefix on all variables. Restart `npm run dev` after adding the file.

**Q: Backend returns 401 on every request?**
→ Check that `JWT_SECRET` in `backend/.env` is set. Also verify the Supabase `SERVICE_ROLE_KEY` is correct.

**Q: "relation does not exist" error from Supabase?**
→ You haven't run `schema.sql` yet. Go to Supabase SQL Editor and run it.

**Q: Can't login with demo credentials?**
→ The `seed.sql` script creates users in Supabase Auth. Make sure you ran it. You can verify by going to **Supabase → Authentication → Users** — you should see 3 users.
