import os
import io
import json
import base64
from enum import Enum
from typing import Optional

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
