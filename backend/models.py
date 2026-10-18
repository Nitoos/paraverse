import json
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


class Study(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    task: str
    segment_mix: str = "{}"  # JSON: {segment: count}
    created: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending | running | completed | error
    mode: str = "live"  # live | recorded


class Variant(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    study_id: str = Field(foreign_key="study.id")
    url: str
    label: str
    notes: str = ""


class Persona(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    study_id: str = Field(foreign_key="study.id")
    segment: str
    tenure_years: float = 1.0
    tech_literacy: int = 3
    language_fluency: int = 5
    device: str = "desktop_800"  # desktop_800 | mobile_375
    patience_budget_steps: int = 10
    patience_budget_seconds: int = 180
    accessibility_needs: str = "[]"   # JSON array
    behavioral_rules: str = "[]"      # JSON array


class Run(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    study_id: str = Field(foreign_key="study.id")
    variant_id: str = Field(foreign_key="variant.id")
    persona_id: str = Field(foreign_key="persona.id")
    outcome: Optional[str] = None  # completed | abandoned | error | step_cap
    duration_seconds: float = 0.0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class Step(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    run_id: str = Field(foreign_key="run.id")
    index: int
    screenshot_path: str = ""
    action: str
    target_id: Optional[str] = None
    value: Optional[str] = None
    thought: str = ""
    confused: bool = False
    confusion_reason: str = ""
    confidence: float = 1.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    human_time_seconds: float = 0.0


class CalibrationRun(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    rollout_name: str
    known_winner: str
    predicted_winner: str
    match: bool = False
    direction_correct: bool = False
    persona_weights: str = "{}"  # JSON
    set_type: str  # tuning | held_out


class Fix(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    study_id: str = Field(foreign_key="study.id")
    step_index: int
    suggestion: str
    expected_impact: str
    rank: int
    resimulated_result: Optional[str] = None  # JSON
