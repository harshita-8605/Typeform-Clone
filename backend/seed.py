#!/usr/bin/env python3
"""Seed the Typeform clone SQLite database with sample forms + responses.

Uses the SERVICE LAYER directly (no HTTP calls) so it works offline and is not
fragile to server availability.

Usage:
    python seed.py            # seed (safe to re-run; appends by default)
    python seed.py --reset    # wipe the DB before seeding
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Any

# Ensure the backend package is importable when running as `python seed.py`
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.database import SessionLocal, Base, engine  # noqa: E402
from app import models  # noqa: E402  (ensure models are registered on Base)
from app.services import form_service, response_service  # noqa: E402
from app.schemas import (  # noqa: E402
    QuestionType,
    ResponseSubmission,
    AnswerSubmission,
)


# ---------------------------------------------------------------------------
# Question helpers — structured options_json matching the schema (ids + labels)
# ---------------------------------------------------------------------------

def _question(
    qtype: QuestionType,
    title: str,
    *,
    required: bool = False,
    description: str | None = None,
    options: list[dict[str, str]] | None = None,
    min: int | None = None,
    max: int | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": qtype,
        "title": title,
        "description": description,
        "required": required,
        "options_json": None,
    }
    if qtype in ("multiple_choice", "dropdown"):
        assert options is not None, f"{qtype} needs options"
        payload["options_json"] = {"options": options}
    elif qtype == "rating":
        payload["options_json"] = {"min": min or 1, "max": max or 5}
    elif qtype == "number":
        payload["options_json"] = {"min": min, "max": max}
    return payload


def _opt(label: str, i: int) -> dict[str, str]:
    return {"id": f"opt_{i}_{label.lower().replace(' ', '_')[:8]}", "label": label}


# ---------------------------------------------------------------------------
# Seed forms
# ---------------------------------------------------------------------------

FORM_1_QUESTIONS = [
    _question("short_text", "What's your first name?", required=True),
    _question("email", "What email should we use to contact you?", required=True),
    _question(
        "rating",
        "Overall, how would you rate your experience with us?",
        required=True,
        min=1,
        max=5,
    ),
    _question(
        "multiple_choice",
        "How did you first hear about our product?",
        required=True,
        options=[_opt("Search engine", 1), _opt("Social media", 2),
                 _opt("Friend or colleague", 3), _opt("Blog or review", 4),
                 _opt("Other", 5)],
    ),
    _question(
        "dropdown",
        "Which country are you based in?",
        options=[_opt("United States", 1), _opt("United Kingdom", 2),
                 _opt("India", 3), _opt("Germany", 4), _opt("Canada", 5),
                 _opt("Australia", 6), _opt("Other", 7)],
    ),
    _question("yes_no", "Would you recommend us to a friend?", required=True),
    _question(
        "long_text",
        "Is there anything else you'd like us to know about your experience?",
    ),
    _question("number", "How many months have you been using our product?",
              min=0, max=120),
]

FORM_2_QUESTIONS = [
    _question("short_text", "Your name / GitHub handle", required=True),
    _question("email", "Contact email", required=True),
    _question(
        "dropdown",
        "What is your primary programming language?",
        required=True,
        options=[_opt("Python", 1), _opt("TypeScript / JavaScript", 2),
                 _opt("Go", 3), _opt("Rust", 4), _opt("Java", 5),
                 _opt("Ruby", 6), _opt("Other", 7)],
    ),
    _question(
        "multiple_choice",
        "Which frameworks do you use on the job? (pick the closest)",
        required=True,
        options=[_opt("Django / FastAPI", 1), _opt("Next.js / React", 2),
                 _opt("Spring Boot", 3), _opt("Rails", 4), _opt("Actix / Axum", 5),
                 _opt("None of the above", 6)],
    ),
    _question("number", "Years of professional experience",
              required=True, min=0, max=50),
    _question("rating", "How much do you enjoy writing code?",
              required=True, min=1, max=10),
    _question("yes_no", "Have you contributed to open source this year?"),
    _question("long_text", "What are you working on right now that excites you?"),
]


FORM_DEFINITIONS = [
    {
        "title": "Customer Feedback Survey",
        "status": "published",
        "thank_you_text": "Thank you! Your feedback helps us improve every day 🙌",
        "questions": FORM_1_QUESTIONS,
    },
    {
        "title": "Developer Survey 2026",
        "status": "published",
        "thank_you_text": "Thanks for sharing — happy hacking! 👩‍💻",
        "questions": FORM_2_QUESTIONS,
    },
]


# ---------------------------------------------------------------------------
# Seed responses — AnswerSubmission-compatible dicts
# ---------------------------------------------------------------------------

def _as(value: Any, *, qindex: int, text: bool = False, num: bool = False,
        boolean: bool = False):
    """Helper to build an AnswerSubmission kwargs. qindex refers to position
    in the form's question list — we'll resolve the real question_id at
    insert time."""
    ans: dict[str, Any] = {"_qindex": qindex}
    if text:
        ans["value_text"] = value
    elif num:
        ans["value_number"] = float(value)
    elif boolean:
        ans["value_boolean"] = bool(value)
    else:
        # Default: put strings in value_text
        ans["value_text"] = value
    return ans


# Form 1 (Customer Feedback) 3 responses
FORM_1_RESPONSES = [
    [
        _as("Priya", qindex=0, text=True),
        _as("priya@example.com", qindex=1, text=True),
        _as(5, qindex=2, num=True),
        _as("Friend or colleague", qindex=3, text=True),  # by label
        _as("India", qindex=4, text=True),                # by label
        _as(True, qindex=5, boolean=True),
        _as("Loved the onboarding chat experience!", qindex=6, text=True),
        _as(8, qindex=7, num=True),
    ],
    [
        _as("Marcus", qindex=0, text=True),
        _as("marcus.jones@example.co.uk", qindex=1, text=True),
        _as(4, qindex=2, num=True),
        _as("Search engine", qindex=3, text=True),
        _as("United Kingdom", qindex=4, text=True),
        _as(True, qindex=5, boolean=True),
        _as("", qindex=6, text=True),  # long_text not required → empty ok
        _as(18, qindex=7, num=True),
    ],
    [
        _as("Yuki", qindex=0, text=True),
        _as("yuki.t@example.jp", qindex=1, text=True),
        _as(3, qindex=2, num=True),
        _as("Social media", qindex=3, text=True),
        _as("Other", qindex=4, text=True),
        _as(False, qindex=5, boolean=True),
        _as("Wish the dashboard had a dark mode.", qindex=6, text=True),
        _as(3, qindex=7, num=True),
    ],
]

# Form 2 (Developer Survey) 2 responses
FORM_2_RESPONSES = [
    [
        _as("harshita-dev", qindex=0, text=True),
        _as("harshita@example.dev", qindex=1, text=True),
        _as("Python", qindex=2, text=True),
        _as("Next.js / React", qindex=3, text=True),
        _as(4, qindex=4, num=True),
        _as(9, qindex=5, num=True),
        _as(True, qindex=6, boolean=True),
        _as("Building a full-stack Typeform clone for an assignment.", qindex=7, text=True),
    ],
    [
        _as("rob.codes", qindex=0, text=True),
        _as("rob@example.io", qindex=1, text=True),
        _as("Rust", qindex=2, text=True),
        _as("Actix / Axum", qindex=3, text=True),
        _as(6, qindex=4, num=True),
        _as(8, qindex=5, num=True),
        _as(False, qindex=6, boolean=True),
        _as(
            "Embedded Rust for a low-power IoT sensor network; it's really "
            "pushing me to learn more about no_std.",
            qindex=7, text=True,
        ),
    ],
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def _resolve_answer_ids(questions: list[models.Question], raw: list[dict]) -> list[AnswerSubmission]:
    """Map the qindex-based helper answers to real question_ids."""
    submissions: list[AnswerSubmission] = []
    for a in raw:
        qindex = a.pop("_qindex")
        q = questions[qindex]
        submissions.append(AnswerSubmission(question_id=q.id, **a))
    return submissions


def reset_database() -> None:
    """Drop all tables then recreate them. Only runs with --reset."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✓ Database reset (all tables dropped and recreated)")


