import os
import io
import json
import base64
from enum import Enum
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
import pytesseract
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure Gemini
if GEMINI_API_KEY and "your_gemini_api_key" not in GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✨ Google Gemini API configured successfully.")
else:
    print("⚠️  GEMINI_API_KEY is missing. AI will only work in TEST_MODE.")

app = FastAPI(title="FortCode AI Verifier (Gemini Edition)")

class Decision(str, Enum):
    ACCEPT = "ACCEPT"
    REJECT = "REJECT"

class AnalysisResult(BaseModel):
    decision: Decision
    confidence: float
    explanation: str
    document_score: float
    text_score: float


class ExerciseTestCase(BaseModel):
    name: str
    assertion: str
    hidden: bool = True


class ExerciseDraft(BaseModel):
    title: str
    description: str
    language: str
    expectedFunctions: List[str]
    testCases: List[ExerciseTestCase]
    expectedOutput: str = ""


class ExerciseRequest(BaseModel):
    prompt: str = ""
    difficulty: str = "medium"
    language: str = "javascript"
    expectedFunctions: List[str] = ["solve"]
    criteria: List[str] = []
    randomize: bool = True


class CodeFeedbackRequest(BaseModel):
    code: str = ""
    challengeTitle: str = "Coding Challenge"

def perform_ocr(file_bytes: bytes) -> str:
    """Extract text from image using Tesseract."""
    try:
        # Check if tesseract is installed
        try:
            pytesseract.get_tesseract_version()
        except pytesseract.TesseractNotFoundError:
            print("❌ OCR Error: Tesseract not found. Please install Tesseract-OCR.")
            return "ERROR: Tesseract not installed"

        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        print(f"❌ OCR Error: {e}")
        return ""

