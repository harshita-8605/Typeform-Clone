# Typeform Clone — Full-stack SDE Assignment

A Typeform-inspired form builder with persistent form management, a shareable one-question-at-a-time respondent experience, and response analytics.

## Stack

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, and `@dnd-kit`.
- **Backend:** FastAPI, SQLAlchemy, and Pydantic.
- **Database:** SQLite with foreign-key enforcement enabled on every connection.

## Run locally

Prerequisites: Node.js 18+ and Python 3.10+.

```bash
# Terminal 1 — API
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py --reset
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2 — web app
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs), and the health check is `GET /api/health`.

### Google login configuration

Creator pages are protected by Google-only Auth.js login. The landing page and
public `/f/[slug]` respondent links remain accessible without an account.

1. Create a Google OAuth 2.0 Web application in Google Cloud.
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
3. Copy `frontend/.env.example` to `frontend/.env.local`.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a long random
   `NEXTAUTH_SECRET`.

After login, creators are redirected to `/workspace`. In production, replace
`NEXTAUTH_URL` and the Google redirect URI with the deployed frontend URL.

`backend/seed.py` resolves the SQLite file relative to the backend itself, so it also works when invoked from the repository root as `backend/venv/bin/python backend/seed.py --reset`.

## What is included

- Workspace with create, rename, duplicate, delete, publish/unpublish, share, and results actions.
- Public landing page with Google-only creator login and protected creator routes.
- Drag-sortable builder supporting short text, long text, multiple choice, dropdown, email, number, yes/no, and rating questions.
- Debounced builder saves, question descriptions, required controls, option and rating editors, live preview, toasts, and settings/theme placeholders.
- Public `/f/[slug]` flow with keyboard controls, client/server validation, animated question transitions, progress, and a thank-you state.
- Response list, response detail, and per-question summaries.
- Two published seed forms with all supported question types and five realistic saved responses in total.

## Routes

| Route | Purpose |
| --- | --- |
| `/workspace` | Creator form list |
| `/builder/[formId]` | Builder and live preview |
| `/results/[formId]` | Response list and summaries |
| `/results/[formId]/[responseId]` | One submitted response |
| `/f/[slug]` | Public, unauthenticated respondent flow |

## Architecture

The Next.js client owns presentation and short-lived editing state. It calls FastAPI through a small typed fetch wrapper. API routers stay thin; form mutation, response validation/storage, and summary aggregation live in service modules. SQLAlchemy models are the persistence boundary.

```text
Next.js UI → FastAPI routers → services → SQLAlchemy → SQLite
                 ↑                ↑
              Pydantic         seed.py
```

The same service layer is used by the API and seed script; the seeder does not make HTTP calls to a local server.

## Database design

| Table | Key fields | Relationships |
| --- | --- | --- |
| `forms` | `id`, `owner_email`, `title`, unique `slug`, `status`, theme/thank-you JSON/text, timestamps | Owns questions and responses |
| `questions` | `form_id`, `order_index`, type, title, description, required, `options_json` | Unique `(form_id, order_index)`; owns answers |
| `responses` | `form_id`, respondent metadata JSON, timestamp | Owns answers |
| `answers` | `response_id`, `question_id`, typed value columns | Unique `(response_id, question_id)` |

All foreign keys use `ON DELETE CASCADE`; ORM relationships also use `delete-orphan`. SQLite's `PRAGMA foreign_keys = ON` is registered for every connection. Choice options use stable `{ id, label }` objects in JSON, allowing labels to change without redefining the stored option identity.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/api/forms` | List forms / create form |
| `GET`, `PATCH`, `DELETE` | `/api/forms/{id}` | Read, update, or delete a form |
| `POST` | `/api/forms/{id}/duplicate` | Duplicate a form and its questions |
| `POST` | `/api/forms/{id}/publish`, `/unpublish` | Change public availability |
| `PUT` | `/api/forms/{id}/questions` | Replace/upsert the ordered question list |
| `GET` | `/api/forms/{id}/responses` | List submissions |
| `GET` | `/api/forms/{id}/responses/{responseId}` | Read one submission |
| `GET` | `/api/forms/{id}/summary` | Per-question aggregate statistics |
| `GET` | `/api/public/forms/{slug}` | Read a published public form |
| `POST` | `/api/public/forms/{slug}/responses` | Validate and persist a submission |

Response submission accepts typed answer columns (`value_text`, `value_number`, `value_boolean`, or `value_json`). Required fields, email addresses, numeric limits, ratings, boolean values, and option membership are checked on the server. Invalid submissions return `422` with a per-question error map.

## Verification

```bash
cd frontend && npm run build
cd ../backend && python seed.py --reset
```

The seed output prints public URLs for both generated forms. Creator API requests are scoped to the authenticated Google email through the `X-Creator-Email` header; public form filling has no auth requirement. Existing databases receive the nullable `owner_email` column automatically at API startup.
