from typing import Optional, Dict, Any, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Form, Question, Response, Answer
from app.schemas import ResponseSubmission, AnswerSubmission
from app.utils.validation import (
    validate_email_format,
    validate_number,
    validate_option_value,
)


def get_public_form_by_slug(db: Session, slug: str) -> Optional[Form]:
    return (
        db.query(Form)
        .filter(Form.slug == slug, Form.status == "published")
        .first()
    )


def _get_question_value(answer: AnswerSubmission) -> Any:
    if answer.value_text is not None:
        return answer.value_text
    if answer.value_number is not None:
        return answer.value_number
    if answer.value_boolean is not None:
        return answer.value_boolean
    if answer.value_json is not None:
        return answer.value_json
    return None


def _question_has_value(answer: AnswerSubmission) -> bool:
    value = _get_question_value(answer)
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, dict)):
        return bool(value)
    return True


def create_response(
    db: Session,
    form_slug: str,
    submission: ResponseSubmission,
) -> int:
    errors: Dict[str, str] = {}

    form = get_public_form_by_slug(db, form_slug)
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found or not published",
        )

    form_question_ids = {q.id for q in form.questions}
    question_map = {q.id: q for q in form.questions}
    answer_map = {a.question_id: a for a in submission.answers}

    # A response contains one value per question. Catch duplicates before the
    # database's unique constraint does, so callers receive a useful 422.
    seen_question_ids = set()
    for answer in submission.answers:
        if answer.question_id in seen_question_ids:
            errors[f"question_{answer.question_id}"] = "Answer supplied more than once"
        seen_question_ids.add(answer.question_id)

    for answer in submission.answers:
        if answer.question_id not in form_question_ids:
            errors[f"question_{answer.question_id}"] = (
                f"Question {answer.question_id} does not belong to this form"
            )

    for question in form.questions:
        answer = answer_map.get(question.id)
        has_value = answer is not None and _question_has_value(answer)

        if question.required and not has_value:
            errors[f"question_{question.id}"] = "This field is required"
            continue

        if not has_value:
            continue

        value = _get_question_value(answer)

        if question.type == "email":
            if not validate_email_format(value):
                errors[f"question_{question.id}"] = "Invalid email format"

        elif question.type == "number":
            if not validate_number(value):
                errors[f"question_{question.id}"] = "Must be a valid number"
            else:
                opts = question.options_json or {}
                min_val = opts.get("min")
                max_val = opts.get("max")
                if min_val is not None and value < min_val:
                    errors[f"question_{question.id}"] = f"Value must be >= {min_val}"
                if max_val is not None and value > max_val:
                    errors[f"question_{question.id}"] = f"Value must be <= {max_val}"

        elif question.type == "rating":
            if not validate_number(value):
                errors[f"question_{question.id}"] = "Must be a valid number"
            else:
                opts = question.options_json or {"min": 1, "max": 5}
                min_val = opts.get("min", 1)
                max_val = opts.get("max", 5)
                if value < min_val or value > max_val:
                    errors[f"question_{question.id}"] = (
                        f"Rating must be between {min_val} and {max_val}"
                    )

        elif question.type in ("multiple_choice", "dropdown"):
            if not validate_option_value(question.options_json, value):
                errors[f"question_{question.id}"] = "Invalid option selected"

        elif question.type == "yes_no":
            if not isinstance(value, bool):
                errors[f"question_{question.id}"] = "Must be a boolean (true/false)"

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"detail": "Validation failed", "errors": errors},
        )

    db_response = Response(
        form_id=form.id,
        respondent_meta_json=submission.meta,
    )
    db.add(db_response)
    db.flush()

    for answer in submission.answers:
        if not _question_has_value(answer):
            continue
        db_answer = Answer(
            response_id=db_response.id,
            question_id=answer.question_id,
            value_text=answer.value_text,
            value_number=answer.value_number,
            value_boolean=answer.value_boolean,
            value_json=answer.value_json,
        )
        db.add(db_answer)

    db.commit()
    db.refresh(db_response)
    return db_response.id
