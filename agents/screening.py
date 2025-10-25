import json
import os
import asyncio
import logging
from typing import List, Optional, Dict
from dotenv import load_dotenv
from openai import OpenAI
from uagents import Agent, Context, Model
load_dotenv()
# --- Basic Configuration ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ScreeningAPI")

# --- Pydantic Models for API Requests and Responses ---

class InstructionRequest(Model):
    instruction: str

class QuestionsResponse(Model):
    status: str
    questions: Optional[List[str]] = None
    error_message: Optional[str] = None

class ScreeningRequest(Model):
    instruction: str
    questions: List[str]
    answers: List[str]

class ScreeningResponse(Model):
    status: str
    assessment: Optional[str] = None
    score: Optional[int] = None
    error_message: Optional[str] = None

# --- Agent and OpenAI Client Setup ---

DEFAULT_API_KEY = "INSERT_YOUR_ASI_ONE_API_KEY_HERE"

ASI_API_KEY = os.getenv("ASI_API_KEY", DEFAULT_API_KEY)

client = OpenAI(
    base_url='https://api.asi1.ai/v1',
    api_key=ASI_API_KEY,
)

screening_agent = Agent(
    name="ai_screening_agent_api",
    port=8000,
    seed="ai_screening_agent_api_secret_phrase",
    endpoint=["http://127.0.0.1:8000/submit"]
)

# --- Core LLM Functions (Synchronous) ---

def generate_questions_sync(instruction: str, client: OpenAI) -> List[str]:
    system_prompt = """
    You are an expert curriculum designer tasked with screening a user's expertise on a topic.
    The user will provide an instruction or topic. Your job is to generate 5 screening questions
    that test the user's *deep knowledge* of the *subject matter* behind the instruction. Make the questions appropriate for a 7th grader,
    Output *only* a JSON object with a single key "questions" containing a list of strings.
    """
    try:
        r = client.chat.completions.create(
            model="asi1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": instruction},
            ],
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        response_text = str(r.choices[0].message.content)
        
        # --- ENHANCED LOGGING ---
        # Log the raw response so we can debug what the LLM is sending
        logger.info(f"Raw LLM response for questions: {response_text}")
        
        start_index = response_text.find('{')
        end_index = response_text.rfind('}')
        if start_index == -1 or end_index == -1:
            raise ValueError("Could not find a JSON object in the LLM response.")
        
        json_str = response_text[start_index : end_index + 1]
        questions_data = json.loads(json_str)

        if isinstance(questions_data, dict) and "questions" in questions_data and isinstance(questions_data["questions"], list):
            return questions_data["questions"]
        else:
            raise ValueError(f"LLM output JSON was not in the expected format: {json_str}")
    except Exception as e:
        logger.error(f"Error processing LLM response for questions: {e}")
        # This is the message your frontend is receiving
        raise ValueError("Failed to parse valid question list from LLM output.") from e


def score_screening_sync(instruction: str, questions: list, answers: list, client: OpenAI) -> Dict:
    prompt_content = f"""
    **Screening Instruction:**
    {instruction}
    **Questions Asked:**
    {json.dumps(questions, indent=2)}
    **User's Answers:**
    {json.dumps(answers, indent=2)}
    Please provide a final assessment and a score from 0-100 based on the user's answers.
    """
    system_prompt = """
    You are an expert evaluator. Based on the provided data, provide a concise assessment
    and a score from 0 to 100.
    Output *only* a JSON object with two keys: "assessment" (string) and "score" (integer).
    """
    try:
        r = client.chat.completions.create(
            model="asi1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt_content},
            ],
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        response_text = str(r.choices[0].message.content)

        # --- ENHANCED LOGGING ---
        logger.info(f"Raw LLM response for scoring: {response_text}")

        start_index = response_text.find('{')
        end_index = response_text.rfind('}')
        if start_index == -1 or end_index == -1:
            raise ValueError("Could not find a JSON object in the LLM scoring response.")

        json_str = response_text[start_index : end_index + 1]
        return json.loads(json_str)
    except Exception as e:
        logger.error(f"Error in score_screening_sync: {e}")
        return {"assessment": f"An error occurred during evaluation: {str(e)}", "score": 0}

# --- REST API Endpoints ---
# (No changes needed in the endpoint handlers themselves)

@screening_agent.on_rest_post("/generate-questions", InstructionRequest, QuestionsResponse)
async def handle_generate_questions(ctx: Context, req: InstructionRequest):
    logger.info(f"Received request to generate questions for: {req.instruction}")
    try:
        questions = await asyncio.to_thread(generate_questions_sync, req.instruction, client)
        return QuestionsResponse(status="success", questions=questions)
    except Exception as e:
        logger.error(f"Error in generate_questions handler: {e}")
        return QuestionsResponse(status="error", error_message=str(e))

@screening_agent.on_rest_post("/submit-screening", ScreeningRequest, ScreeningResponse)
async def handle_submit_screening(ctx: Context, req: ScreeningRequest):
    logger.info(f"Received request to score screening for: {req.instruction}")
    try:
        if len(req.questions) != len(req.answers):
            return ScreeningResponse(
                status="error",
                error_message=f"Mismatch: Received {len(req.questions)} questions but {len(req.answers)} answers."
            )
        result_data = await asyncio.to_thread(
            score_screening_sync,
            req.instruction,
            req.questions,
            req.answers,
            client
        )
        return ScreeningResponse(
            status="success",
            assessment=result_data.get("assessment"),
            score=result_data.get("score")
        )
    except Exception as e:
        logger.error(f"Error in submit_screening handler: {e}")
        return ScreeningResponse(status="error", error_message=str(e))

@screening_agent.on_event("startup")
async def startup(ctx: Context):
    logger.info(f"Screening API agent started. Address: {ctx.agent.address}")
    logger.info("Endpoints are available at http://12_7.0.0.1:8000/submit")
    logger.info("POST /submit/generate-questions")
    logger.info("POST /submit/submit-screening")

# --- Main Execution Block ---

if __name__ == "__main__":
    if ASI_API_KEY == DEFAULT_API_KEY:
        print("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("!!! WARNING: You are using the default API key.                           !!!")
        print("!!! Please set the 'ASI_API_KEY' environment variable to your actual key. !!!")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")
    
    screening_agent.run()