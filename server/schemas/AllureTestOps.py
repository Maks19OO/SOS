from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, field_validator, Field


class PriorityEnum(str, Enum):
    CRITICAL = "CRITICAL"
    NORMAL = "NORMAL"
    LOW = "LOW"


# Основная схема для описания теста
class AllureTest(BaseModel):
    # Общие атрибуты теста
    owner: str
    feature: str
    story: str
    test_type: str
    manual_mark: bool = True
    title: Optional[str]
    priority: PriorityEnum
    tags: List[str]  # Преобразуем в обычный список
    labels: dict = Field(default_factory=dict)

    # Валидатор для проверки минимальной длины списка tags
    @field_validator('tags')
    def validate_tags(cls, v):
        if len(v) < 1:
            raise ValueError('tags must contain at least one item')
        return v

    class ConfigDict:
        from_attributes = True


# Схема для описания шага с вложениями
class AllureStep(BaseModel):
    step_name: str
    step_action: str
    attachments: Optional[List[str]] = []

    class ConfigDict:
        from_attributes = True


# Схема для теста с шагами
class TestCase(BaseModel):
    test: AllureTest
    steps: List[AllureStep]

    class ConfigDict:
        from_attributes = True


class AllureTestOpsReport(BaseModel):
    testCases: List[TestCase]

    def to_json(self):
        return self.model_dump_json(indent=4)
