# Typeform Clone — Fullstack SDE Assignment

A functional clone of Typeform replicating the drag-and-drop builder, the signature one-question-at-a-time conversational respondent flow, and a full results dashboard.

> ℹ️ This README is a **STUB** written at scaffolding time so restart commands are always handy. It will be expanded into the full deliverable before final submission.

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | **Next.js 14 App Router** + TypeScript + Tailwind CSS + Framer Motion + @dnd-kit |
| Backend  | **FastAPI** (Python) + SQLAlchemy ORM + Pydantic validation |
| Database | **SQLite** (file-based, no external setup) with FK enforcement enabled via `PRAGMA foreign_keys = ON` |
| Animation | Framer Motion (respondent transitions) + @dnd-kit sortable (builder drag) |

## 🏃 Running locally

### Prerequisites

- Node.js 18+ (tested on Node 24)
- Python 3.10+ (tested on Python 3.14)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt

# Seed the database (--reset clears it first — always safe for a fresh clone)
python seed.py --reset

# Start the API (auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- OpenAPI / Swagger docs: http://localhost:8000/docs
- Health check:         http://localhost:8000/api/health → `{"status":"ok"}`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Opening http://localhost:3000 redirects to `/workspace` where the creator's forms list lives.

### Seeded sample data

After `python seed.py --reset` the DB contains:
- **Form #1** — *Customer Feedback Survey* (8 question types, 3 sample responses)
- **Form #2** — *Developer Survey 2026* (8 question types, 2 sample responses)

Both are already `published` so you can open their respondent URLs right away.

## 🧭 Routes overview

### Creator (authenticated — single default creator, no login required)

| Route | Page |
|---|---|
| `/workspace` | Forms list + create / rename / duplicate / delete / publish |
| `/builder/[formId]` | Drag-and-drop builder + live preview |
| `/results/[formId]` | Responses list + summary stats |
| `/results/[formId]/[responseId]` | Single response detail view |

### Public (shareable — no auth required)

| Route | Page |
|---|---|
| `/f/[slug]` | Respondent flow — one question at a time with animated transitions |

## 🔌 API overview (partial — expanded in final README)

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/forms` | List creator's forms with response counts |
| POST | `/api/forms` | Create new form |
| GET  | `/api/forms/{id}` | Form detail with questions |
| PATCH| `/api/forms/{id}` | Rename / change status |
| POST | `/api/forms/{id}/duplicate` | Duplicate form + questions |
| DELETE | `/api/forms/{id}` | Delete (cascades → questions → responses → answers) |
| POST | `/api/forms/{id}/publish` | Set status=`published`, generate unique slug |
| POST | `/api/forms/{id}/unpublish` | Revert to `draft` |
| PUT  | `/api/forms/{id}/questions` | Upsert full ordered question list (builder uses this) |
| GET  | `/api/forms/{id}/summary` | Per-question stats |
| GET  | `/api/forms/{id}/responses` | Paginated responses list |
| GET  | `/api/forms/{id}/responses/{rid}` | Single response detail |
| GET  | `/api/public/forms/{slug}` | Public form data (404 if not published) |
| POST | `/api/public/forms/{slug}/responses` | Submit a filled-out form (validates required/email/range/option) |

## 🗂️ Repository structure

```
typeform-clone/
├── frontend/
│   └── src/
│       ├── app/              # Next.js App Router routes (page.tsx files)
│       ├── components/
│       │   ├── builder/      # Builder canvas, sidebar, preview
│       │   ├── questions/    # SHARED: 8 question-type renderers
│       │   ├── respondent/   # Full-screen respondent shell + transitions
│       │   ├── results/      # Summary stats + response table/detail
│       │   └── ui/           # Primitives: button, input, toast, modal…
│       ├── hooks/            # useToast + custom hooks
│       ├── lib/              # api client, validators, types, utils
│       └── styles/           # globals.css + CSS vars theme
│
├── backend/
│   ├── seed.py               # Sample data seeder (calls service layer, NOT HTTP)
│   ├── requirements.txt
│   ├── data/
│   │   └── typeform.db       # SQLite DB file (gitignored, auto-created)
│   └── app/
│       ├── main.py           # FastAPI app + CORS + routers
│       ├── database.py       # SQLAlchemy engine, session, Base, PRAGMA FK=ON
│       ├── models/           # Form, Question, Response, Answer (SQLAlchemy)
│       ├── schemas/          # Pydantic request / response bodies
│       ├── routers/          # forms.py + public.py + responses.py (API routes)
│       ├── services/         # form_service / response_service / stats_service
│       └── utils/            # validators (email, option values, …)
│
├── .gitignore
└── README.md
```

## 🚀 Deployment (task later)

Planned target:
- **Frontend** → Vercel (native Next.js hosting)
- **Backend**  → Render / Railway / Fly.io (persistent disk volume required so SQLite survives redeploys)
- Or replace SQLite with Postgres in hosted version if needed.

---

*Full architecture, database schema diagram, validation rules, and complete API reference coming in the final README.*
