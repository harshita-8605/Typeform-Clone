import uuid
import random
import string
from datetime import datetime
from typing import Optional, List, Any, Dict

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Form, Question, Response


def _generate_slug(length: int = 8) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


def _generate_unique_slug(db: Session, length: int = 8) -> str:
    while True:
        slug = _generate_slug(length)
        existing = db.query(Form).filter(Form.slug == slug).first()
        if not existing:
            return slug


def get_form(db: Session, form_id: int, owner_email: Optional[str] = None) -> Optional[Form]:
    query = db.query(Form).filter(Form.id == form_id)
    if owner_email:
        query = query.filter(Form.owner_email == owner_email)
    return query.first()


def list_forms(db: Session, owner_email: Optional[str] = None) -> List[Dict[str, Any]]:
    count_subquery = (
        db.query(
            Response.form_id.label("form_id"),
            func.count(Response.id).label("response_count"),
        )
        .group_by(Response.form_id)
        .subquery()
    )

    query = (
        db.query(
            Form.id,
            Form.title,
            Form.slug,
            Form.status,
            Form.updated_at,
            func.coalesce(count_subquery.c.response_count, 0).label("response_count"),
        )
        .outerjoin(count_subquery, Form.id == count_subquery.c.form_id)
        .order_by(Form.updated_at.desc())
    )
    if owner_email:
        query = query.filter(Form.owner_email == owner_email)

    results = []
    for row in query.all():
        results.append(
            {
                "id": row.id,
                "title": row.title,
                "slug": row.slug,
                "status": row.status,
                "updated_at": row.updated_at,
                "response_count": row.response_count,
            }
        )
    return results


def create_form(db: Session, form_data: Dict[str, Any], owner_email: Optional[str] = None) -> Form:
    db_form = Form(
        title=form_data.get("title", "Untitled form"),
        owner_email=owner_email,
        slug=form_data.get("slug"),
        status=form_data.get("status", "draft"),
        theme_json=form_data.get("theme_json"),
        thank_you_text=form_data.get("thank_you_text", "Thanks for completing this form!"),
    )
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form


def update_form(db: Session, form_id: int, update_data: Dict[str, Any], owner_email: Optional[str] = None) -> Optional[Form]:
    db_form = get_form(db, form_id, owner_email)
    if not db_form:
        return None

    for key, value in update_data.items():
        if value is not None:
            setattr(db_form, key, value)

    db_form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_form)
    return db_form


def duplicate_form(db: Session, form_id: int, owner_email: Optional[str] = None) -> Optional[Form]:
    db_form = get_form(db, form_id, owner_email)
    if not db_form:
        return None

    new_form = Form(
        title=f"{db_form.title} (Copy)",
        owner_email=owner_email,
        slug=None,
        status="draft",
        theme_json=db_form.theme_json,
        thank_you_text=db_form.thank_you_text,
    )
    db.add(new_form)
    db.flush()

    for question in db_form.questions:
        new_question = Question(
            form_id=new_form.id,
            order_index=question.order_index,
            type=question.type,
            title=question.title,
            description=question.description,
            required=question.required,
            options_json=question.options_json,
        )
        db.add(new_question)

    db.commit()
    db.refresh(new_form)
    return new_form


def delete_form(db: Session, form_id: int, owner_email: Optional[str] = None) -> bool:
    db_form = get_form(db, form_id, owner_email)
    if not db_form:
        return False
    db.delete(db_form)
    db.commit()
    return True


def publish_form(db: Session, form_id: int, owner_email: Optional[str] = None) -> Optional[Form]:
    db_form = get_form(db, form_id, owner_email)
    if not db_form:
        return None

    if not db_form.slug:
        db_form.slug = _generate_unique_slug(db)

    db_form.status = "published"
    db_form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_form)
    return db_form


