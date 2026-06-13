from fastapi import APIRouter, HTTPException
from app.schemas.interview import (
    StartInterviewRequest,
    SubmitAnswerRequest,
    EndInterviewRequest
)
from app.core.interviewer import (
    get_next_question,
    get_coding_followup,
    evaluate_answer,
    generate_final_feedback,
    is_coding_topic
)

router = APIRouter(prefix="/interview", tags=["Interview"])

# In-memory sessions (DB integration coming next step)
sessions = {}


@router.post("/start")
async def start_interview(request: StartInterviewRequest):
    import time
    session_id = int(time.time())
    coding_round = request.coding_round or is_coding_topic(request.topic)
    current_difficulty = "easy" if request.difficulty == "mixed" else request.difficulty

    sessions[session_id] = {
        "topic": request.topic,
        "difficulty": request.difficulty,
        "current_difficulty": current_difficulty,
        "interview_type": request.interview_type,
        "total_questions": request.total_questions,
        "user_name": request.user_name,
        "language": request.language,
        "coding_round": coding_round,
        "asked_questions": [],
        "answers": [],
        "current_question_num": 1,
        "total_score": 0,
        "awaiting_code": False,
        "current_approach": None
    }

    first_question = get_next_question(
        topic=request.topic,
        difficulty=current_difficulty,
        interview_type=request.interview_type,
        asked_questions=[],
        question_number=1,
        language=request.language,
        is_coding_round=coding_round
    )

    sessions[session_id]["asked_questions"].append(first_question)

    return {
        "session_id": session_id,
        "user_name": request.user_name,
        "topic": request.topic,
        "difficulty": request.difficulty,
        "coding_round": coding_round,
        "language": request.language,
        "question_number": 1,
        "total_questions": request.total_questions,
        "question": first_question,
        "phase": "approach" if coding_round else "answer",
        "hint": "Explain your approach first, then you'll be asked to code." if coding_round else None,
        "message": f"Interview started! Good luck, {request.user_name}! 🎯"
    }


@router.post("/answer")
async def submit_answer(request: SubmitAnswerRequest):
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── CODING FLOW: Approach phase ──────────────────────
    if session["coding_round"] and not session["awaiting_code"]:
        session["awaiting_code"] = True
        session["current_approach"] = request.answer
        language = session["language"] or "Python"
        followup = get_coding_followup(
            question=session["asked_questions"][-1],
            approach=request.answer,
            language=language
        )
        return {
            "phase": "code",
            "message": followup,
            "question_number": session["current_question_num"],
            "total_questions": session["total_questions"],
            "is_complete": False,
            "evaluation": None,
            "next_question": None
        }

    # ── CODING FLOW: Code phase ──────────────────────────
    if session["coding_round"] and session["awaiting_code"]:
        full_answer = f"APPROACH:\n{session['current_approach']}\n\nCODE:\n{request.answer}"
        evaluation = evaluate_answer(
            question=session["asked_questions"][-1],
            answer=full_answer,
            topic=request.topic,
            difficulty=session["current_difficulty"],
            is_coding_question=True,
            language=session["language"]
        )
        session["awaiting_code"] = False
        session["current_approach"] = None

    # ── NORMAL FLOW ──────────────────────────────────────
    else:
        evaluation = evaluate_answer(
            question=request.question,
            answer=request.answer,
            topic=request.topic,
            difficulty=session["current_difficulty"],
            is_coding_question=False
        )

    session["answers"].append({
        "question": session["asked_questions"][-1],
        "answer": request.answer,
        "score": evaluation.get("score", 0),
        "feedback": evaluation
    })
    session["total_score"] += evaluation.get("score", 0)
    session["current_question_num"] += 1

    is_complete = session["current_question_num"] > session["total_questions"]
    next_question = None

    if not is_complete:
        if session["difficulty"] == "mixed":
            avg = session["total_score"] / len(session["answers"])
            session["current_difficulty"] = (
                "easy" if avg < 4 else
                "medium" if avg < 7 else
                "hard"
            )
        next_question = get_next_question(
            topic=session["topic"],
            difficulty=session["current_difficulty"],
            interview_type=session["interview_type"],
            asked_questions=session["asked_questions"],
            question_number=session["current_question_num"],
            language=session["language"],
            is_coding_round=session["coding_round"]
        )
        session["asked_questions"].append(next_question)

    return {
        "phase": "evaluation",
        "evaluation": evaluation,
        "question_number": session["current_question_num"] - 1,
        "is_complete": is_complete,
        "next_question": next_question,
        "next_question_number": session["current_question_num"] if not is_complete else None,
        "next_phase": "approach" if (session["coding_round"] and not is_complete) else "answer",
        "total_questions": session["total_questions"],
        "current_avg_score": round(session["total_score"] / len(session["answers"]), 2)
    }


@router.post("/end")
async def end_interview(request: EndInterviewRequest):
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session["answers"]:
        raise HTTPException(status_code=400, detail="No answers submitted yet")

    overall_score = round(session["total_score"] / len(session["answers"]), 2)
    final_feedback = generate_final_feedback(
        questions_and_answers=session["answers"],
        topic=session["topic"],
        difficulty=session["difficulty"],
        overall_score=overall_score,
        interview_type=session["interview_type"]
    )

    return {
        "session_id": request.session_id,
        "user_name": session["user_name"],
        "topic": session["topic"],
        "difficulty": session["difficulty"],
        "coding_round": session["coding_round"],
        "language": session["language"],
        "total_questions_attempted": len(session["answers"]),
        "overall_score": overall_score,
        "final_feedback": final_feedback,
        "question_breakdown": session["answers"]
    }


@router.get("/topics")
async def get_topics():
    return {
        "technical": {
            "topics": ["dsa", "os", "dbms", "cn"],
            "supports_coding": ["dsa"]
        },
        "system_design": {
            "topics": ["system_design"],
            "supports_coding": []
        },
        "hr": {
            "topics": ["hr"],
            "supports_coding": []
        },
        "language_specific": {
            "topics": ["python", "java", "cpp"],
            "supports_coding": ["python", "java", "cpp"]
        }
    }