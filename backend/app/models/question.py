from sqlalchemy import Column, Integer, String, JSON, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False, default="")
    description = Column(String, nullable=True, default="")
    required = Column(Boolean, default=False)
    options_json = Column(JSON, nullable=True)

    form = relationship("Form", back_populates="questions")
    answers = relationship(
        "Answer",
        back_populates="question",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("form_id", "order_index", name="uq_form_order_index"),
    )
