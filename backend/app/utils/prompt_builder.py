from typing import List, Optional


# ─────────────────────────────────────────────────
# SYSTEM PROMPTS — defines Gemini's persona
# ─────────────────────────────────────────────────

def build_interviewer_system_prompt(
    topic: str,
    difficulty: str,
    interview_type: str,
    language: Optional[str] = None
) -> str:

    language_note = f"The candidate will write code in {language}." if language else ""

    return f"""You are a senior interviewer at a top-tier tech company (think Google, Microsoft, Amazon).
You are conducting a real {difficulty}-level {interview_type} interview on the topic: {topic}.
{language_note}

Your personality:
- Professional but human — not robotic
- Encouraging but honest
- Ask sharp follow-ups when answers are vague
- Never give away the answer before the candidate responds

Your interview style for each type:
- DSA/Coding: First ask the candidate to explain their APPROACH and thought process,
  then ask them to write actual code. Evaluate both separately.
- CS Subjects (OS/DBMS/CN): Ask conceptual questions, probe with "why" and "how".
- System Design: Ask them to design a system, probe scalability and trade-offs.
- HR/Behavioral: Use STAR method evaluation (Situation, Task, Action, Result).
- Language Specific: Mix theory with practical/code snippets.

Difficulty calibration:
- easy: Fundamentals, straightforward problems, freshers level
- medium: Working knowledge expected, 1-3 years experience
- hard: Deep internals, edge cases, senior/FAANG level
- mixed: Start easy, increase difficulty based on performance

IMPORTANT: You generate questions that have NEVER been asked before in this session.
Always be creative — avoid textbook questions when possible."""


# ─────────────────────────────────────────────────
# QUESTION GENERATION PROMPTS
# ─────────────────────────────────────────────────

def build_question_prompt(
    topic: str,
    difficulty: str,
    interview_type: str,
    asked_questions: List[str],
    question_number: int,
    language: Optional[str] = None,
    is_coding_round: bool = False
) -> str:

    asked_text = "\n".join([f"- {q}" for q in asked_questions]) if asked_questions else "None"

    coding_instruction = ""
    if is_coding_round:
        lang = language or "any language of their choice"
        coding_instruction = f"""
This is a CODING question. Structure it as:
1. A clear problem statement with example input/output
2. Constraints (time/space complexity expectations)
3. Note that the candidate should first explain their approach, then write code in {lang}

Example format:
"Given [problem description]. 
Example: Input: [example] → Output: [example]
Constraints: [constraints]
First walk me through your approach, then code the solution in {lang}."
"""

    return f"""Generate ONE fresh {difficulty}-level interview question.
Topic: {topic}
Interview Type: {interview_type}
Question Number: {question_number}
{coding_instruction}

Previously asked questions — DO NOT repeat or closely resemble these:
{asked_text}

Rules:
- Return ONLY the question text, nothing else
- No preamble, no "Here's a question:", no numbering
- Make it feel like a real interviewer asking naturally
- Be creative — avoid overly common textbook questions
- Appropriate difficulty for {difficulty} level"""


# ─────────────────────────────────────────────────
# ANSWER EVALUATION PROMPTS
# ─────────────────────────────────────────────────

def build_evaluation_prompt(
    question: str,
    answer: str,
    topic: str,
    difficulty: str,
    is_coding_question: bool = False,
    language: Optional[str] = None
) -> str:

    coding_criteria = ""
    if is_coding_question:
        coding_criteria = """
Additional coding evaluation criteria:
- "approach_score": score 0-10 for their thought process explanation
- "code_score": score 0-10 for actual code quality
- "time_complexity": what they stated or what their code achieves
- "space_complexity": what they stated or what their code achieves
- "code_correctness": "Correct" | "Partially Correct" | "Incorrect"
- "edge_cases_handled": true/false
"""

    base_schema = """{
    "score": <0-10 overall>,
    "verdict": "<Excellent|Good|Average|Poor>",
    "strengths": ["<point1>", "<point2>"],
    "improvements": ["<point1>", "<point2>"],
    "ideal_answer_summary": "<what a perfect answer looks like>",
    "follow_up_question": "<natural follow-up or null>",
    "approach_score": <0-10, for coding questions>,
    "code_score": <0-10, for coding questions, else null>,
    "time_complexity": "<e.g. O(n log n) or null>",
    "space_complexity": "<e.g. O(n) or null>",
    "code_correctness": "<Correct|Partially Correct|Incorrect|N/A>",
    "edge_cases_handled": <true|false|null>
}"""

    return f"""You are evaluating a candidate's interview answer fairly and honestly.

Topic: {topic}
Difficulty: {difficulty}
Question: {question}
Candidate's Answer: {answer}
{coding_criteria}

Respond ONLY in this exact JSON format, no markdown, no explanation outside JSON:
{base_schema}

Scoring guide:
- 9-10: Exceptional — deep understanding, clean solution, great communication
- 7-8: Good — correct with minor gaps
- 5-6: Average — basics covered, lacks depth or has bugs
- 3-4: Poor — major gaps, wrong approach
- 0-2: Very poor — incorrect or no meaningful answer

Be honest. Real interviewers don't sugarcoat."""


# ─────────────────────────────────────────────────
# FOLLOW-UP PROMPT (for approach → code flow)
# ─────────────────────────────────────────────────

def build_coding_followup_prompt(
    question: str,
    approach: str,
    language: str
) -> str:
    return f"""The candidate just explained their approach to this coding problem:

Problem: {question}
Their Approach: {approach}

Now ask them to write the actual code in {language}.
Be natural — like a real interviewer saying "Great, go ahead and code that up."
Return ONLY your follow-up message, nothing else."""


# ─────────────────────────────────────────────────
# FINAL FEEDBACK PROMPT
# ─────────────────────────────────────────────────

def build_feedback_prompt(
    questions_and_answers: List[dict],
    topic: str,
    difficulty: str,
    overall_score: float,
    interview_type: str
) -> str:

    qa_text = ""
    for i, qa in enumerate(questions_and_answers, 1):
        qa_text += f"""
Q{i}: {qa['question']}
Answer: {qa['answer']}
Score: {qa['score']}/10
Verdict: {qa.get('feedback', {}).get('verdict', 'N/A')}
"""

    return f"""You are giving a final performance review after a complete interview session.

Topic: {topic}
Type: {interview_type}
Difficulty: {difficulty}
Overall Score: {overall_score}/10

Full Interview:
{qa_text}

Respond ONLY in this exact JSON format:
{{
    "overall_verdict": "<Excellent|Good|Average|Needs Improvement>",
    "summary": "<2-3 sentence honest overall assessment>",
    "top_strengths": ["<strength1>", "<strength2>", "<strength3>"],
    "critical_gaps": ["<gap1>", "<gap2>", "<gap3>"],
    "study_recommendations": [
        {{"topic": "<topic>", "reason": "<why they need it>", "resource": "<what to study>"}}
    ],
    "interview_readiness": "<Ready for Interviews|Almost Ready|Needs More Prep|Not Ready>",
    "score_breakdown": {{
        "technical_accuracy": <0-10>,
        "communication": <0-10>,
        "problem_solving": <0-10>,
        "depth_of_knowledge": <0-10>
    }},
    "motivational_message": "<genuine encouraging message, not generic>"
}}"""