def seed() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true",
                        help="Wipe the database before seeding")
    args = parser.parse_args()

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    if args.reset:
        reset_database()

    db = SessionLocal()
    try:
        created_forms: list[models.Form] = []
        for fd in FORM_DEFINITIONS:
            form_create = {
                "title": fd["title"],
                "status": fd["status"],
                "thank_you_text": fd["thank_you_text"],
            }
            form = form_service.create_form(db, form_create)

            # Build the question list then use the upsert endpoint so order
            # and IDs are handled consistently.
            q_payloads = []
            for idx, q in enumerate(fd["questions"]):
                q_payloads.append({
                    "id": None,  # create new
                    "form_id": form.id,
                    "order_index": idx,
                    **q,
                })
            questions = form_service.upsert_form_questions(db, form.id, q_payloads)

            # Publish if requested — generates a unique shareable slug
            if fd["status"] == "published":
                form = form_service.publish_form(db, form.id)
            else:
                # refresh to get updated questions relationship
                db.refresh(form)

            created_forms.append(form)
            print(f"✓ Created form #{form.id}: {form.title}  (slug={form.slug}, "
                  f"{len(form.questions)} questions)")

        # Now responses, using response_service.create_response directly with
        # Pydantic ResponseSubmission.
        all_responses = [FORM_1_RESPONSES, FORM_2_RESPONSES]
        for form, responses in zip(created_forms, all_responses):
            assert form.slug is not None
            for idx, raw in enumerate(responses, 1):
                answers = _resolve_answer_ids(form.questions, raw)
                submission = ResponseSubmission(
                    answers=answers,
                    meta={"seeded": True, "seed_index": idx},
                )
                resp_id = response_service.create_response(db, form.slug, submission)
                print(f"    → Response #{resp_id} submitted for {form.title}")

        db.commit()
        print("\n🎉 Seed complete.")
        print(f"   Forms in DB:    {len(created_forms)}")
        for f in created_forms:
            print(f"     - #{f.id} {f.title} → /f/{f.slug}")
        print(f"   Data file:      {engine.url.database}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
