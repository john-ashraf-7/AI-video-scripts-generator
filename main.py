from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import json
from AIScript import ScriptGenerator

app = FastAPI(title="AI Video Script Generator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the script generator
script_generator = ScriptGenerator(ollama_model="llama3:8b")

class MetadataRequest(BaseModel):
    artifact_type: str
    metadata: dict

class HealthResponse(BaseModel):
    status: str
    ollama_model: str
    message: str

class GalleryItem(BaseModel):
    id: int
    title: str
    creator: str
    date: str
    description: str
    call_number: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if the API and Ollama are running properly."""
    try:
        # Check if Ollama is accessible
        if script_generator._check_ollama_status():
            return HealthResponse(
                status="healthy",
                ollama_model=script_generator.ollama_model,
                message="API and Ollama are running"
            )
        else:
            return HealthResponse(
                status="unhealthy",
                ollama_model="unknown",
                message="Ollama server is not accessible"
            )
    except Exception as e:
        return HealthResponse(
            status="error",
            ollama_model="unknown",
            message=f"Error: {str(e)}"
        )

@app.get("/gallery")
async def get_gallery():
    """Get available items from the sample data for the gallery."""
    try:
        gallery_items = []
        with open("sample_data.jsonl", 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                try:
                    item = json.loads(line.strip())
                    gallery_items.append({
                        "id": i,
                        "title": item.get('Title', 'No Title'),
                        "creator": item.get('Creator', 'Unknown'),
                        "date": item.get('Date', 'Unknown'),
                        "description": item.get('Description', 'No description'),
                        "call_number": item.get('Call number', 'N/A')
                    })
                except json.JSONDecodeError:
                    continue
        return {"items": gallery_items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load gallery: {str(e)}")

@app.post("/generate-script")
async def generate_script(request: MetadataRequest):
    """Generate a video script from metadata."""
    try:
        # Generate factual summary for deep dive
        factual_summary = None
        if request.artifact_type == "publication_deep_dive":
            factual_summary = script_generator._generate_factual_summary(request.metadata)
        
        # Create prompt from metadata
        prompt = script_generator._create_prompt(request.metadata, request.artifact_type, factual_summary)
        
        # Generate English script
        raw_script = script_generator._send_prompt_to_ollama(prompt)
        
        # Clean the script
        first_cue_position = raw_script.find('(')
        if first_cue_position != -1:
            script = raw_script[first_cue_position:]
        else:
            script = raw_script
        
        import re
        script = re.sub(r'\[.*?paragraph.*?\]', '', script, flags=re.IGNORECASE).strip()
        script = re.sub(r'\(Your visual cue here\)', '(Visual cue)', script, flags=re.IGNORECASE).strip()
        
        # Quality check
        qc_passed, qc_message = script_generator._quality_check(script)
        
        result = {
            "english_script": script,
            "qc_passed": qc_passed,
            "qc_message": qc_message,
            "arabic_translation_refined": None
        }
        
        # Translate if QC passed
        if qc_passed:
            try:
                # Get initial translation
                arabic_translation = script_generator.translate_to_arabic(script)
                # Refine translation
                refined_arabic = script_generator.refine_translation_with_ollama(arabic_translation)
                result["arabic_translation_refined"] = refined_arabic
            except Exception as e:
                result["arabic_translation_refined"] = f"Translation failed: {str(e)}"
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")

@app.post("/generate-batch-scripts")
async def generate_batch_scripts(requests: list[MetadataRequest]):
    """Generate multiple video scripts from a list of metadata."""
    results = []
    
    for request in requests:
        try:
            # Generate factual summary for deep dive
            factual_summary = None
            if request.artifact_type == "publication_deep_dive":
                factual_summary = script_generator._generate_factual_summary(request.metadata)
            
            # Create prompt from metadata
            prompt = script_generator._create_prompt(request.metadata, request.artifact_type, factual_summary)
            
            # Generate English script
            raw_script = script_generator._send_prompt_to_ollama(prompt)
            
            # Clean the script
            first_cue_position = raw_script.find('(')
            if first_cue_position != -1:
                script = raw_script[first_cue_position:]
            else:
                script = raw_script
            
            import re
            script = re.sub(r'\[.*?paragraph.*?\]', '', script, flags=re.IGNORECASE).strip()
            script = re.sub(r'\(Your visual cue here\)', '(Visual cue)', script, flags=re.IGNORECASE).strip()
            
            # Quality check
            qc_passed, qc_message = script_generator._quality_check(script)
            
            result = {
                "english_script": script,
                "qc_passed": qc_passed,
                "qc_message": qc_message,
                "arabic_translation_refined": None
            }
            
            # Translate if QC passed
            if qc_passed:
                try:
                    # Get initial translation
                    arabic_translation = script_generator.translate_to_arabic(script)
                    # Refine translation
                    refined_arabic = script_generator.refine_translation_with_ollama(arabic_translation)
                    result["arabic_translation_refined"] = refined_arabic
                except Exception as e:
                    result["arabic_translation_refined"] = f"Translation failed: {str(e)}"
            
            results.append({
                "metadata": request.metadata,
                "result": result
            })
            
        except Exception as e:
            results.append({
                "metadata": request.metadata,
                "result": {"error": f"Script generation failed: {str(e)}"}
            })
    
    return {"results": results}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8002) 