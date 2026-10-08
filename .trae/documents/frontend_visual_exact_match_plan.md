# Exact Typeform Frontend Visual Match — Implementation Plan (v2, Approved Recommendations Applied)
**AC-7 Visual Fidelity Rubric: Target ≥ 4/5 ("At-a-glance indistinguishable")**
**Reference ground truth:** `/Users/harshita/Projects/Typeform-clone/Typeform frontend pics.pdf` + live `typeform.com` (reference only — no runtime dependencies on external domains)
**Scope:** Frontend-only (no backend changes). Preserves all existing functionality (drag-drop, form CRUD, submit flow, validation, routing). Must keep `npm run build` passing at every step.
**Weighting (recommended by you):** Respondent 35% · Builder 30% · Workspace 20% · Results 10% · Global Shell 5%

---

## 0. Repository Research (Completed + Augmented by Your Recommendations)
### 0.1 PDF Scope Boundary (Recommendation #5 Applied)
**EXPLICITLY OUT OF SCOPE for this SDE assignment:**
- Typeform marketing landing page (typeform.com homepage)
- Solutions / Resources marketing dropdowns and mega-menus
- Marketing hero animations, sign-up carousel, marketing videos
- Login / Signup marketing flows (we only have the authenticated admin app shell)
Pages 1–10 of the PDF that show these are used purely as visual-constant reference (colors, fonts, radii, logo shape).

**IN SCOPE (assignment-core):**
1. Respondent `/f/[slug]` — one-at-a-time fill experience
2. Logged-in App Shell (top nav + sidebar) applied across workspace / builder / results
3. Workspace forms grid + Create Form flow
4. Builder (3-pane, left-nav/center-canvas/right-settings-or-preview)
5. Results (summary / responses / individual response)
6. Global UI primitives (buttons, inputs, toasts, modals)

### 0.2 Design Token Gap (v2 — Recommendation #8: Visual Constants File)
Real Typeform constants that will be centralized in `src/styles/typeform.ts` (exported JS constants) AND in `:root` CSS variables (for Tailwind):

```
Colors (--tf-* CSS vars):
  --tf-purple:        96 31 238   (#601FEE brand primary)
  --tf-purple-light: 167 139 250  (#A78BFA secondary)
  --tf-purple-dark:   67 18 172   (hover)
  --tf-purple-subtle:241 235 255  (focus-line bg / pill outline)
  --tf-bg:           250 249 252  (warm off-white surface)
  --tf-canvas:       255 255 255  (pure white cards / modals)
  --tf-text:          29 29 31   (near-black primary)
  --tf-muted:        119 119 119  (secondary copy)
  --tf-error:        220 38 38
  --tf-success:      22 163 74

Radii:
  --tf-radius-card: 24px    (stats / cards / modals)
  --tf-radius-input: 16px   (boxed inputs in builder)
  --tf-radius-pill: 9999px  (buttons / MC choices / badges)

Shadows:
  --tf-shadow-card:   0 1px 2px rgba(0,0,0,0.04)      (resting)
  --tf-shadow-hover:  0 6px 20px rgba(0,0,0,0.06)     (hover)
  --tf-shadow-modal:  0 20px 60px rgba(0,0,0,0.12)    (elevated)
  --tf-shadow-focus:  0 0 0 3px rgb(96 31 238 / 0.12) (focus ring)

Typography:
  --font-sans:  TWKLausanne (350 light / 400 regular / 500 medium / 600 semibold)
  --font-serif: Tobias Regular (display headline for respondent Q titles)
  Body:   16px/1.55  TWK-400
  Label:  14px/1.4   TWK-500
  Muted:  13px/1.45  TWK-400  --tf-muted
```

### 0.3 Font Assets (Recommendation #6: Local Only, No CDN Runtime Dep)
5 real Typeform font files exist in the scraped CDN folder. All will be copied locally into `frontend/public/fonts/`. Project will NOT fetch from typeform CDN at runtime — 100% self-contained. Fallback if a font file fails: Inter + Georgia.

```
src (scraped local):  cdn.prod.website-files.com/66ffe2174aa8e8d5661c2708/
dest (new):           frontend/public/fonts/
  67f7e38acef4cde59aad2dbe_Tobias-Regular.woff2       → Tobias-Regular.woff2
  67f8d804c21dd81402c67d2f_TWKLausanne-350.woff2      → TWKLausanne-350.woff2
  683ffc9a2aa1aa6187af000c_TWKLausanne-400.woff       → TWKLausanne-400.woff
  68307cdc375ef1f7780a28f7_TWKLausanne-500.woff2      → TWKLausanne-500.woff2
  683ffdc79f974545ccaa6367_TWKLausanne-600.woff       → TWKLausanne-600.woff
```

