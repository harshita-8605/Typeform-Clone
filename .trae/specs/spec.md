# Typeform Builder Clone - Product Requirements Document

## Overview
- **Summary**: Build a functional full-stack clone of Typeform that replicates the core form-building experience, the signature one-question-at-a-time respondent flow, form management, and results viewing. The application should visually and functionally resemble the original Typeform platform.
- **Purpose**: Demonstrate full-stack engineering skills through a realistic, complex product clone — including a polished drag-and-drop form builder, the distinctive conversational respondent UX, persistent data models, and clean API design.
- **Target Users**:
  - **Creator**: A logged-in user who designs, edits, publishes, and reviews forms and their responses.
  - **Respondent**: An anonymous public user who fills out a published form via a shareable link (no authentication required).

## Goals
- Replicate Typeform's signature conversational, one-question-at-a-time respondent flow with smooth animated transitions and keyboard navigation.
- Deliver a visually clean drag-and-drop form builder with live preview matching Typeform's aesthetic.
- Provide full form lifecycle management: create, read, update, rename, duplicate, delete, publish/unpublish with shareable links.
- Persist all form definitions, responses, and summary statistics in SQLite.
- Deliver a complete results dashboard with per-response detail views and per-question summary statistics.
- Achieve high visual fidelity to the original Typeform UI/UX (fonts, spacing, colors, component shapes, motion, layout).

## Non-Goals
- Advanced logic jumps / complex branching beyond basic "if-then" placeholders (marked optional / Coming Soon).
- Team collaboration, role-based sharing, and multi-user accounts (single default creator assumed).
- Payment and file-upload question types (Coming Soon placeholder acceptable).
- Integrations, webhooks, Slack/Zapier/Calendly integrations (Coming Soon placeholder).
- Real email delivery, user sign-up with email verification, or password-based authentication (assume default logged-in creator).
- Deployed hosting infrastructure setup automation (deliverables note deployed link separately; implementation focuses on code).

## Background & Context
The assignment specifies the following technical stack:
- **Frontend**: Next.js with TypeScript
- **Backend**: Python with FastAPI (preferred for clean async-first API ergonomics; aligns well with Next.js client calls)
- **Database**: SQLite (file-based; schema must be designed explicitly with proper FK relationships)

The current working directory contains a scraped snapshot of Typeform's marketing website (CDN libraries, Webflow CSS/JS, fonts). These assets are not the actual Typeform application and cannot be launched; they serve as visual reference only. The implementation will be a fresh, clean project built from scratch in `frontend/` and `backend/` directories.

Two seed forms with mixed question types and sample responses must be preloaded so the app is usable immediately after first run.

## Functional Requirements

### FR-1 — Form Builder
1. Create a form with a title and an ordered list of questions.
2. Add questions of these types: **short text, long text, multiple choice, dropdown, email, number, yes/no, rating**.
3. Edit a question's title, description/help text, required toggle, and type-specific options (choices for MC/dropdown, max for rating, etc.).
4. Reorder questions via drag-and-drop.
5. Delete questions.
6. Live preview of the form that updates as the creator edits.
7. Per-question settings panel with required toggle and description/help text.

### FR-2 — Form Management (CRUD)
1. List all of the creator's forms showing title, status (draft/published), last updated timestamp, and response count.
2. Create a new empty form.
3. Rename an existing form.
4. Duplicate an existing form (including its questions).
5. Delete a form.
6. Publish / unpublish a form; publishing generates a shareable public URL.
7. All form definitions persist across server restarts (SQLite).

### FR-3 — Respondent Flow (Public Form Fill)
1. Display one question at a time in full-screen layout.
2. Smooth, animated transitions between questions (slide/ fade style).
3. Progress indicator showing position in the form (percent complete or step counter).
4. Keyboard navigation: Enter key advances; arrow keys move between options / next-prev where applicable.
5. Client-side validation: required field check, email format, numeric format, min/max.
6. Server-side validation of the same rules.
7. Submitting stores the full response in the database and shows a thank-you screen.
8. No login required to fill a published form (publicly accessible route).
9. Published link is structured and shareable (e.g., `/f/{form_id_or_slug}`).

