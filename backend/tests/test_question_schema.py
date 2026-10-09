import pytest
from pydantic import ValidationError

from app.schemas.question import QuestionUpsert


def test_choice_question_requires_structured_options():
    with pytest.raises(ValidationError):
        QuestionUpsert(type="multiple_choice", order_index=0, options_json=None)


def test_question_types_accept_valid_payloads():
    question = QuestionUpsert(
        type="rating",
        order_index=0,
        options_json={"min": 1, "max": 5},
    )
    assert question.type == "rating"
