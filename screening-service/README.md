# DataChain Screening Service

FastAPI service for generating and grading screening tests using OpenAI GPT-4.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```
OPENAI_API_KEY=your-openai-api-key-here
```

## Running the Service

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The service will be available at `http://127.0.0.1:8000`

## API Endpoints

### GET /
Service information and status

### GET /health
Health check endpoint - verifies OpenAI connection

### POST /generate-questions
Generate screening test questions based on project instruction

Request body:
```json
{
  "projectId": "project-123",
  "instruction": "Annotate medical review text with sentiment labels",
  "numQuestions": 5
}
```

### POST /submit-screening
Grade screening test answers and return score with feedback

Request body:
```json
{
  "projectId": "project-123",
  "userId": "user-456",
  "instruction": "Annotate medical review text with sentiment labels",
  "questions": [...],
  "answers": [
    {
      "questionId": 1,
      "answer": "User's answer here"
    }
  ]
}
```

## CORS Configuration

The service is configured to accept requests from:
- http://localhost:3000
- http://127.0.0.1:3000

To add more origins, modify the `allow_origins` list in `main.py`.
