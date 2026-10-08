from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, ConfigDict


class AnswerSubmission(BaseModel):
    question_id: int
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_boolean: Optional[bool] = None
    value_json: Optional[Any] = None


class ResponseSubmission(BaseModel):
    answers: List[AnswerSubmission]
    meta: Optional[dict] = None


class AnswerOut(BaseModel):
    id: int
    question_id: int
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_boolean: Optional[bool] = None
    value_json: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class ResponseOut(BaseModel):
    id: int
    form_id: int
    created_at: datetime
    meta: Optional[dict] = None
    answers: List[AnswerOut] = []

    model_config = ConfigDict(from_attributes=True)


class ResponseListItem(BaseModel):
    id: int
    created_at: datetime
    answer_count: int
    answered_count: Optional[int] = None
