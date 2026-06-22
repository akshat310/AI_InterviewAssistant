from typing import Dict, Any
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

@router.post("/chat")
async def interviewer_chat(request: Dict[str, Any]):
    """
    AI reacts to what candidate says while coding.
    Returns a short interviewer response / follow-up.
    """
    from app.core.interviewer import get_gemini_model
    
    question    = request.get("question", "")
    what_said   = request.get("what_said", "")
    code_so_far = request.get("code_so_far", "")
    topic       = request.get("topic", "dsa")
    language    = request.get("language", "Python")

    if not what_said.strip():
        return {"response": None}

    prompt = f"""You are a live technical interviewer at a top tech company.
The candidate is solving this problem: {question}

What they just said while coding: "{what_said}"

Their code so far:
{code_so_far or "(nothing written yet)"}

React naturally as an interviewer would in a real interview.
Rules:
- Keep response SHORT — 1-2 sentences max
- Ask a follow-up if something is unclear or interesting
- Confirm good thinking with brief encouragement
- Point out a concern if you spot a bug or wrong direction
- Sound human, not robotic
- Do NOT give away the answer
- If they're on the right track, say so briefly

Return ONLY your spoken response, nothing else."""

    model    = get_gemini_model()
    response = model.generate_content(prompt)
    return {"response": response.text.strip()}

@router.post("/template")
async def get_code_template(request: Dict[str, Any]):
    """Generate LeetCode-style starter code template for a question."""
    from app.core.interviewer import get_gemini_model

    question = request.get("question", "")
    language = request.get("language", "Python")
    topic    = request.get("topic", "dsa")

    prompt = f"""You are generating a LeetCode-style starter code template.

Question: {question}
Language: {language}
Topic: {topic}

Generate ONLY the starter code template — no explanation, no markdown, no backticks.
Rules:
- Include the class definition and method signature
- Add meaningful parameter names based on the problem
- Add type hints (for Python/Java/C++)
- Add a short comment for each parameter explaining what it is
- Leave the body with just a placeholder comment "# Your code here" (or language equivalent)
- For DSA: include any helper classes needed (e.g. ListNode, TreeNode) as comments above
- Make it feel exactly like LeetCode starter code
- Include example in comments at top

Example for Python Two Sum:
# Example: nums = [2,7,11,15], target = 9 -> [0,1]
# Definition: Given array nums and target, return indices

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your code here
        pass

Return ONLY the code, nothing else."""

    model    = get_gemini_model()
    response = model.generate_content(prompt)
    template = response.text.strip()

    # Clean any accidental markdown
    import re
    template = re.sub(r'```[\w]*\n?', '', template).strip()

    return {"template": template}