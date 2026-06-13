from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class TopicEnum(str, Enum):
    dsa = "dsa"
    os = "os"
    dbms = "dbms"
    cn = "cn"
    system_design = "system_design"
    hr = "hr"
    python = "python"
    java = "java"
    cpp = "cpp"


class DifficultyEnum(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    mixed = "mixed"


class InterviewTypeEnum(str, Enum):
    technical = "technical"
    hr = "hr"
    system_design = "system_design"
    language = "language"


class StartInterviewRequest(BaseModel):
    topic: TopicEnum
    difficulty: DifficultyEnum
    interview_type: InterviewTypeEnum
    total_questions: int = 5
    user_name: str = "Candidate"
    language: Optional[str] = None     # e.g. "Python", "Java", "C++"
    coding_round: bool = False          # True = DSA coding questions


class SubmitAnswerRequest(BaseModel):
    session_id: int
    question: str
    answer: str
    topic: str
    difficulty: str
    is_coding_question: bool = False
    language: Optional[str] = None
    # For approach → code two-step flow
    is_approach_phase: bool = False


class EndInterviewRequest(BaseModel):
    session_id: int