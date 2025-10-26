# screening-service/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

app = FastAPI(title="DataChain Screening Service")

# Configure CORS to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable is required")

client = OpenAI(api_key=openai_api_key)

# Request/Response Models
class GenerateQuestionsRequest(BaseModel):
    projectId: str
    instruction: str
    numQuestions: Optional[int] = 5

class Question(BaseModel):
    id: int
    question: str
    type: str  # "multiple-choice", "short-answer", etc.
    options: Optional[List[str]] = None

class GenerateQuestionsResponse(BaseModel):
    success: bool
    questions: List[Question]
    projectId: str

class Answer(BaseModel):
    questionId: int
    answer: str

class SubmitScreeningRequest(BaseModel):
    projectId: str
    userId: str
    instruction: str
    questions: List[Question]
    answers: List[Answer]

class SubmitScreeningResponse(BaseModel):
    success: bool
    score: float
    status: str  # "passed" or "failed"
    feedback: str
    detailedResults: List[dict]

@app.get("/")
async def root():
    return {
        "service": "DataChain Screening Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test OpenAI connection
        client.models.list()
        return {
            "status": "healthy",
            "openai": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(request: GenerateQuestionsRequest):
    """
    Generate screening test questions based on project instruction using OpenAI GPT-4
    """
    try:
        prompt = f"""You are creating a screening test for annotators who want to work on a data annotation project.

Project Instruction: {request.instruction}

Generate {request.numQuestions} screening questions to test if an annotator understands the task requirements and has the necessary skills.

Questions should assess:
1. Understanding of the annotation task
2. Attention to detail
3. Relevant domain knowledge
4. Ability to follow instructions

Format your response as a JSON array with this structure:
[
  {{
    "id": 1,
    "question": "What is the main objective of this annotation task?",
    "type": "short-answer"
  }},
  {{
    "id": 2,
    "question": "Which of the following best describes...",
    "type": "multiple-choice",
    "options": ["Option A", "Option B", "Option C", "Option D"]
  }}
]

Generate questions that are clear, specific, and directly relevant to the task."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at creating screening tests for data annotation tasks. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )

        # Parse the response
        import json
        questions_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if questions_text.startswith("```"):
            questions_text = questions_text.split("```")[1]
            if questions_text.startswith("json"):
                questions_text = questions_text[4:]
        
        questions_data = json.loads(questions_text)
        
        questions = [
            Question(
                id=q.get("id", idx + 1),
                question=q["question"],
                type=q.get("type", "short-answer"),
                options=q.get("options")
            )
            for idx, q in enumerate(questions_data)
        ]

        return GenerateQuestionsResponse(
            success=True,
            questions=questions,
            projectId=request.projectId
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse OpenAI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

@app.post("/submit-screening", response_model=SubmitScreeningResponse)
async def submit_screening(request: SubmitScreeningRequest):
    """
    Grade screening test answers using OpenAI GPT-4 and return score with detailed feedback
    """
    try:
        # Build the grading prompt
        qa_pairs = []
        for q in request.questions:
            answer = next((a.answer for a in request.answers if a.questionId == q.id), "No answer provided")
            qa_pairs.append({
                "question": q.question,
                "type": q.type,
                "options": q.options,
                "answer": answer
            })

        prompt = f"""You are grading a screening test for a data annotation project.

Project Instruction: {request.instruction}

Questions and Answers:
{json.dumps(qa_pairs, indent=2)}

Evaluate each answer based on:
1. Correctness and accuracy
2. Understanding of the task
3. Completeness and clarity
4. Attention to detail

For each question, provide:
- A score from 0-100
- Brief feedback explaining the score

Then calculate:
- Overall average score (0-100)
- Pass/fail status (pass >= 70)
- Overall feedback summary

Respond with this JSON structure:
{{
  "detailedResults": [
    {{
      "questionId": 1,
      "score": 85,
      "feedback": "Good understanding but could be more specific..."
    }}
  ],
  "overallScore": 82,
  "status": "passed",
  "feedback": "Overall feedback summary..."
}}"""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert grader for data annotation screening tests. Always respond with valid JSON. Be fair but thorough in your evaluation."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent grading
            max_tokens=2000
        )

        # Parse the response
        import json
        result_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        result_data = json.loads(result_text)

        overall_score = result_data.get("overallScore", 0)
        status = "passed" if overall_score >= 70 else "failed"

        return SubmitScreeningResponse(
            success=True,
            score=overall_score,
            status=status,
            feedback=result_data.get("feedback", "Screening evaluation completed."),
            detailedResults=result_data.get("detailedResults", [])
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse OpenAI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade screening: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