### FR-4 — Results / Responses
1. Per-form responses list/table with submitter metadata (timestamp).
2. Individual response detail view showing all question answers.
3. Basic summary statistics per question: counts for multiple choice / dropdown, averages for rating/number, text length stats.
4. All responses persist across server restarts.

### FR-5 — Typeform Experience Polish
1. UI visually matches Typeform: sans-serif Inter-style fonts, ample whitespace, rounded inputs, pill-shaped buttons, Typeform signature purple (#601FEE / similar brand color).
2. One-at-a-time fill UX with the distinctive "OK / Next" action button and enter-to-continue behavior.
3. Clean builder layout with a left sidebar of question types, a center canvas of ordered questions, and a right (or inline) live preview.
4. Notifications / toasts for save, publish, duplicate, delete actions.
5. Settings placeholders (Theme, Thank-You screen customization) rendered with "Coming Soon" style surfaces.
6. Modals and inline editing patterns matching Typeform.

### FR-6 — Sample Data
1. At least **two seed published forms** each containing a mix of question types (short text, long text, multiple choice, dropdown, email, number, yes/no, rating).
2. At least **2–3 existing sample responses per seed form** so results views are populated on first launch.

### FR-7 — Documentation
1. A `README.md` in the repository root with: setup instructions (install, seed, run frontend & backend), tech stack list, architecture overview (frontend/backend/db separation, request flow), database schema (tables, columns, relationships), and API overview (key endpoints).

## Non-Functional Requirements
- **NFR-1 (Performance)**: Initial page load on localhost under 3 s; respondent transitions feel snappy (<250 ms perceived latency).
- **NFR-2 (Code Organization)**: Frontend uses reusable components and clear folder structure (components, pages, hooks, types, lib). Backend uses routers/endpoints, models, schemas, and database modules cleanly separated.
- **NFR-3 (Type Safety)**: TypeScript for all frontend code; Pydantic models on the backend; no `any` types at component/API boundaries.
- **NFR-4 (Persistence Correctness)**: Once a form or response is saved, it survives a server restart (SQLite-backed). Data integrity: deleting a form cascades to its questions and responses.
- **NFR-5 (Validation Correctness)**: Required questions rejected both on client and server; malformed email/number rejected on server.
- **NFR-6 (Shareable Link)**: Opening the published URL directly in a new incognito window renders the form without any login state.
- **NFR-7 (Accessibility / Semantics)**: Semantic HTML inputs, labels associated with inputs, keyboard-focusable buttons and options.

## Constraints
- **Technical**:
  - Frontend framework locked to **Next.js (TypeScript)**; App Router or Pages Router acceptable; App Router preferred for modern Next.js conventions.
  - Backend framework locked to **Python**; **FastAPI** selected for its clean async API, Pydantic validation, and automatic OpenAPI docs.
  - Database locked to **SQLite** (single file, no external DB setup).
  - Backend ORM: **SQLAlchemy** (sync or async). Migrations handled with Alembic or a simpler built-in create_all + seed script.
- **Business**:
  - Respondent flow must not require authentication.
  - Application must visually feel like Typeform (colors, typography, motion, layout patterns).
- **Dependencies**:
  - Frontend build requires a running API server (or mock for initial build; production requires real server).
  - Python 3.10+ and Node 18+ assumed available.

## Assumptions
- A single default creator account exists (hard-coded creator ID) — no login / JWT / OAuth is required unless creator auth is implemented as a bonus.
- Drag-and-drop library: `@dnd-kit/core` + `@dnd-kit/sortable` (modern, well-maintained, TypeScript-native) or `react-beautiful-dnd` (older but familiar); `@dnd-kit` preferred.
- Animation library for respondent transitions: Framer Motion (modern TypeScript-native) or plain CSS transitions; Framer Motion preferred for sequenced, declarative animations.
- Styling: **Tailwind CSS** for rapid, consistent UI paired with CSS variables for the Typeform brand theme.
- HTTP client on frontend: native `fetch` (with small wrapper) or **Axios** — either is acceptable; small fetch wrapper preferred to minimize deps.
- Seed sample data loaded via a `seed.py` script or equivalent run once during setup.
- The frontend static marketing-landing-page assets in the project root are treated as reference and are NOT part of the built application; the real app lives in `frontend/` and `backend/`.
- Responses are stored as JSON per-response (to accommodate arbitrary answer shapes across question types) AND per-question answer rows are optional; JSON column with per-question stored answers is acceptable for simplicity.

## Acceptance Criteria

### AC-1: Form Builder Creates & Edits Questions
- **Type**: `rule`
- **Given**: Creator navigates to the builder for a form.
- **When**: Creator adds a "Multiple Choice" question, enters 3 choices, toggles "required", and saves. Then adds a "Rating" question and reorders the two via drag.
- **Then**: The form contains both questions in the new order. The Multiple Choice question has 3 choices and `required=true`. Reloading the page preserves the state.
- **Pass Condition**: After refresh, GET `/api/forms/{id}` returns exactly those 2 questions, correct order, correct choices array, and `required: true` on the MC question.
- **Evidence**: Browser builder UI screenshot + curl GET `/api/forms/{id}` JSON output.

### AC-2: Respondent Flow Advances One Question at a Time
- **Type**: `rule`
- **Given**: A published 3-question form is opened by a respondent via `/f/{id}`.
- **When**: Respondent answers Q1, presses Enter. Then answers Q2 with a mouse click on the Next button. Then completes Q3 and presses Submit.
- **Then**: Q2 slides in with an animated transition, progress indicator increases at each step, thank-you screen appears after Submit, and a new response row exists in the database.
- **Pass Condition**: At each step only the current question is visible; progress increases monotonically; POST `/api/forms/{id}/responses` returns 201 with a response ID; thank-you screen shows within 1 second of submit.
- **Evidence**: Screen recording or DOM snapshots at each step + the 201 response body.

### AC-3: Client & Server Validation
- **Type**: `rule`
- **Given**: Form with a required email question (Q1) and a number question (Q2).
- **When**: Respondent leaves Q1 empty and presses Enter. Then types "not-an-email" and presses Enter. Then fixes email, advances to Q2, types "abc" and submits.
- **Then**: Client shows a validation error for empty, then for invalid email, then for invalid number. Server-side rejects the same submissions when API is called directly.
- **Pass Condition**: Every invalid submission returns 4xx (or client blocks submit before the call), and a valid submission returns 201.
- **Evidence**: Browser console/UI error messages + curl with invalid body returning 422 with field-specific error details.

### AC-4: Publish Generates Shareable Public Link
- **Type**: `rule`
- **Given**: A draft form exists.
- **When**: Creator clicks "Publish" in the builder / forms list.
- **Then**: Form status becomes `published`, a shareable link like `http://host/f/{slug_or_id}` is generated and copyable, and opening it in an incognito window (no login) renders the form successfully.
- **Pass Condition**: GET on the public URL returns 200 HTML with the form content; no auth redirect.
- **Evidence**: Forms list showing "Published" badge + incognito window screenshot of the rendered form.

### AC-5: Results Show Summary Stats & Individual Responses
- **Type**: `rule`
- **Given**: A seed form with 3 existing responses including one multiple-choice question with options ["A", "B", "C"].
- **When**: Creator visits the Results tab for that form.
- **Then**: A list of all 3 responses is visible; clicking a response shows all answers; the MC question displays counts for each option (e.g., A: 2, B: 1, C: 0).
- **Pass Condition**: Response count matches; individual response detail matches stored data; MC counts sum to the response count.
- **Evidence**: Screenshot of results table and MC summary bar + corresponding DB rows.

### AC-6: CRUD Operations Persist Correctly
- **Type**: `rule`
- **Given**: Forms list with 1 seed form.
- **When**: Creator creates a new form (F2), renames it to "Survey", duplicates it (F3), then deletes the original form, then restarts the backend server.
- **Then**: After restart, exactly the renamed F2 and duplicated F3 are in the list; deleted form is gone.
- **Pass Condition**: GET `/api/forms` returns exactly the expected forms with correct titles; response count 0 for duplicates (new).
- **Evidence**: List UI after restart + `/api/forms` JSON.

### AC-7: Visual Fidelity to Typeform
- **Type**: `rubric`
- **Dimension**: How closely the built application resembles the real Typeform in terms of colors, typography, spacing, component shape, and overall aesthetic.
- **Scale**: 1-5
- **Anchors**:
  - 1 = Generic bootstrap-style form tool, no resemblance.
  - 3 = Clean modern UI but clearly not Typeform; different color palette / component shapes.
  - 5 = At-a-glance indistinguishable from Typeform: signature brand purple, Inter-style sans, pill buttons, rounded inputs, signature one-question-per-screen layout with the OK/Next footer, builder layout with left question-type sidebar.
- **Pass Threshold**: >= 4
- **Evidence**: Side-by-side screenshots of real Typeform (ref images from typeform.com) vs. clone for (a) forms list, (b) builder, (c) respondent flow Q1, (d) results view.

### AC-8: Respondent Flow Animation & UX Quality
- **Type**: `rubric`
- **Dimension**: Smoothness, polish, and correctness of the one-question-at-a-time experience.
- **Scale**: 1-5
- **Anchors**:
  - 1 = Questions swap instantly with no transition; Enter key does not advance.
  - 3 = Basic fade between questions, Enter works, progress bar exists but no animation.
  - 5 = Silky slide + fade transitions, staggered element reveals, progress bar animates smoothly, Enter/arrow keys feel responsive, question number and OK button animate into place.
- **Pass Threshold**: >= 4
- **Evidence**: Short screen recording of answering 3 questions showing transitions and keyboard behavior.

### AC-9: Code Quality & Architecture
- **Type**: `rubric`
- **Dimension**: Cleanliness, modularity, and separation of concerns in code.
- **Scale**: 1-5
- **Anchors**:
  - 1 = All logic in single files, no types, no clear separation.
  - 3 = OK separation but some large files; types present but any-escape-hatches common.
  - 5 = Clear components/pages/hooks/lib structure in frontend; separate routers/schemas/models/db modules in backend; minimal duplication; strict types; consistent naming; no leftover debug.
- **Pass Threshold**: >= 4
- **Evidence**: Directory tree listing + sample 3 files (frontend component, backend router, SQLAlchemy model) reviewed by reader.

### AC-10: Database Schema Design Quality
- **Type**: `rubric`
- **Dimension**: Correct relational modeling and completeness.
- **Scale**: 1-5
- **Anchors**:
  - 1 = Single JSON blob per form / per response, no typed tables.
  - 3 = Forms/questions/responses tables exist but weak FKs or answers stored as opaque JSON with no per-question stats rows.
  - 5 = Well-normalized: Forms, Questions (with FK, order, type, options JSON, required, description), Responses (FK to form, timestamp), Answers (FK to response + question + value fields). Proper FK indexes, cascading deletes, unique indexes on slug. Seed data loads cleanly.
- **Pass Threshold**: >= 4
- **Evidence**: Schema SQL (output of `.schema` in `sqlite3`) + ERD description in README.

### AC-11: README & Documentation
- **Type**: `rule`
- **Given**: A fresh clone of the repository.
- **When**: Reader follows README instructions exactly.
- **Then**: They can install deps, seed DB, run backend + frontend, and use the app within ~10 minutes. Tech stack, architecture, schema, and API list are clearly described.
- **Pass Condition**: README contains all listed sections; no missing command; another engineer could reproduce running the app.
- **Evidence**: Reader verification that README sections exist and commands run.

## Open Questions
- [ ] None remaining at spec time — assumptions above are accepted; implementer will proceed with FastAPI, Next.js App Router, Tailwind, Framer Motion, @dnd-kit.
