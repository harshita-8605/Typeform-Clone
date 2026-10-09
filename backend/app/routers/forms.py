from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import bearer, get_creator_email
from app.database import SessionLocal
from app.models import Response
from app.schemas import (
    FormCreate,
    FormUpdate,
    Form as FormSchema,
    FormListItem,
    Question as QuestionSchema,
    QuestionUpsert,
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


def creator(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    return get_creator_email(credentials)


@router.get("", response_model=List[FormListItem])
def list_forms(db: Session = Depends(get_db), owner: str = Depends(creator)):
    return form_service.list_forms(db, owner)


@router.post("", response_model=FormSchema, status_code=status.HTTP_201_CREATED)
def create_form(form: FormCreate, db: Session = Depends(get_db), owner: str = Depends(creator)):
    return form_service.create_form(db, form.dict(exclude_unset=True), owner)


@router.get("/{form_id}", response_model=FormSchema)
def get_form(form_id: int, db: Session = Depends(get_db), owner: str = Depends(creator)):
    form = form_service.get_form(db, form_id, owner)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    result = FormSchema.from_orm(form)
    result.response_count = db.query(func.count(Response.id)).filter(Response.form_id == form_id).scalar() or 0
    return result


@router.patch("/{form_id}", response_model=FormSchema)
def update_form(form_id: int, update: FormUpdate, db: Session = Depends(get_db), owner: str = Depends(creator)):
    updated = form_service.update_form(db, form_id, update.dict(exclude_unset=True), owner)
    if not updated:
        raise HTTPException(status_code=404, detail="Form not found")
    return updated


@router.post("/{form_id}/duplicate", response_model=FormSchema, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, db: Session = Depends(get_db), owner: str = Depends(creator)):
    duplicated = form_service.duplicate_form(db, form_id, owner)
    if not duplicated:
        raise HTTPException(status_code=404, detail="Form not found")
    return duplicated


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db), owner: str = Depends(creator)):
    if not form_service.delete_form(db, form_id, owner):
        raise HTTPException(status_code=404, detail="Form not found")


@router.post("/{form_id}/publish", response_model=FormSchema)
def publish_form(form_id: int, db: Session = Depends(get_db), owner: str = Depends(creator)):
    published = form_service.publish_form(db, form_id, owner)
    if not published:
        raise HTTPException(status_code=404, detail="Form not found")
    return published


@router.post("/{form_id}/unpublish", response_model=FormSchema)
def unpublish_form(form_id: int, db: Session = Depends(get_db), owner: str = Depends(creator)):
    unpublished = form_service.unpublish_form(db, form_id, owner)
    if not unpublished:
        raise HTTPException(status_code=404, detail="Form not found")
    return unpublished


@router.put("/{form_id}/questions", response_model=List[QuestionSchema])
def upsert_form_questions(
    form_id: int,
    questions: List[QuestionUpsert],
    db: Session = Depends(get_db),
    owner: str = Depends(creator),
):
    payload = [question.model_dump(exclude_none=True) for question in questions]
    result = form_service.upsert_form_questions(db, form_id, payload, owner)
    if result is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return result


@router.get("/{form_id}/summary")
def get_form_summary(form_id: int, db: Session = Depends(get_db), owner: str = Depends(creator)):
    if not form_service.get_form(db, form_id, owner):
        raise HTTPException(status_code=404, detail="Form not found")
    summary = stats_service.get_form_summary(db, form_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Form not found")
    return summary


@router.get("/{form_id}/responses", response_model=List[ResponseListItem])
def list_responses(form_id: int, db: Session = Depends(get_db), owner: str = Depends(creator)):
    if not form_service.get_form(db, form_id, owner):
        raise HTTPException(status_code=404, detail="Form not found")
    return stats_service.list_responses(db, form_id)


@router.get("/{form_id}/responses/{response_id}", response_model=ResponseOut)
def get_response(
    form_id: int,
    response_id: int,
    db: Session = Depends(get_db),
    owner: str = Depends(creator),
):
    if not form_service.get_form(db, form_id, owner):
        raise HTTPException(status_code=404, detail="Form not found")
    detail = stats_service.get_response_detail(db, form_id, response_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Response not found")
    return detail