### 0.4 Recommendation #1 Added: Global Typeform App Shell (NEW SECTION)
Persistent shell applied to ALL authenticated admin pages (workspace, builder, results):
```
AppShell (h-screen w-screen flex-col bg-[--tf-bg])
├── TopNav (h-16 shrink-0 border-b border-gray-100 bg-canvas backdrop-blur)
│   ├── Typeform logo (circular purple bg + white T) + wordmark
│   ├── Workspace switcher / breadcrumb: "My Workspace"
│   ├── Spacer
│   ├── Help icon button (?)
│   ├── Notifications icon button (bell)
│   └── Profile avatar (32px circular, initials "H" placeholder — no real auth)
│
├── Flex row (flex-1 min-h-0)
│   ├── Sidebar (w-60 shrink-0 border-r border-gray-100 bg-canvas py-4 px-3 flex-col gap-1)
│   │   ├── NavItem "Home"          → /workspace (icon + label, active=bg-[--tf-purple-subtle] + text-brand font-medium)
│   │   ├── NavItem "Forms"         → /workspace (primary forms entry; bold when on workspace)
│   │   ├── NavItem "Contacts"      → (disabled placeholder, opacity-50, "Coming Soon" tooltip)
│   │   ├── NavItem "Integrations"  → (disabled placeholder)
│   │   ├── NavItem "Results"       → (disabled placeholder — go via form card menu)
│   │   └── Bottom: small "Upgrade" badge (outline pill purple, "Pro — Coming Soon")
│   │
│   └── MainContent (flex-1 min-w-0 overflow-auto p-0 OR p-8 per page)
```
Without this shell on every admin page, the clone looks generic even if individual cards look perfect.

### 0.5 Recommendation #2 Added: Create Form Flow (NEW SECTION)
Currently missing — only a button exists. New:
```
Click "Create form" (top-right purple pill in workspace / builder toolbar / sidebar "Forms" header + icon)
  └─→ opens Modal (24px radius, shadow-modal, backdrop-blur-sm, width w-[560px])
       ├── Title: "Create a form"  (20px font-semibold TWK-600 --tf-text)
       ├── Subtitle: "Start fresh or use a template."  (14px --tf-muted)
       ├── 4 option cards (grid cols-2 gap-4, each card hover:shadow-hover hover:-translate-y-0.5 transition):
       │   ├── Card 1 — "Start from scratch"
       │   │     Top: large square rounded icon (linear gradient purple)
       │   │     Title: 16px TWK-600
       │   │     Body:  13px --tf-muted ("Build any form from the ground up.")
       │   │     → PRIMARY ACTION (clickable → closes modal → opens new /builder/{id} immediately)
       │   │
       │   ├── Card 2 — "Import questions"
       │   │     Title, body, icon (file/import style)
       │   │     Click → "Coming Soon" toast ("Import questions will be available in a future update.")
       │   │
       │   ├── Card 3 — "Create with AI"
       │   │     Title, body, sparkle/AI icon, subtle "Beta" pill top-right of card
       │   │     Click → "Coming Soon" toast
       │   │
       │   └── Card 4 — "Welcome screen"
       │         Title, body, hand/wave icon
       │         Click → "Coming Soon" toast
       │
       └── Bottom: Close × top-right; esc/backdrop-click closes
```
Welcome screen inside a newly created form (inside builder canvas): If user selected "Welcome screen", also insert a new first welcome-block placeholder (empty-state illustration + inline text edit "Welcome people to your form").

### 0.6 Recommendation #3 Applied: Builder Expanded to Steps 6.1–6.17
No longer just "left sidebar + center + right". Detailed breakdown in Step 6 below.

### 0.7 Recommendation #9 Applied: Responsive Breakpoints
Every major screen tested at these 5 viewport sizes before proceeding:
```
1440×900 (laptop large)
1280×800 (laptop)
1024×768 (tablet landscape)
 768×1024 (tablet portrait)
 390× 844 (mobile — respondent critical)
```
Responsive rules:
- **Respondent:** Desktop = answer left + OK→ right in same footer row; Mobile = answer fullwidth, OK→ right on own row below.
- **Builder:** Desktop 3-pane `grid-cols-[240px,1fr,360px]`; Tablet `grid-cols-[64px,1fr]` (hide right panel, collapse sidebar to icons); Mobile `grid-cols-1` (only canvas, left/right toggle via floating buttons).
- **Workspace:** Desktop 3-col cards, Tablet 2-col, Mobile 1-col.

