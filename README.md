# Typeform Clone

A full-stack Typeform-inspired application built for the SDE Fullstack
Assignment.

The project focuses on the two most important parts of the assignment:

1. A clean, drag-and-drop form builder for creators.
2. A polished, one-question-at-a-time experience for respondents.

Creators can build forms, publish them, share a public link, collect responses,
and review the results. Respondents do not need to create an account.

## Live demo

- **Vercel:** [https://typeform-clone-black.vercel.app](https://typeform-clone-black.vercel.app)

- **API documentation:** [https://typeform-clone-api-mnow.onrender.com/docs](https://typeform-clone-api-mnow.onrender.com/docs)


## What the application does

### Creator workspace

- Sign in with Google.
- Create, rename, duplicate, publish, unpublish, and delete forms.
- Create, rename, and delete workspaces.
- Search and sort forms.
- See draft/published status and response counts.
- Copy a public form link.
- Switch between light and dark mode. The preference is saved in the browser.

### Form builder

The builder supports:

- Short text
- Long text
- Multiple choice
- Dropdown
- Email
- Number
- Yes/no
- Rating

For every question, the creator can:

- Add and edit the question.
- Drag and reorder questions.
- Delete the question.
- Mark it as required or optional.
- Add description/help text.
- Configure choices, rating ranges, and number limits where relevant.
- See the form in a live preview.

### Public respondent flow

Every published form gets a shareable URL such as:

```text
/f/abc12345
```

The respondent experience is designed to feel like Typeform:

- One question is shown at a time.
- Questions transition smoothly.
- A progress indicator shows how far the respondent has progressed.
- Enter and arrow-key navigation is supported where appropriate.
- Required fields and field formats are validated in the browser and again by
  the backend.
- A successful submission is stored in SQLite and ends with a thank-you screen.
- No login is required to fill out a published form.

### Results

Creators can:

- View all submissions for a form.
- Open an individual response.
- View summary statistics for supported question types.
- See response counts in the workspace.

## Technology stack

This project uses the stack requested in the assignment:

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion,
  and `@dnd-kit`.
- **Backend:** Python, FastAPI, SQLAlchemy, and Pydantic.
- **Database:** SQLite.
- **Authentication:** Google OAuth through Auth.js/NextAuth.
- **Deployment:** Vercel for the frontend and Render for the backend.

## Project structure

```text
.
├── frontend/                 # Next.js application
│   └── src/
│       ├── app/              # Pages, routes, auth handlers
│       ├── components/       # Shared UI and question components
│       ├── hooks/            # Client hooks such as toasts
│       ├── lib/              # API client, auth, types, validation
│       └── styles/            # Tailwind and Typeform design tokens
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── routers/           # Creator and public API routes
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Form, response, and statistics logic
│   ├── alembic/               # Database migrations
│   ├── seed.py                # Sample data seeder
│   └── tests/                 # Backend tests
└── render.yaml                # Render deployment configuration
```

## Run it locally

### Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- A Google OAuth application for creator login

### 1. Start the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and set a strong
`BACKEND_AUTH_SECRET`. Then initialize the database and start the API:

```bash
python seed.py --reset
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The API will be available at [http://localhost:8000](http://localhost:8000).
Interactive API documentation is available at
[http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env.local` and configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-secret
BACKEND_AUTH_SECRET=the-same-secret-used-by-the-backend
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google OAuth redirect URI

For local development, add this URI to the Google OAuth client:

```text
http://localhost:3000/api/auth/callback/google
```

For the deployed application, add:

```text
https://typeform-clone-black.vercel.app/api/auth/callback/google
```

The landing page and public `/f/[slug]` pages remain accessible without
authentication. Creator routes such as `/workspace`, `/builder`, and `/results`
require Google login.

## Architecture

The frontend is responsible for the user interface, animations, drag-and-drop
editing, and the public respondent experience. The backend is responsible for
authentication checks, validation, persistence, and response statistics.

```text
Next.js / React
      |
      | typed API requests
      v
FastAPI routers
      |
      v
Service layer
      |
      v
SQLAlchemy models
      |
      v
SQLite
```

Creator requests use a short-lived, HMAC-signed bearer token created from the
Google session. FastAPI verifies the token and scopes creator operations to the
authenticated email address. Public form retrieval and response submission use
separate unauthenticated endpoints and only expose published forms.

## Database design

The database is intentionally small and relational:

| Table | Purpose |
| --- | --- |
| `forms` | Form title, owner, status, public slug, theme, thank-you text, and timestamps |
| `questions` | Ordered questions, type, title, description, required state, and options |
| `responses` | One submission for a form, including respondent metadata and timestamp |
| `answers` | One answer for one question in one response |
| `alembic_version` | Tracks applied database migrations |

Relationships:

```text
forms
 ├── questions
 └── responses
       └── answers
```

- A form has many questions and many responses.
- A response has many answers.
- An answer belongs to one response and one question.
- Deleting a form cascades to its questions, responses, and answers.
- Foreign keys are enabled for every SQLite connection.
- Choice options are stored with stable IDs and labels.

Workspace names and workspace-to-form display assignments are currently stored
in the signed-in creator's browser local storage. Form records and responses
remain persisted in the backend SQLite database.

## API overview

### Authenticated creator endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/forms` | List the signed-in creator's forms |
| `POST` | `/api/forms` | Create a form |
| `GET` | `/api/forms/{id}` | Read a form |
| `PATCH` | `/api/forms/{id}` | Rename/update a form |
| `DELETE` | `/api/forms/{id}` | Delete a form and related data |
| `POST` | `/api/forms/{id}/duplicate` | Duplicate a form |
| `POST` | `/api/forms/{id}/publish` | Publish and generate a public slug |
| `POST` | `/api/forms/{id}/unpublish` | Return a form to draft status |
| `PUT` | `/api/forms/{id}/questions` | Save the ordered question list |
| `GET` | `/api/forms/{id}/responses` | List responses |
| `GET` | `/api/forms/{id}/responses/{responseId}` | Read one response |
| `GET` | `/api/forms/{id}/summary` | Get question summary statistics |

### Public endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/forms/{slug}` | Load a published form |
| `POST` | `/api/public/forms/{slug}/responses` | Validate and store a response |

The backend validates required fields, email addresses, numeric values and
limits, rating ranges, yes/no answers, supported question types, and choice
membership. Invalid submissions return a clear validation error.

## Seed data

The seed script creates published sample forms with mixed question types and
existing responses so the project can be explored immediately:

```bash
cd backend
python seed.py --reset
```

The local SQLite database is created under `backend/data/`.

## Verification

Frontend production build:

```bash
cd frontend
npm run build
```

Backend tests:

```bash
cd backend
PYTHONPATH=. pytest -q
```

Database migrations:

```bash
cd backend
alembic upgrade head
```

## Assignment coverage

| Assignment requirement | Status |
| --- | --- |
| Drag-and-drop builder | Implemented |
| Eight required question types | Implemented |
| Required fields and descriptions | Implemented |
| Live preview | Implemented |
| Form CRUD and persistence | Implemented |
| Publish/unpublish and shareable link | Implemented |
| Public unauthenticated respondent flow | Implemented |
| Keyboard navigation and progress | Implemented |
| Client and server validation | Implemented |
| Response list, detail, and summaries | Implemented |
| Google-only creator login | Implemented |
| Toasts, modals, inline editing, and Typeform-style UI | Implemented |
| Logic jumps, integrations, collaboration, payments, and file upload | Coming Soon placeholders |
| Custom themes and CSV export | Not included in the current version |
| Dark mode | Implemented |

## Assumptions and limitations

- Google login is used for creators; respondents do not need accounts.
- Workspace names are a frontend feature for this assignment and are stored in
  local storage rather than a separate backend workspace table.
- SQLite is retained to match the required technical stack.
- The deployed free-tier service can experience a cold start.
- The hosted database uses SQLite and depends on the configured Render
  persistent storage. For a larger production system, a managed database such
  as PostgreSQL would be a natural next step, but it is intentionally not used
  here because the assignment requires SQLite.
- Advanced logic jumps, integrations, team collaboration, payments, and file
  uploads are represented by Coming Soon pages.

## Original work

This repository was built specifically for the assignment. It does not copy
an existing Typeform clone or reuse another project's source code.