async def analyze_with_gemini(justification: str, file_bytes: Optional[bytes] = None) -> dict:
    """Analyze justification and optional image using Google Gemini 1.5 Flash."""
    
    # 🧪 TEST MODE Simulation
    if TEST_MODE or not GEMINI_API_KEY or "your_gemini_api_key" in GEMINI_API_KEY:
        print("🧪 TEST MODE: Simulating decision...")
        is_prof = len(justification.strip()) > 30
        return {
            "decision": "ACCEPT" if is_prof else "REJECT",
            "confidence": 0.95 if is_prof else 0.4,
            "explanation": "Simulated decision (Professional profile detected)" if is_prof else "Justification too short (Simulation)",
            "document_score": 0.9 if is_prof else 0.2,
            "text_score": 0.9 if is_prof else 0.3
        }

    try:
        # Dynamic lookup to find a working model
        available_models = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
        
        # Priority list
        priority = ['models/gemini-1.5-flash', 'models/gemini-1.5-flash-latest', 'models/gemini-1.5-pro', 'models/gemini-pro']
        model_name = next((m for m in priority if m in available_models), available_models[0] if available_models else None)
        
        if not model_name:
             raise HTTPException(status_code=500, detail="No suitable Gemini model found in your account.")
             
        print(f"🌟 Using Gemini model: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        prompt = f"""
        Identity: You are a senior HR auditor.
        Task: Analyze if the standard user should be upgraded to 'recruiter'.
        
        INPUTS:
        - Justification provided by user: "{justification}"
        - Document attached: {'Yes' if file_bytes else 'No'}
        
        CRITERIA for ACCEPT:
        - Justification is coherent and professional (not gibberish).
        - If a document is provided, it must look like a professional badge, ID, or certificate.
        
        CRITERIA for REJECT:
        - Vague justification (e.g., 'i want to be recruiter').
        - Unrelated document (e.g., photo of food, pets, random objects).
        
        You must return ONLY a JSON object in this exact format:
        {{
            "decision": "ACCEPT" or "REJECT",
            "confidence": 0.0 to 1.0,
            "explanation": "Brief reason for your decision",
            "document_score": 0.0 to 1.0 (relevance of the document),
            "text_score": 0.0 to 1.0 (professionalism of the text)
        }}
        """

        content_parts = [prompt]
        if file_bytes:
            content_parts.append({
                "mime_type": "image/jpeg",
                "data": file_bytes
            })

        response = model.generate_content(content_parts)
        
        # Extract JSON from response text (Gemini sometimes adds markdown blocks)
        raw_text = response.text.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        
        return json.loads(raw_text)

    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _pick_model_name() -> str:
    available_models = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
    priority = [
        "models/gemini-1.5-flash",
        "models/gemini-1.5-flash-latest",
        "models/gemini-1.5-pro",
        "models/gemini-pro",
    ]
    model_name = next((m for m in priority if m in available_models), available_models[0] if available_models else None)
    if not model_name:
        raise HTTPException(status_code=500, detail="No suitable Gemini model found in your account.")
    return model_name


def _extract_json_text(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _parse_json_payload(raw_text: str):
    text = _extract_json_text(raw_text)
    if not text:
        return None

    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                return None
        return None


def _normalize_exercise_payload(data: dict, payload: ExerciseRequest) -> dict:
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="AI response is not an object")

    title = str(data.get("title") or "").strip()
    description = str(data.get("description") or "").strip()
    language = str(data.get("language") or payload.language or "javascript").strip().lower()

    expected_functions_raw = data.get("expectedFunctions")
    expected_functions = expected_functions_raw if isinstance(expected_functions_raw, list) else payload.expectedFunctions
    expected_functions = [str(item or "").strip() for item in expected_functions if str(item or "").strip()]
    if not expected_functions:
        expected_functions = ["solve"]

    test_cases_raw = data.get("testCases")
    test_cases = []
    if isinstance(test_cases_raw, list):
        for index, item in enumerate(test_cases_raw):
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or f"Test {index + 1}").strip()
            assertion = str(item.get("assertion") or "").strip()
            hidden = bool(item.get("hidden", True))
            if assertion:
                test_cases.append({"name": name, "assertion": assertion, "hidden": hidden})

    if not title:
        raise HTTPException(status_code=502, detail="AI response missing title")
    if not description:
        raise HTTPException(status_code=502, detail="AI response missing description")
    if not language:
        raise HTTPException(status_code=502, detail="AI response missing language")
    if not test_cases:
        raise HTTPException(status_code=502, detail="AI response missing valid test cases")

    expected_output = str(data.get("expectedOutput") or "").strip()
    if not expected_output:
        expected_output = "Reference output not provided by AI."

    return {
        "title": title,
        "description": description,
        "language": language,
        "expectedFunctions": expected_functions,
        "testCases": test_cases,
        "expectedOutput": expected_output,
    }


async def generate_exercise_with_gemini(payload: ExerciseRequest) -> dict:
    if not GEMINI_API_KEY or "your_gemini_api_key" in GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is missing. Exercise generation requires real AI.")

    model_name = _pick_model_name()
    print(f"🌟 Using Gemini model for exercise generation: {model_name}")
    model = genai.GenerativeModel(model_name)

    prompt = f"""
You generate coding exercises for technical assessments.
Return ONLY valid JSON with this exact shape:
{{
  "title": "string",
  "description": "string",
  "language": "javascript or python",
  "expectedFunctions": ["functionName"],
  "testCases": [
    {{ "name": "string", "assertion": "string", "hidden": true }}
    ],
    "expectedOutput": "string"
}}

Rules:
- language must match requested language.
- expectedFunctions must contain valid function identifiers.
- testCases must have at least 3 items.
- expectedOutput must summarize the expected result or output pattern for a correct solution.
- For JavaScript assertions: boolean expressions or code returning boolean.
- For Python assertions: expression style compatible with python checks.
- No markdown, no commentary, no code fences.

Input:
- prompt: {payload.prompt}
- difficulty: {payload.difficulty}
- language: {payload.language}
- expectedFunctions: {payload.expectedFunctions}
- criteria: {payload.criteria}
- randomize: {payload.randomize}
"""

    try:
        response = model.generate_content(prompt)

        raw_text = ""
        try:
            raw_text = getattr(response, "text", "") or ""
        except Exception:
            raw_text = ""

        if not raw_text and getattr(response, "candidates", None):
            try:
                parts = response.candidates[0].content.parts or []
                raw_text = "".join(str(getattr(part, "text", "") or "") for part in parts)
            except Exception:
                raw_text = ""

        data = _parse_json_payload(raw_text)
        if data is None:
            raise HTTPException(status_code=502, detail="Gemini did not return valid JSON")

        return _normalize_exercise_payload(data, payload)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Gemini Exercise Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def generate_code_feedback_with_gemini(payload: CodeFeedbackRequest) -> dict:
    code = str(payload.code or "")
    title = str(payload.challengeTitle or "Coding Challenge")

    if not code.strip():
        return {
            "bugs": [],
            "suggestions": ["Write some code before requesting AI feedback."],
            "improvements": ["Add at least one test case for the function behavior."],
            "summary": "No code provided.",
        }

    # Keep service resilient when Gemini is unavailable.
    if not GEMINI_API_KEY or "your_gemini_api_key" in GEMINI_API_KEY:
        return {
            "bugs": [],
            "suggestions": ["Add edge-case tests.", "Consider naming clarity for maintainability."],
            "improvements": ["Extract reusable helpers if logic grows."],
            "summary": "AI feedback service unavailable; showing default tips.",
        }

    model_name = _pick_model_name()
    model = genai.GenerativeModel(model_name)

    prompt = f"""
You are a senior code reviewer.
Analyze the submitted code for challenge: {title}

Return ONLY valid JSON with this exact shape:
{{
  "bugs": ["string"],
  "suggestions": ["string"],
  "improvements": ["string"],
  "summary": "string"
}}

Constraints:
- Keep each list concise (max 5 items).
- No markdown, no code fences, no extra text.

Code:
{code[:12000]}
"""

    try:
        response = model.generate_content(prompt)

        raw_text = ""
        try:
            raw_text = getattr(response, "text", "") or ""
        except Exception:
            raw_text = ""

        if not raw_text and getattr(response, "candidates", None):
            try:
                parts = response.candidates[0].content.parts or []
                raw_text = "".join(str(getattr(part, "text", "") or "") for part in parts)
            except Exception:
                raw_text = ""

        parsed = _parse_json_payload(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError("Gemini did not return a JSON object")

        def to_list(value):
            if not isinstance(value, list):
                return []
            return [str(item).strip() for item in value if str(item).strip()][:5]

        return {
            "bugs": to_list(parsed.get("bugs")),
            "suggestions": to_list(parsed.get("suggestions")),
            "improvements": to_list(parsed.get("improvements")),
            "summary": str(parsed.get("summary") or "AI code feedback generated.").strip(),
        }
    except Exception as e:
        print(f"❌ Gemini Code Feedback Error: {e}")
        return {
            "bugs": [],
            "suggestions": ["Add edge-case tests.", "Consider naming clarity for maintainability."],
            "improvements": ["Extract reusable helpers if logic grows."],
            "summary": "AI feedback service unavailable; showing default tips.",
        }

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_request(
    justification: str = Form(...),
    file: UploadFile = File(None)
):
    file_bytes = None
    if file:
        try:
            file_bytes = await file.read()
            print(f"📄 Received file: {file.filename} ({len(file_bytes)} bytes)")
        except Exception as e:
            print(f"❌ File Read Error: {e}")

    # Directly analyze with Gemini (Multimodal)
    analysis = await analyze_with_gemini(justification, file_bytes)
    
    return AnalysisResult(**analysis)


@app.post("/generate-exercise")
async def generate_exercise(req: ExerciseRequest):
    exercise = await generate_exercise_with_gemini(req)
    return {
        "exercise": exercise,
        "source": "ai",
        "provider": "gemini",
    }


@app.post("/code-feedback")
async def code_feedback(req: CodeFeedbackRequest):
    feedback = await generate_code_feedback_with_gemini(req)
    return feedback

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