### 0.8 Recommendation #7 Applied: Screenshot-Driven Dev Loop (Per-Major-Screen)
After every refactor step, run this loop:
```
reference PDF screenshot (mental / user-provided)
        ↓
implement className / layout changes
        ↓
npm run build (must pass 0)
        ↓
open page in browser at 1440×900
        ↓
Take screenshot
        ↓
Compare side-by-side
        ↓
Iterate: spacing → typography → sizing → alignment
        ↓
Repeat until looks "same at 1ft glance"
        ↓
Proceed
```
Mid-review checkpoints after: Step 3 (respondent), Step 4 (workspace + create form), Step 6 (builder). Results low-priority — no separate checkpoint unless issues.

---

## 1. Files and Modules to Change (Dependency Order, v2)
### 1.1 Foundation (Steps 0-1)
| File | Change |
|---|---|
| `frontend/public/fonts/*` (5 files NEW) | Copy local scraped font files (Recommendation #6: no runtime CDN) |
| `frontend/src/styles/typeform.ts` (NEW) | Visual constants module — exports colors/radii/shadows/typography as TS objects (Recommendation #8) |
| `frontend/src/styles/globals.css` | Rewrite `:root` to use `--tf-*` CSS vars (all design tokens in one place); rewrite `.btn-primary` `.input-base` `.input-underline`; add `.card-shadow` `.card-hover` utilities |
| `frontend/tailwind.config.js` | `theme.extend` → fontFamily (sans TWK, serif Tobias), colors (tf-purple/tf-bg/tf-muted), borderRadius (card=24px, pill=9999px), boxShadow (card/hover/modal/focus); add plugin: `addUtilities({ '.focus-line-left': … })` 3px brand left solid, 1px transparent border |
| `frontend/src/app/layout.tsx` | Swap Google Inter → `next/font/local` for all 5 fonts; set `--font-sans`/`--font-serif` CSS vars; add `.font-sans` to `<body>`; import globals.css |
| `frontend/src/components/ui/Button.tsx` | Button variants: `primary` = h-12 px-7 rounded-[--tf-radius-pill] font-[TWK-500] bg-[--tf-purple] text-white hover:bg-[--tf-purple-dark]; `outline` = border-gray-200 hover:border-[--tf-purple] bg-white; `ghost` = hover:bg-gray-50 text-[--tf-text] |
| `frontend/src/components/ui/Modal.tsx` | 24px radius, shadow-modal, backdrop-blur-sm, overflow-hidden, 1px border-none; Close × top-right 16px padding; esc/backdrop closes |
| `frontend/src/components/ui/DropdownMenu.tsx` | Menu: 12px radius, shadow-card, zero border, bg-white py-1; items: px-3 py-2.5 hover:bg-gray-50 |
| `frontend/src/hooks/useToast.tsx` | Toast rewrite: 3px left solid purple bar, bg-[#FAF9FC], 8px radius, 13px TWK-400 copy, no icon bg circle, slide-in top-right |

### 1.2 Global App Shell (Step 2 — Recommendation #1)
| File | Change |
|---|---|
| `frontend/src/components/layout/AppShell.tsx` (NEW) | 3-part shell (TopNav + Sidebar + MainContent slot); exported as layout wrapper; handles responsive sidebar collapse on tablet/mobile |
| `frontend/src/app/workspace/page.tsx` | Wrap entire workspace page content in `<AppShell>`; move page-specific header inside `MainContent` |
| `frontend/src/app/builder/[formId]/page.tsx` | Wrap entire builder in `<AppShell>`; builder's left sidebar panel will be *inside* MainContent replacing the AppShell sidebar? NO — AppShell sidebar is global nav (Forms/Contacts/Integrations); builder's internal left panel is question-type palette → NESTED inside MainContent |
| `frontend/src/app/results/[formId]/page.tsx` | Wrap in `<AppShell>` |
| `frontend/src/app/results/[formId]/[responseId]/page.tsx` | Wrap in `<AppShell>` |
| Respondent `f/[slug]/page.tsx` | NO AppShell — respondent is public standalone page |
| `frontend/src/components/layout/TopNav.tsx` (NEW from AppShell split) | Logo SVG, breadcrumb, help/notif/profile icon buttons |
| `frontend/src/components/layout/Sidebar.tsx` (NEW) | 5 NavItem rows + Upgrade badge bottom |

### 1.3 Respondent Page (Step 3 — 35% Weight, Highest Priority)
| File | Change |
|---|---|
| `frontend/src/app/f/[slug]/page.tsx` | Full layout rewrite — max-w-2xl centered mx-auto px-6 py-16 md:py-24; Tobias serif `text-4xl md:text-5xl font-serif leading-[1.1]` question title; left-offset number block "01" 48px TWK-600 purple-text with 13px "Question" muted beneath; progress bar 3px fixed top-0 inset-x-0; footer flex flex-wrap gap-4 items-end justify-between (desktop left answer, right OK→; mobile stacked OK→ still right); back button = subtle 14px TWK-400 muted "← Back" link (not pill) |
| `frontend/src/components/questions/QuestionRenderer.tsx` | Add `variant: 'respondent' | 'builder'` prop; respondent = no card wrapper, underline-only theme; builder = bordered-card theme |
| `frontend/src/components/questions/ShortTextInput.tsx` | Respondent variant: `border-b-2 border-gray-200 focus:border-[--tf-purple]`; text-2xl TWK-400; placeholder --tf-muted; 0 left/right/top/bottom border except bottom; no rounded corners; 8px py; 20px min-h |
| `frontend/src/components/questions/LongTextInput.tsx` | Respondent: same underline-only; min-h-[88px]; auto-resize |
| `frontend/src/components/questions/EmailInput.tsx` | Same underline |
| `frontend/src/components/questions/NumberInput.tsx` | Same underline |
| `frontend/src/components/questions/MultipleChoiceInput.tsx` | Respondent: column of 64px-tall pill choices, rounded-[9999px], 1px border-gray-200, hover:bg-[--tf-purple] hover:text-white hover:border-[--tf-purple], transition-all, px-8 text-lg TWK-500; active state = bg-[--tf-purple] text-white; radio dot indicator inside right (hidden by default, shows as small white check when selected) |
| `frontend/src/components/questions/DropdownInput.tsx` | Respondent: 56px tall pill trigger with chevron-down; 1px border-gray-200 focus:border-[--tf-purple] |
| `frontend/src/components/questions/YesNoInput.tsx` | Respondent: 80px-tall large pills (2 per row, fullwidth, gap-3); "Yes" / "No" 22px TWK-500 labels; selected = brand fill white text; unselected = 1px border-gray-200 |
| `frontend/src/components/questions/RatingInput.tsx` | Respondent: 56px diameter circular buttons for 1–5 / 1–10 rating; active fill = purple white text; rest = border-gray-200 hover:border-purple; star = 36px icon spacing |
| Thank-you screen | Animated circle + checkmark SVG; Tobias "Thank you!" 48px; 13px muted "Your response has been recorded."; share buttons = ghost pill |

### 1.4 Workspace + Create Form (Step 4-5 — 20%)
| File | Change |
|---|---|
| `frontend/src/app/workspace/page.tsx` (inside AppShell.MainContent) | Page header: h1 "My Workspace" 28px TWK-600 left; right: "Create form" primary purple pill (plus 16px icon + 15px label "Create form"); search bar (16px rounded, 1px border-gray-200, w-72 placeholder "Search forms") optional but recommended |
| `frontend/src/components/workspace/FormsList.tsx` | Card rewrite (each card): 0 border, 24px radius, shadow-card, hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200; top gradient banner thumbnail (140px tall, unique linear-gradient per card: purple→indigo / emerald→teal / amber→rose / etc. — deterministic by form.id for consistency); bottom 120px card body: form.title (18px TWK-600 line-clamp-2); meta row 13px muted ("Last edited … ago · 8 questions · 3 responses"); status pill inside thumbnail top-right: Published = 1px solid white/70 text-white rounded-[9999px] px-3 py-1 text-xs TWK-500; draft form: badge "Draft" gray-500 bg-white/80 text-gray-700; card kebab-menu top-right (on thumbnail, bg-white/20 hover:bg-white/40 rounded-full 32px 32px icon button) |
| `frontend/src/components/modals/CreateFormModal.tsx` (NEW — Recommendation #2) | Full 4-option modal described in §0.5; "Start from scratch" actually calls the existing create-form handler + router.push to builder; other 3 options open toast "Coming Soon" |

### 1.5 Builder (Step 6 — 30% Weight, Detailed 6.1–6.17 per Your Recommendation #3)
| File | Change |
|---|---|
| `frontend/src/app/builder/[formId]/page.tsx` (inside AppShell.MainContent = builder-specific 3-pane NESTED grid) | **6.1 App shell wrap:** Main content = grid grid-cols-[240px,1fr,360px] h-full min-h-0 gap-0 bg-[--tf-bg] |
|  | **6.2 Left narrow navigation (builder left NAV, separate from global AppShell sidebar):** 240px shrink-0 bg-canvas border-r border-gray-100 py-4 px-3 flex-col gap-6 — *Section 1: "Build"* (selected by default — icon + large text, bg-[--tf-purple-subtle]); *Section 2: "Connect"* (disabled — coming soon, opacity-50); *Section 3: "Share"* (disabled); *Section 4: "Results"* (nav link to /results/[formId]); *Section 5 small: Help articles* (muted 13px, not interactive) |
|  | **6.3 Question-type palette panel (below left NAV inside same left column):** Header "Add a question" 13px TWK-500 muted px-3 mb-2; scrollable grid 1-col of 8 question-type cards — each card: h-14 px-3 rounded-xl, hover:bg-gray-50, flex items-center gap-3; left: square rounded-lg 36px 36px icon (bg-gray-50 brand icon 18px color); right: title (14px TWK-500) + optional subtitle (12px muted, "Short answer" / "Long answer" etc.). Order: Short text, Long text, Multiple choice, Dropdown, Email, Number, Yes/No, Rating. Click = append new question (existing behavior preserved). |
|  | **6.4 Center canvas:** `bg-[--tf-bg]`; max-w-3xl mx-auto px-8 py-12 overflow-auto; large whitespace; header = inline-editable form title (32px Tobias "Untitled form" placeholder when empty; inline edit on click → contentEditable or input with 0 border) |
|  | **6.5 Question cards on canvas:** Stacked with 40px gap between; each question = relative (for focus line). **6.12 Active state:** Currently-edited card = `border-l-4 border-l-[--tf-purple]` (focus line left, 4px tall the whole card) + pl-6; INACTIVE = `border-l-4 border-l-transparent pl-6`; NO OTHER BORDERS. Each card: question-number prefix "01." (24px TWK-600 brand purple, inline with title input) |
|  | **6.6 Inline title editing + 6.9 Description:** Each card has: title input `text-2xl TWK-500 placeholder-muted` (underline-only when focused, 0 border otherwise); description input below (14px TWK-400 muted italic placeholder "Add a description…"); type label badge top-right of card (e.g. "Short text" — small gray pill 12px rounded). **6.10 Options editor:** For MC/Dropdown/Rating inside card body: list of option inputs with drag handle + delete option; "Add option" ghost button at bottom of list. |
|  | **6.8 Required toggle:** Bottom-right of each question card: row "Required" label (13px muted) + switch (purple on, gray off); delete/trash icon bottom-left of card; duplicate icon too. **6.7 Question settings:** Click 3-dot icon on card → open mini dropdown (rename type, duplicate, move up/down, delete). |
|  | **6.11 Drag/drop:** @dnd-kit preserved as-is. Drag handle = 6-dots icon top-left of each card (only visible on hover, except active-always for accessibility). Dragged item: shadow-modal 24px radius bg-white opacity-95. |
|  | **6.13 Right-side settings/preview panel:** Two-state toggle (sticky top, inside panel header): radio buttons *Settings* (cog icon) / *Preview* (phone icon). **6.14 Mobile/device preview:** Preview state = real iPhone device frame: 375×760, 32px rounded corners, bezel shadow, notch centered 120px top, status bar fake "9:41 · 📶 · 🔋" text. **6.15 Builder toolbar (top of builder, above 3-pane grid):** left = back-arrow + form.title (click to rename inline); middle = autosave indicator ("Saving…" / "Saved ✓" 13px muted, 6.16); right = "Settings drawer toggle" (opens modal placeholder Settings), "Share" button, "Publish" / "Unpublish" primary purple pill. **6.17 Empty-state UI:** If 0 questions on canvas: large centered illustration placeholder + headline "Ask your first question" muted subcopy + 8 question-type pills as shortcut buttons (duplicates palette). |
| `frontend/src/components/QuestionPreviewCard.tsx` | Inside settings/preview right panel OR active card in builder compact variant: no outer border just focus line. |

### 1.6 Results (Step 7 — 10% Low Priority — Recommendation #10)
| File | Change |
|---|---|
| `frontend/src/app/results/[formId]/page.tsx` | Page header: back-arrow to workspace + form.title (24px TWK-600); right: "Export CSV" ghost button (placeholder toast "Coming Soon"); tabs row (Summary / Responses): text-only 15px TWK-500 muted, ACTIVE = 3px solid [--tf-purple] bottom border on 48px-tall tab, no bg change. Stats cards: 24px radius shadow-card zero border; "Avg rating 4.0" headline 28px Tobias. Bar chart: single [--tf-purple] bars (no multi-color), 8px radius on bars, x-axis labels muted 12px. Responses list: scroll list of rows, 1-row per response, 24px radius card on hover highlight, meta: timestamp + "#1" responder id. |
| `frontend/src/app/results/[formId]/[responseId]/page.tsx` | Timeline: prev / next buttons (top nav); each question-answer pair = 24px radius shadow-card card with left focus line brand; title: question order prefix + text; answer: formatted by type; spacing vertical timeline look. |

### 1.7 Final (Step 8 — Cross-Cutting)
| File | Change |
|---|---|
| All pages | Responsive viewport tests at 5 sizes (§0.7); mobile breakpoint tweaks where needed. |
| Respondent page | Framer Motion spring config: stiffness 220 / damping 24 for slide+fade; progress bar spring matches. |
| Builder cards | Subtle hover bg-gray-50 transition. |
| All `GetDiagnostics` checked; full build. | Final `npm run build` exit 0. |
| Full final screenshot set | Respondent, workspace, builder, create-form modal, results — 1440×900 and 390×844. |

---

## 2. Implementation Steps (Ordered 0-8)
### Step 0 — Baseline Audit + Build Check
1. Capture baseline screenshots of current 4 pages at 1440×900.
2. Run `cd frontend && npm run build` — must exit 0. Fix any small pre-existing TS issues.
3. Smoke-test existing functionality on localhost:3000:
   - Workspace list loads 3 forms
   - Builder drag-drop reorders question
   - Respondent `/f/imh4r8kh` fills 8Q and submits → thank-you
   - Results summary loads correct stats

### Step 1 — Design System Foundation (Constants + Fonts + UI Primitives)
1. Copy 5 local font files into `frontend/public/fonts/`.
2. Create `src/styles/typeform.ts` visual constants (TS exports + parallel `:root` CSS vars).
3. Rewrite `globals.css` `:root` (all `--tf-*` vars) + rewrite utility classes.
4. Update `tailwind.config.js` fontFamily/colors/radii/shadows/focus plugin.
5. Rewrite `layout.tsx` to use `next/font/local` for 5 fonts. Expose CSS vars.
6. Refactor `Button.tsx`, `Modal.tsx`, `DropdownMenu.tsx`, `useToast.tsx` visuals.
7. Run build check (must pass).
8. **Screenshot loop #0:** Verify buttons, modals, toast style consistent on workspace page.

### Step 2 — Global App Shell (Recommendation #1)
1. Create `AppShell.tsx`, `TopNav.tsx`, `Sidebar.tsx` components.
2. TopNav logo: correct circular purple bg + white T SVG.
3. Wire AppShell into 3 admin routes: workspace, builder (all forms), results (both pages).
4. Verify responsive collapse of sidebar at tablet/mobile breakpoints.
5. Run build check.
6. **Screenshot loop #1:** App shell on workspace page — compare shell with PDF screenshot of workspace nav.

### Step 3 — Respondent Page (35% Priority · #1 Most Iconic)
1. Refactor `f/[slug]/page.tsx` layout (Tobias headline, 01 offset number, 3px progress, footer, back link).
2. Add `variant='respondent'` to `QuestionRenderer.tsx`.
3. Refactor all 8 question input components for respondent underline/pill variants.
4. Fine-tune Framer Motion spring config (stiffness 220 / damping 24).
5. Test responsive desktop vs mobile.
6. Run build check.
7. **Screenshot loop #2 (MANDATORY USER MID-REVIEW CHECKPOINT):**
   - Take screenshots of respondent Q1 (short text) and Q3 (MC) and Yes/No + Rating screens.
   - Present to user. User confirms against PDF respondent screenshots before we proceed. If user says "still not matching", iterate until matches. NO further steps until sign-off here.

### Step 4 — Workspace Forms Grid Refactor
1. Refactor workspace header (search + Create form pill).
2. Refactor `FormsList.tsx` cards: gradient thumbnail, zero border, shadow-card hover-lift, status badges inside thumbnail, kebab menu.
3. Run build check.
4. **Screenshot loop #3:** Workspace grid. Compare with PDF workspace screenshot. Iterate spacing/alignment.

### Step 5 — Create Form Flow (Recommendation #2)
1. Create `CreateFormModal.tsx` component.
2. Implement 4 option cards (Start from scratch real; other 3 = Coming Soon toast).
3. Wire modal to all "Create form" buttons (workspace header, sidebar header, builder toolbar empty-state shortcut).
4. Run build check.
5. **Screenshot loop #4:** Create Form modal open — check layout, fonts, radii vs PDF screenshot.

### Step 6 — Builder Detail Refactor (30% · Steps 6.1–6.17)
Execute sub-steps 6.1 → 6.17 in order, per §1.5 detailed above. After all 17 implemented:
1. Run build check.
2. **Screenshot loop #5 (MANDATORY USER MID-REVIEW CHECKPOINT):**
   - Screenshot builder: 1440×900 full screen (left nav + palette, center canvas with focus-line active Q1, right panel in Preview mode with device frame).
   - Screenshot builder: right panel = Settings mode, showing question settings of active MC card with options editor + required toggle.
   - Present to user. User confirms builder layout vs PDF builder screenshots. Iterate until sign-off.

### Step 7 — Results Polish (10%)
1. Refactor tabs underline style, stats cards 24px radius shadows.
2. Bar chart bars = brand purple only; summary headline Tobias where applicable.
3. Individual response page = timeline cards with focus line.
4. Run build check.
5. **Screenshot loop #6 (no user checkpoint — low priority):** Self-verify against PDF results screenshot, iterate nits.

### Step 8 — Cross-Cutting Responsive + Final
1. Run responsive viewport battery on 5 sizes (§0.7). Fix breaks.
2. Final full `npm run build` exit 0 confirm.
3. Final diagnostic check: `GetDiagnostics` tool for 0 TS errors.
4. Final screenshot archive (1440×900 + 390×844 of 6 screens: respondent Q1, respondent MC, workspace, create-form modal, builder, results summary).
5. Present all final screenshots to user for AC-7 subjective visual score (≥4/5 target).

---

## 3. Dependencies and Considerations (v2)
### 3.1 No Backend Changes Required
SQLite schema / FastAPI endpoints / seed data — untouched. Public API contract (omits status → relies on HTTP 404) — preserved exactly as fixed in previous session.

### 3.2 Fonts Self-Contained (Recommendation #6 Applied)
All font files served from `frontend/public/fonts/` via `next/font/local`. No network requests to typeform.com CDN at runtime. If a woff2 file fails locally, Inter + Georgia fallbacks activate (handled in CSS font-family fallback stacks).

### 3.3 PDF Reference Partial Access
PDF is 11MB (Read tool max 10MB). Mitigation: 3 mandatory USER MID-REVIEWS after Steps 3, 4+5, 6. User confirms against their own PDF screenshots before proceeding. No guesswork accumulates.

### 3.4 Functional Regression Protection
After every step: Run build + browser smoke tests on core flows (form list, drag-drop, respondent submit). State logic / handlers are untouched (className-only refactors where possible; handler edits only when new modal requires wiring).

### 3.5 No Marketing Clone Work (Recommendation #5 Applied)
Zero hours on: landing page, marketing dropdowns, hero animations, login carousel, marketing videos. Those pages in the PDF are used only for color/font/radius/logo constant reference.

---

## 4. Validation Criteria (v2 — Pass Before Final User Review)
### 4.1 Build + Type Safety
- `cd frontend && npm run build` exits 0 at Steps 0,1,2,3,4,5,6,7,8.
- `GetDiagnostics` returns 0 TypeScript / ESLint errors.

### 4.2 Per-Step Functional Smoke Tests
| Step | Test | Expected |
|---|---|---|
| 0 (baseline) | Workspace → Builder drag-drop → Respondent submit → Results | All work |
| 1 (design) | Buttons render with new purple pill style; modals 24px radius; toast bar left | Visual match globals CSS |
| 2 (shell) | All 4 admin routes render AppShell correctly; builder has nested 3-pane inside main | Nav items highlight correctly |
| 3 (respondent) | Fill 8Q → submit; Enter nav; Arrow back/forward; mobile OK→ stacks | 0 console errors, thank-you shown |
| 4 (workspace) | Cards hover lift; gradient thumbnails distinct per form; badge colors correct | 3 cards ordered |
| 5 (create form) | Modal opens; "Start scratch" → opens new builder; 3 other options → "Coming Soon" toast | New form created in backend (check workspace after) |
| 6 (builder) | Focus line appears; inline title edit works; required toggle saves; 17 features all visible | Save → refresh → state persists |
| 7 (results) | Tabs underline; stats cards shadow; bars purple | Numbers match seed (avg 4.0 / 67% yes etc.) |
| 8 (final) | 5 viewports all navigable, no horizontal scroll | No overflow anywhere |

### 4.3 AC-7 Visual Fidelity Self-Score (Target ≥ 4/5)
5 anchors 1pt each:
1. [ ] Brand purple #601FEE present on CTAs + focus lines + underlines
2. [ ] Font pair: Tobias headlines (respondent Q titles / workspace headings / stats card values) + TWK body everywhere else (NOT just Inter)
3. [ ] Buttons pill-shaped 9999px, 48px tall, px-7, 500 weight; inputs respondent=underline builder=16px boxed
4. [ ] Respondent page: 01 offset number, Tobias headline, 3px top progress, OK→ right chevron pill, underline/pill choices
5. [ ] Admin pages: persistent AppShell (top nav + Forms/Contacts/Integrations sidebar) + builder 3-pane correct nesting + left focus line not full card border

Scoring: 5/5 = all 5 pass + no obvious differences vs PDF at 1ft glance; 4/5 = 4/5 + one minor nit only.

---

## 5. Risks and Mitigations (v2)
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Local .woff/.woff2 font files fail to parse (format corruption) | Low | High | Fallback: `fontFamily: ['Inter', 'system-ui', 'Georgia']` stacks in tailwind — Google Inter already installed in project dependencies. User will be notified if fonts fall back. |
| PDF reference details missed because file unreadable | Medium | Medium | **User mid-review mandatory checkpoints after Steps 3, 4+5, 6** — no blind cumulative refactor |
| AppShell wrapping breaks builder page layout (3-pane nested grid) | Medium | Medium | Build + browser test immediately after Step 6.1; revert and re-nest if flex/grid container height collapses |
| Respondent underline inputs break form validation focus-ring visual | Low | Medium | Keep `box-shadow: var(--tf-shadow-focus)` on focus separate from bottom border |
| Builder focus line (4px left border) shifts alignment 4px — inactive state uses 4px transparent so content never shifts | High (known) | Low | Explicitly coded per §1.5 6.5: both states use `border-l-4` + `pl-6` (same) |
| className purge warnings / Tailwind build fail | Low | Low | `npm run build` after every step; Next.js always scans all src files |
| Mobile builder 64px collapsed sidebar icons have no labels | Low | Medium | Tooltip titles added; low-priority nit because assignment primary use is desktop builder |
| Create Form modal 4 cards layout differs from screenshot | Medium | Low | User post-Step 5 screenshot review — adjust card paddings/radii/gradients until match |

---

## 6. User Sign-off Checklist (Required Mid-Reviews)
✅ Plan v2 approved by user → start Step 0 baseline audit.
⏸ After Step 3 (Respondent refactor): **user must approve screenshots** → proceed → Step 4 workspace.
⏸ After Steps 4+5 (Workspace + Create Form): **user must approve screenshots** → proceed → Step 6 builder.
⏸ After Step 6 (Builder refactor): **user must approve screenshots** → proceed → Step 7 results + final Step 8.
✅ Final screenshots all reviewed and approved by user → plan complete.

---

**Approval Request (v2 Plan):** All 10 recommendations integrated (visual constants file, global app shell, create form flow, builder detailed steps 6.1–6.17, adjusted weights 35/30/20/10/5, screenshot dev loop per screen, local fonts only no CDN, 5 viewport responsive tests, no marketing clone scope, results low-priority treatment, 3 mandatory user mid-reviews).

**Do you approve this v2 plan for execution? [Y / adjust first]**
