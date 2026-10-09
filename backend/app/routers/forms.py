from typing import List, Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Response
from app.schemas import (
    FormCreate,
    FormUpdate,
    Form as FormSchema,
    FormListItem,
    Question as QuestionSchema,
    ResponseListItem,
    ResponseOut,
)
from app.services import form_service, stats_service

router = APIRouter(prefix="/api/forms", tags=["forms"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_creator_email(
    x_creator_email: str | None = Header(default=None, alias="X-Creator-Email"),
) -> str | None:
    return x_creator_email.strip().lower() if x_creator_email else None


@router.get("", response_model=List[FormListItem])
def list_forms(db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    return form_service.list_forms(db, creator_email)


@router.post("", response_model=FormSchema, status_code=status.HTTP_201_CREATED)
def create_form(form: FormCreate, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    return form_service.create_form(db, form.dict(exclude_unset=True), creator_email)


@router.get("/{form_id}", response_model=FormSchema)
def get_form(form_id: int, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    form = form_service.get_form(db, form_id, creator_email)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    result = FormSchema.from_orm(form)
    count = (
        db.query(func.count(Response.id))
        .filter(Response.form_id == form_id)
        .scalar()
    )
    result.response_count = count or 0
    return result


@router.patch("/{form_id}", response_model=FormSchema)
def update_form(form_id: int, update: FormUpdate, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    updated = form_service.update_form(db, form_id, update.dict(exclude_unset=True), creator_email)
    if not updated:
        raise HTTPException(status_code=404, detail="Form not found")
    return updated


@router.post("/{form_id}/duplicate", response_model=FormSchema, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    duplicated = form_service.duplicate_form(db, form_id, creator_email)
    if not duplicated:
        raise HTTPException(status_code=404, detail="Form not found")
    return duplicated


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    deleted = form_service.delete_form(db, form_id, creator_email)
    if not deleted:
        raise HTTPException(status_code=404, detail="Form not found")
    return None


@router.post("/{form_id}/publish", response_model=FormSchema)
def publish_form(form_id: int, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    published = form_service.publish_form(db, form_id, creator_email)
    if not published:
        raise HTTPException(status_code=404, detail="Form not found")
    return published


@router.post("/{form_id}/unpublish", response_model=FormSchema)
def unpublish_form(form_id: int, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    unpublished = form_service.unpublish_form(db, form_id, creator_email)
    if not unpublished:
        raise HTTPException(status_code=404, detail="Form not found")
    return unpublished


@router.put("/{form_id}/questions", response_model=List[QuestionSchema])
def upsert_form_questions(
    form_id: int,
    questions: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    creator_email: str | None = Depends(get_creator_email),
):
    result = form_service.upsert_form_questions(db, form_id, questions, creator_email)
    if result is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return result


@router.get("/{form_id}/summary")
def get_form_summary(form_id: int, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    if not form_service.get_form(db, form_id, creator_email):
        raise HTTPException(status_code=404, detail="Form not found")
    summary = stats_service.get_form_summary(db, form_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Form not found")
    return summary


@router.get("/{form_id}/responses", response_model=List[ResponseListItem])
def list_responses(form_id: int, db: Session = Depends(get_db), creator_email: str | None = Depends(get_creator_email)):
    if not form_service.get_form(db, form_id, creator_email):
        raise HTTPException(status_code=404, detail="Form not found")
    responses = stats_service.list_responses(db, form_id)
    if responses is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return responses


@router.get("/{form_id}/responses/{response_id}", response_model=ResponseOut)
def get_response(
    form_id: int,
    response_id: int,
    db: Session = Depends(get_db),
    creator_email: str | None = Depends(get_creator_email),
):
    if not form_service.get_form(db, form_id, creator_email):
        raise HTTPException(status_code=404, detail="Form not found")
    detail = stats_service.get_response_detail(db, form_id, response_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Response not found")
    return detail
