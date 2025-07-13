# main.py

import os
import logging
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from script_generator import ScriptGenerator # Import our class

# --- Configuration ---
load_dotenv() # Load variables from .env file

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")

# --- Logging Setup ---
logging.basicConfig(level=LOG_LEVEL, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- FastAPI App & Script Engine Initialization ---
app = FastAPI(
    title="Video Script Generation API",
    description="An API to generate and translate video scripts from metadata using local LLMs.",
    version="1.0.0"
)

# Instantiate the engine once when the app starts.
# This is efficient as models are loaded only once.
try:
    engine = ScriptGenerator(ollama_model=OLLAMA_MODEL, ollama_api_url=OLLAMA_API_URL)
except Exception as e:
    logger.critical(f"Failed to initialize ScriptGenerator: {e}")
    # In a real app, you might want to prevent startup if this fails.
    engine = None


# --- Pydantic Models for API Data Validation ---

class MetadataInput(BaseModel):
    title: str = Field(..., description="The title of the artifact.", example="The Histories")
    creator: str = Field(..., description="The author or creator of the artifact.", example="Herodotus")
    date: str = Field(..., description="The publication or creation date.", example="c. 430 BC")
    description: Optional[str] = Field("No description provided.", description="A brief description of the artifact.")

class ScriptGenerationRequest(BaseModel):
    artifact_type: Literal["publication", "publication_deep_dive", "photograph", "default"] = Field(
        "publication_deep_dive",
        description="The type of prompt template to use."
    )
    metadata: MetadataInput

class ScriptGenerationResponse(BaseModel):
    english_script: str
    qc_passed: bool
    qc_message: str
    arabic_translation_draft: Optional[str] = None
    arabic_translation_refined: Optional[str] = None

class HealthCheckResponse(BaseModel):
    status: str
    ollama_model: str


# --- API Endpoints ---

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Video Script Generation API...")
    if not engine:
        logger.error("ScriptGenerator engine is not available. Endpoints will fail.")

@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Welcome to the Video Script Generation API. See /docs for usage."}

@app.get("/health", tags=["Status"], response_model=HealthCheckResponse)
async def health_check():
    """Check the health of the API and its connection to Ollama."""
    if not engine:
        raise HTTPException(status_code=503, detail="ScriptGenerator engine failed to initialize.")
    
    # A simple check could just be to see if the engine object exists
    # A more robust check would ping the Ollama server, but we do that implicitly
    # in the generation step.
    return HealthCheckResponse(status="ok", ollama_model=engine.ollama_model)


@app.post("/generate-script", tags=["Generation"], response_model=ScriptGenerationResponse)
async def generate_full_script(request: ScriptGenerationRequest):
    """
    Generates a full video script in English and provides an Arabic translation.
    """
    if not engine:
        logger.error("Attempted to use /generate-script but engine is not available.")
        raise HTTPException(status_code=503, detail="Service is unavailable: ScriptGenerator engine failed to initialize.")

    logger.info(f"Received request for artifact type: {request.artifact_type}")
    logger.info(f"Metadata: {request.metadata.dict()}")

    try:
        # Step 1: Create Prompt
        metadata_dict = request.metadata.dict()
        prompt = engine._create_prompt(metadata_dict, request.artifact_type)

        # Step 2: Generate Script
        english_script = engine.generate_script(prompt)

        # Step 3: Quality Control
        is_passed, qc_message = engine._quality_check(english_script)
        
        response_data = {
            "english_script": english_script,
            "qc_passed": is_passed,
            "qc_message": qc_message,
        }

        # Step 4: Translate if QC passed
        if is_passed:
            draft_translation = engine.translate_to_arabic(english_script)
            refined_translation = engine.refine_translation_with_ollama(draft_translation)
            response_data["arabic_translation_draft"] = draft_translation
            response_data["arabic_translation_refined"] = refined_translation
        else:
            logger.warning("Skipping translation due to QC failure.")

        return ScriptGenerationResponse(**response_data)

    except Exception as e:
        logger.exception("An unhandled error occurred during script generation.")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")
