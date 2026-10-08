from typing import Optional, Dict, Any, List
from collections import Counter

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Form, Question, Response, Answer
from app.schemas import ResponseListItem, ResponseOut, AnswerOut


def get_form_summary(db: Session, form_id: int) -> Optional[Dict[str, Any]]:
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return None

    total_responses = (
        db.query(func.count(Response.id)).filter(Response.form_id == form_id).scalar()
    )

    per_question_stats: Dict[int, Dict[str, Any]] = {}

    for question in form.questions:
        qid = question.id
        answers = (
            db.query(Answer).filter(Answer.question_id == qid).all()
        )

        stats: Dict[str, Any] = {"question_id": qid, "type": question.type, "answered_count": len(answers)}

        if question.type in ("multiple_choice", "dropdown"):
            opts = question.options_json or {"options": []}
            opt_list = opts.get("options", [])
            option_ids = [o.get("id") for o in opt_list]
            option_labels = {o.get("id"): o.get("label") for o in opt_list}

            counter: Counter = Counter()
            for a in answers:
                val = a.value_text
                if val is None:
                    continue
                matched_id = None
                if val in option_ids:
                    matched_id = val
                else:
                    for oid, olabel in option_labels.items():
                        if olabel == val:
                            matched_id = oid
                            break
                if matched_id:
                    counter[matched_id] += 1

            distribution = []
            for o in opt_list:
                oid = o.get("id")
                count = counter.get(oid, 0)
                pct = round(count / len(answers) * 100, 1) if answers else 0
                distribution.append(
                    {
                        "id": oid,
                        "label": o.get("label"),
                        "count": count,
                        "percentage": pct,
                    }
                )
            stats["distribution"] = distribution

        elif question.type == "yes_no":
            true_count = sum(1 for a in answers if a.value_boolean is True)
            false_count = sum(1 for a in answers if a.value_boolean is False)
            stats["true_count"] = true_count
            stats["false_count"] = false_count

        elif question.type == "rating":
            values = [a.value_number for a in answers if a.value_number is not None]
            total = sum(values)
            avg = round(total / len(values), 2) if values else None
            opts = question.options_json or {"min": 1, "max": 5}
            mn = opts.get("min", 1)
            mx = opts.get("max", 5)
            dist = {str(v): 0 for v in range(int(mn), int(mx) + 1)}
            for v in values:
                key = str(int(v))
                if key in dist:
                    dist[key] += 1
            stats["average"] = avg
            stats["min"] = mn
            stats["max"] = mx
            stats["distribution"] = dist

        elif question.type == "number":
            values = [a.value_number for a in answers if a.value_number is not None]
            stats["min"] = min(values) if values else None
            stats["max"] = max(values) if values else None
            stats["average"] = round(sum(values) / len(values), 2) if values else None

        elif question.type in ("short_text", "long_text"):
            samples = [a.value_text for a in answers if a.value_text][:5]
            stats["response_count"] = len(answers)
            stats["samples"] = samples

        per_question_stats[qid] = stats

    return {
        "form_id": form_id,
        "total_responses": total_responses,
        "question_stats": list(per_question_stats.values()),
    }


def list_responses(
    db: Session,
    form_id: int,
) -> Optional[List[ResponseListItem]]:
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return None

    results: List[ResponseListItem] = []
    for resp in form.responses:
        answer_count = len(resp.answers)
        answered_count = sum(
            1
            for a in resp.answers
            if a.value_text is not None
            or a.value_number is not None
            or a.value_boolean is not None
            or a.value_json is not None
        )
        results.append(
            ResponseListItem(
                id=resp.id,
                created_at=resp.created_at,
                answer_count=answer_count,
                answered_count=answered_count,
            )
        )
    return results


def get_response_detail(
    db: Session,
    form_id: int,
    response_id: int,
) -> Optional[ResponseOut]:
    response = (
        db.query(Response)
        .filter(Response.id == response_id, Response.form_id == form_id)
        .first()
    )
    if not response:
        return None

    answers = [
        AnswerOut(
            id=a.id,
            question_id=a.question_id,
            value_text=a.value_text,
            value_number=a.value_number,
            value_boolean=a.value_boolean,
            value_json=a.value_json,
        )
        for a in response.answers
    ]

    return ResponseOut(
        id=response.id,
        form_id=response.form_id,
        created_at=response.created_at,
        meta=response.respondent_meta_json,
        answers=answers,
    )