def unpublish_form(db: Session, form_id: int, owner_email: Optional[str] = None) -> Optional[Form]:
    db_form = get_form(db, form_id, owner_email)
    if not db_form:
        return None

    db_form.status = "draft"
    db_form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_form)
    return db_form


def upsert_form_questions(
    db: Session,
    form_id: int,
    questions: List[Dict[str, Any]],
    owner_email: Optional[str] = None,
) -> Optional[List[Question]]:
    db_form = get_form(db, form_id, owner_email)
    if not db_form:
        return None

    incoming_ids = {q["id"] for q in questions if q.get("id") is not None}

    existing_questions = {q.id: q for q in db_form.questions}

    for qid in list(existing_questions.keys()):
        if qid not in incoming_ids:
            db.delete(existing_questions[qid])

    # SQLite checks the unique (form_id, order_index) constraint for every
    # UPDATE.  First move retained rows out of the target range, then assign
    # their final positions below.  Without this two-question swaps can fail
    # before SQLAlchemy has applied the second update.
    for offset, question in enumerate(existing_questions.values(), start=1):
        if question.id in incoming_ids:
            question.order_index = -offset
    db.flush()

    for idx, q_data in enumerate(questions):
        q_id = q_data.get("id")
        q_dict = {
            "order_index": idx,
            "type": q_data.get("type"),
            "title": q_data.get("title", ""),
            "description": q_data.get("description", ""),
            "required": q_data.get("required", False),
            "options_json": q_data.get("options_json"),
        }

        if q_id is not None and q_id in existing_questions:
            q = existing_questions[q_id]
            for k, v in q_dict.items():
                if v is not None:
                    setattr(q, k, v)
        else:
            new_q = Question(form_id=form_id, **q_dict)
            db.add(new_q)

    db.commit()
    db.refresh(db_form)
    return db_form.questions


def reorder_questions(
    db: Session,
    form_id: int,
    ordered_ids: List[int],
) -> Optional[List[Question]]:
    db_form = get_form(db, form_id)
    if not db_form:
        return None

    q_map = {q.id: q for q in db_form.questions}

    # See the matching note in upsert_form_questions: use a temporary range to
    # make swaps safe under SQLite's immediate unique-constraint enforcement.
    for offset, question in enumerate(q_map.values(), start=1):
        question.order_index = -offset
    db.flush()

    for idx, qid in enumerate(ordered_ids):
        if qid in q_map:
            q_map[qid].order_index = idx

    db.commit()
    db.refresh(db_form)
    return db_form.questions


def add_question(
    db: Session,
    form_id: int,
    question_data: Dict[str, Any],
) -> Optional[Question]:
    db_form = get_form(db, form_id)
    if not db_form:
        return None

    next_index = len(db_form.questions)
    db_question = Question(
        form_id=form_id,
        order_index=question_data.get("order_index", next_index),
        type=question_data["type"],
        title=question_data.get("title", ""),
        description=question_data.get("description", ""),
        required=question_data.get("required", False),
        options_json=question_data.get("options_json"),
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question


def update_question(
    db: Session,
    form_id: int,
    question_id: int,
    update_data: Dict[str, Any],
) -> Optional[Question]:
    db_question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.form_id == form_id)
        .first()
    )
    if not db_question:
        return None

    for key, value in update_data.items():
        if value is not None:
            setattr(db_question, key, value)

    db.commit()
    db.refresh(db_question)
    return db_question


def delete_question(
    db: Session,
    form_id: int,
    question_id: int,
) -> bool:
    db_question = (
        db.query(Question)
        .filter(Question.id == question_id, Question.form_id == form_id)
        .first()
    )
    if not db_question:
        return False

    order = db_question.order_index
    db.delete(db_question)
    db.flush()

    remaining = (
        db.query(Question)
        .filter(Question.form_id == form_id, Question.order_index > order)
        .order_by(Question.order_index)
        .all()
    )
    for q in remaining:
        q.order_index -= 1

    db.commit()
    return True
