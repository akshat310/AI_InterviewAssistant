import google.generativeai as genai
import json
import re
from typing import List, Optional
from app.config import get_settings
from app.utils.prompt_builder import (
    build_question_prompt,
    build_evaluation_prompt,
    build_feedback_prompt,
    build_coding_followup_prompt,
    build_interviewer_system_prompt
)

settings = get_settings()
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# Topics that include coding questions
CODING_TOPICS = {"dsa", "python", "java", "cpp"}


def is_coding_topic(topic: str) -> bool:
    return topic.lower() in CODING_TOPICS


def clean_json_response(raw: str) -> str:
    """Strip markdown code fences from Gemini response."""
    return re.sub(r"```json|```", "", raw).strip()


def get_next_question(
    topic: str,
    difficulty: str,
    interview_type: str,
    asked_questions: List[str],
    question_number: int,
    language: Optional[str] = None,
    is_coding_round: bool = False
) -> str:
    """Fully AI-generated fresh question every time."""

    prompt = build_question_prompt(
        topic=topic,
        difficulty=difficulty,
        interview_type=interview_type,
        asked_questions=asked_questions,
        question_number=question_number,
        language=language,
        is_coding_round=is_coding_round
    )
    response = model.generate_content(prompt)
    return response.text.strip()


def get_coding_followup(
    question: str,
    approach: str,
    language: str
) -> str:
    """After candidate explains approach, ask them to code it."""
    prompt = build_coding_followup_prompt(question, approach, language)
    response = model.generate_content(prompt)
    return response.text.strip()


def evaluate_answer(
    question: str,
    answer: str,
    topic: str,
    difficulty: str,
    is_coding_question: bool = False,
    language: Optional[str] = None
) -> dict:
    """Evaluate answer using Gemini. Returns structured JSON feedback."""

    if not answer or len(answer.strip()) < 5:
        return {
            "score": 0,
            "verdict": "Poor",
            "strengths": [],
            "improvements": ["No answer was provided"],
            "ideal_answer_summary": "Please attempt an answer.",
            "follow_up_question": None,
            "approach_score": None,
            "code_score": None,
            "time_complexity": None,
            "space_complexity": None,
            "code_correctness": "N/A",
            "edge_cases_handled": None
        }

    prompt = build_evaluation_prompt(
        question=question,
        answer=answer,
        topic=topic,
        difficulty=difficulty,
        is_coding_question=is_coding_question,
        language=language
    )

    response = model.generate_content(prompt)
    raw = clean_json_response(response.text)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "score": 5,
            "verdict": "Average",
            "strengths": ["Answer received"],
            "improvements": ["Could not parse detailed feedback"],
            "ideal_answer_summary": raw,
            "follow_up_question": None,
            "approach_score": None,
            "code_score": None,
            "time_complexity": None,
            "space_complexity": None,
            "code_correctness": "N/A",
            "edge_cases_handled": None
        }


def generate_final_feedback(
    questions_and_answers: List[dict],
    topic: str,
    difficulty: str,
    overall_score: float,
    interview_type: str
) -> dict:
    """Generate comprehensive end-of-interview report."""

    prompt = build_feedback_prompt(
        questions_and_answers=questions_and_answers,
        topic=topic,
        difficulty=difficulty,
        overall_score=overall_score,
        interview_type=interview_type
    )

    response = model.generate_content(prompt)
    raw = clean_json_response(response.text)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "overall_verdict": "Average",
            "summary": raw,
            "top_strengths": [],
            "critical_gaps": [],
            "study_recommendations": [],
            "interview_readiness": "Needs More Prep",
            "score_breakdown": {},
            "motivational_message": "Keep practicing!"
        }


def test_gemini_connection() -> str:
    response = model.generate_content(
        "Say hello as an AI interview assistant in one line."
    )
    return response.text


def get_gemini_model():
    return model