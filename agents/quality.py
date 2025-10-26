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
# Updated logger name for clarity
logger = logging.getLogger("QualityAssessmentAPI")



class TaskAssessmentRequest(Model):
    """
    Model for a request to assess a task's quality.
    """
    task_instructions: str
    completed_output: str
    evaluation_rubric: Optional[str] = None 

class TaskAssessmentResponse(Model):
    """
    Model for the response after assessing task quality.
    """
    status: str
    quality_feedback: Optional[str] = None
    quality_score: Optional[int] = None
    error_message: Optional[str] = None

# --- Agent and OpenAI Client Setup ---

DEFAULT_API_KEY = "INSERT_YOUR_ASI_ONE_API_KEY_HERE"
ASI_API_KEY = os.getenv("ASI_API_KEY", DEFAULT_API_KEY)

client = OpenAI(
    base_url='https://api.asi1.ai/v1',
    api_key=ASI_API_KEY,
)

quality_agent = Agent(
    name="ai_quality_agent_api",
    port=8001, 
    seed="ai_quality_agent_api_secret_phrase",
    endpoint=["http://127.0.0.1:8001/submit"]
)



def assess_task_quality_sync(
    instructions: str, 
    output: str, 
    rubric: Optional[str], 
    client: OpenAI
) -> Dict:
    """
    Calls the LLM to assess the quality of a completed task.
    """
    

    rubric_content = rubric if rubric else "N/A. Please use general best practices for quality."

    prompt_content = f"""
    **Task Instructions:**
    {instructions}

    **Evaluation Rubric:**
    {rubric_content}

    **Completed Task Output to Evaluate:**
    {output}

    Please evaluate the "Completed Task Output" based on the "Task Instructions" and "Evaluation Rubric".
    """
    
    system_prompt = """
    You are an expert Quality Assurance (QA) specialist. Your job is to evaluate a completed task.
    Provide concise, constructive feedback and a numerical score from 0 to 100 
    (0 = completely wrong, 100 = perfect).
    Output *only* a JSON object with two keys: "quality_feedback" (string) and "quality_score" (integer).
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

        logger.info(f"Raw LLM response for quality assessment: {response_text}")

        start_index = response_text.find('{')
        end_index = response_text.rfind('}')
        if start_index == -1 or end_index == -1:
            raise ValueError("Could not find a JSON object in the LLM assessment response.")

        json_str = response_text[start_index : end_index + 1]
        data = json.loads(json_str)

        if "quality_feedback" in data and "quality_score" in data:
            return data
        else:
            raise ValueError(f"LLM output JSON was not in the expected format: {json_str}")

    except Exception as e:
        logger.error(f"Error in assess_task_quality_sync: {e}")
    
        raise



@quality_agent.on_rest_post("/assess-task-quality", TaskAssessmentRequest, TaskAssessmentResponse)
async def handle_assess_task_quality(ctx: Context, req: TaskAssessmentRequest):
    logger.info(f"Received request to assess task quality.")
    try:
        result_data = await asyncio.to_thread(
            assess_task_quality_sync,
            req.task_instructions,
            req.completed_output,
            req.evaluation_rubric,
            client
        )
        return TaskAssessmentResponse(
            status="success",
            quality_feedback=result_data.get("quality_feedback"),
            quality_score=result_data.get("quality_score")
        )
    except Exception as e:
        logger.error(f"Error in assess_task_quality handler: {e}")
        return TaskAssessmentResponse(status="error", error_message=str(e))

@quality_agent.on_event("startup")
async def startup(ctx: Context):
    logger.info(f"Task Quality Assessment API agent started. Address: {ctx.agent.address}")
    logger.info("Endpoints are available at http://127.0.0.1:8001/submit")
    logger.info("POST /submit/assess-task-quality")



if __name__ == "__main__":
    if ASI_API_KEY == DEFAULT_API_KEY:
        print("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("!!! WARNING: You are using the default API key.                           !!!")
        print("!!! Please set the 'ASI_API_KEY' environment variable to your actual key. !!!")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")
    
    quality_agent.run()
