from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
import json
import re
import os
from dotenv import load_dotenv
from AIScript import ScriptGenerator
from motor.motor_asyncio import AsyncIOMotorClient 
from bson import ObjectId
from tts_service import tts_service

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Video Script Generator API")

# Get configuration from environment variables
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
MONGODB_USERNAME = os.getenv("MONGODB_USERNAME")
MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD")
MONGODB_CLUSTER = os.getenv("MONGODB_CLUSTER")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "metadata")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION", "Digital Collection")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:8b")
BACKEND_HOST = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8002"))

# Validate required environment variables
if not MONGODB_USERNAME or not MONGODB_PASSWORD or not MONGODB_CLUSTER:
    raise ValueError("Missing required MongoDB environment variables. Please check your .env file.")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build MongoDB connection URL
DATABASE_URL = f"mongodb+srv://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@{MONGODB_CLUSTER}/?retryWrites=true&w=majority&appName=Cluster0"
client = AsyncIOMotorClient(DATABASE_URL)
db = client.get_database(MONGODB_DATABASE)
digital_collection = db.get_collection(MONGODB_COLLECTION)

# Initialize the script generator
script_generator = ScriptGenerator(ollama_model=OLLAMA_MODEL)


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


class RegenerateScriptRequest(BaseModel):
    original_metadata: dict
    artifact_type: str
    user_comments: str
    original_script: str


class AudioGenerationRequest(BaseModel):
    script: str
    voice_id: Optional[str] = "en_US-amy-low"
    output_filename: Optional[str] = None


class VoiceSelectionRequest(BaseModel):
    voice_id: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if the API and Ollama are running properly."""
    try:
        # Check if Ollama is accessible
        if script_generator._check_ollama_status():
            return HealthResponse(
                status="healthy",
                ollama_model=script_generator.ollama_model,
                message="API and Ollama are running",
            )
        else:
            return HealthResponse(
                status="unhealthy",
                ollama_model="unknown",
                message="Ollama server is not accessible",
            )
    except Exception as e:
        return HealthResponse(
            status="error", ollama_model="unknown", message=f"Error: {str(e)}"
        )


@app.post("/regenerate-script")
async def regenerate_script_with_comments(request: RegenerateScriptRequest):
    """Regenerate a script incorporating user comments."""
    try:
        # Create an enhanced prompt that includes the user comments
        enhanced_prompt = f"""
        Please regenerate the script for the following item, incorporating the user's comments.

        Original Metadata:
        {json.dumps(request.original_metadata, indent=2)}

        Original Script:
        {request.original_script}

        User Comments:
        {request.user_comments}

        Please create an improved version that addresses the user's comments while maintaining the original structure and purpose.
        """

        # Generate the new script using the enhanced prompt
        raw_script = script_generator._send_prompt_to_ollama(enhanced_prompt)
        script = script_generator._clean_raw_script(raw_script)
        
        qc_passed, qc_message = script_generator._quality_check(script)

        result = {
            "english_script": script,
            "qc_passed": qc_passed,
            "qc_message": qc_message,
            "arabic_translation_refined": None,
            "regenerated": True,
            "comments_incorporated": True
        }

        if qc_passed:
            try:
                arabic_translation = script_generator.translate_to_arabic(script)
                refined_arabic = script_generator.refine_translation_with_ollama(
                    arabic_translation
                )
                result["arabic_translation_refined"] = refined_arabic
            except Exception as e:
                result["arabic_translation_refined"] = f"Translation failed: {str(e)}"

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Script regeneration failed: {str(e)}"
        )


@app.get("/gallery")
async def get_gallery():
    """Get available items from the sample data for the gallery."""
    try:
        gallery_items = []
        with open("sample_data.jsonl", "r", encoding="utf-8") as f:
            content = f.read().strip()
            # Check if it's a JSON array or JSONL format
            if content.startswith("["):
                # It's a JSON array
                data = json.loads(content)
            else:
                # It's JSONL format - load line by line
                f.seek(0)
                data = []
                for line in f:
                    if line.strip():
                        data.append(json.loads(line.strip()))

            for i, item in enumerate(data):
                # Handle both old and new field names for backward compatibility
                title = item.get("Title", item.get("title", "No Title"))
                creator = item.get("Creator", item.get("creator", "Unknown"))
                date = item.get("Date", item.get("date", "Unknown"))
                description = item.get(
                    "Description", item.get("description", "No description")
                )
                call_number = item.get("Call number", item.get("call_number", "N/A"))

                # Clean up date field (remove trailing dashes and extra text)
                if date and isinstance(date, str):
                    date = date.replace("-", "").replace(
                        "date of publication not identified", "Unknown"
                    )
                    # Extract year from date strings like "1938-" or "1936"
                    year_match = re.search(r"\b(\d{4})\b", date)
                    if year_match:
                        date = year_match.group(1)

                gallery_items.append(
                    {
                        "id": i,
                        "title": title,
                        "creator": creator,
                        "date": date,
                        "description": description,
                        "call_number": call_number,
                    }
                )
        return {"items": gallery_items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load gallery: {str(e)}")


@app.post("/generate-script")
async def generate_script(request: MetadataRequest):
    """Generate a video script from metadata."""
    try:
        factual_summary = None
        if request.artifact_type == "publication_deep_dive":
            factual_summary = script_generator._generate_factual_summary(
                request.metadata
            )

        prompt = script_generator._create_prompt(
            request.metadata, request.artifact_type, factual_summary
        )

        raw_script = script_generator._send_prompt_to_ollama(prompt)

        # --- ✨ USE THE NEW, CENTRALIZED CLEANING METHOD ---
        script = script_generator._clean_raw_script(raw_script)

        qc_passed, qc_message = script_generator._quality_check(script)

        result = {
            "english_script": script,
            "qc_passed": qc_passed,
            "qc_message": qc_message,
            "arabic_translation_refined": None,
        }

        if qc_passed:
            try:
                arabic_translation = script_generator.translate_to_arabic(script)
                refined_arabic = script_generator.refine_translation_with_ollama(
                    arabic_translation
                )
                result["arabic_translation_refined"] = refined_arabic
            except Exception as e:
                result["arabic_translation_refined"] = f"Translation failed: {str(e)}"

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Script generation failed: {str(e)}"
        )


@app.post("/generate-batch-scripts")
async def generate_batch_scripts(requests: list[MetadataRequest]):
    """Generate multiple video scripts from a list of metadata."""
    results = []

    for request in requests:
        try:
            factual_summary = None
            if request.artifact_type == "publication_deep_dive":
                factual_summary = script_generator._generate_factual_summary(
                    request.metadata
                )

            prompt = script_generator._create_prompt(
                request.metadata, request.artifact_type, factual_summary
            )

            raw_script = script_generator._send_prompt_to_ollama(prompt)

            # --- ✨ USE THE NEW, CENTRALIZED CLEANING METHOD ---
            script = script_generator._clean_raw_script(raw_script)

            qc_passed, qc_message = script_generator._quality_check(script)

            result = {
                "english_script": script,
                "qc_passed": qc_passed,
                "qc_message": qc_message,
                "arabic_translation_refined": None,
            }

            if qc_passed:
                try:
                    arabic_translation = script_generator.translate_to_arabic(script)
                    refined_arabic = script_generator.refine_translation_with_ollama(
                        arabic_translation
                    )
                    result["arabic_translation_refined"] = refined_arabic
                except Exception as e:
                    result["arabic_translation_refined"] = (
                        f"Translation failed: {str(e)}"
                    )

            results.append({"metadata": request.metadata, "result": result})

        except Exception as e:
            results.append(
                {
                    "metadata": request.metadata,
                    "result": {"error": f"Script generation failed: {str(e)}"},
                }
            )

    return {"results": results}


@app.get("/gallery/books/{id}")
async def get_book(id: str):
    """
    Get the record for a specific student, looked up by `id`.
    """
    try: 
        if (book := await digital_collection.find_one({"_id": ObjectId(id)})) is not None:
            book["_id"] = str(book["_id"])
            return book
        raise HTTPException(status_code=404, detail=f"Student {id} not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")


@app.get("/tts/voices")
async def get_available_voices():
    """Get list of available TTS voices."""
    try:
        voices = tts_service.get_available_voices()
        return {"voices": voices}
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get available voices: {str(e)}"
        )


@app.post("/tts/set-voice")
async def set_voice(request: VoiceSelectionRequest):
    """Set the current TTS voice."""
    try:
        tts_service.set_voice(request.voice_id)
        return {
            "success": True,
            "message": f"Voice set to: {request.voice_id}",
            "voice_name": tts_service.voice_models[request.voice_id]["name"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set voice: {str(e)}"
        )


@app.post("/tts/generate-audio")
async def generate_audio(request: AudioGenerationRequest):
    """Generate audio from script text."""
    try:
        result = tts_service.generate_script_audio(
            script=request.script,
            voice_id=request.voice_id,
            output_filename=request.output_filename
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Audio generation failed: {result['error']}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Audio generation failed: {str(e)}"
        )


@app.get("/tts/download/{filename}")
async def download_audio(filename: str):
    """Download generated audio file."""
    try:
        file_path = f"audio_output/{filename}"
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail="Audio file not found"
            )
        
        # Determine media type based on file extension
        if filename.lower().endswith('.mp3'):
            media_type = "audio/mpeg"
        elif filename.lower().endswith('.wav'):
            media_type = "audio/wav"
        else:
            media_type = "audio/wav"  # Default
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=media_type
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download audio: {str(e)}"
        )


@app.post("/generate-script-with-audio")
async def generate_script_with_audio(request: MetadataRequest):
    """Generate a video script with audio from metadata."""
    try:
        # Generate script first
        factual_summary = None
        if request.artifact_type == "publication_deep_dive":
            factual_summary = script_generator._generate_factual_summary(
                request.metadata
            )

        prompt = script_generator._create_prompt(
            request.metadata, request.artifact_type, factual_summary
        )

        raw_script = script_generator._send_prompt_to_ollama(prompt)
        script = script_generator._clean_raw_script(raw_script)
        qc_passed, qc_message = script_generator._quality_check(script)

        result = {
            "english_script": script,
            "qc_passed": qc_passed,
            "qc_message": qc_message,
            "arabic_translation_refined": None,
            "audio_generated": False,
            "audio_info": None
        }

        # Generate Arabic translation if QC passed
        if qc_passed:
            try:
                arabic_translation = script_generator.translate_to_arabic(script)
                refined_arabic = script_generator.refine_translation_with_ollama(
                    arabic_translation
                )
                result["arabic_translation_refined"] = refined_arabic
            except Exception as e:
                result["arabic_translation_refined"] = f"Translation failed: {str(e)}"

        # Generate audio for the script
        try:
            audio_result = tts_service.generate_script_audio(script=script)
            if audio_result["success"]:
                result["audio_generated"] = True
                result["audio_info"] = audio_result
            else:
                result["audio_info"] = {"error": audio_result["error"]}
        except Exception as e:
            result["audio_info"] = {"error": f"Audio generation failed: {str(e)}"}

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Script and audio generation failed: {str(e)}"
        )


# In your main.py FastAPI backend
@app.get("/gallery/books")
async def get_books(
    page: int = 1,
    limit: int = 20,
    sort: str = None,              # sort key
    searchQuery: str = None,       # search input
    searchIn: str = "All Fields"   # field to search in
):
    try:
        skip = (page - 1) * limit
        query = {}

        # SEARCH HANDLING
        if searchQuery:
            regex = {"$regex": searchQuery, "$options": "i"}  # case-insensitive

            if searchIn == "All Fields":
                fields = [
                    "Title", "Title (English)", "Title (Arabic)", "Creator", "Creator (Arabic)",
                    "Description", "Subject", "Type", "Collection", "Language",
                    "Call number", "Date", "Notes"
                ]
                query["$or"] = [{f: regex} for f in fields]

            elif searchIn == "Title":
                # Search in hierarchy: Title -> Title (English) -> Title (Arabic)
                query["$or"] = [
                    {"Title": regex},
                    {"Title (English)": regex},
                    {"Title (Arabic)": regex}
                ]

            elif searchIn == "Creator":
                query["$or"] = [
                    {"Creator": regex},
                    {"Creator (Arabic)": regex}
                ]

            else:
                query[searchIn] = regex

        # SORTING
        sort_map = {
            "Title A-Z": {"field": "sortTitle", "dir": 1},
            "Creator A-Z": {"field": "sortCreator", "dir": 1},
            "Year oldest first": {"field": "Date", "dir": 1},
            "Year newest first": {"field": "Date", "dir": -1}
        }

        if sort in ["Title A-Z", "Creator A-Z"]:
            pipeline = [
                {"$match": query},
                {
                    "$addFields": {
                        "sortTitle": {
                            "$toLower": {
                                "$cond": [
                                    {"$and": [{"$ne": ["$Title", None]}, {"$ne": ["$Title", ""]}]},
                                    "$Title",
                                    {
                                        "$cond": [
                                            {"$and": [{"$ne": ["$Title (English)", None]}, {"$ne": ["$Title (English)", ""]}]},
                                            "$Title (English)",
                                            {"$ifNull": ["$Title (Arabic)", ""]}
                                        ]
                                    }
                                ]
                            }
                        },
                        "sortCreator": {
                            "$toLower": {
                                "$cond": [
                                    {"$and": [{"$ne": ["$Creator", None]}, {"$ne": ["$Creator", ""]}]},
                                    "$Creator",
                                    {"$ifNull": ["$Creator (Arabic)", ""]}
                                ]
                            }
                        }
                    }
                },
                {"$sort": {sort_map[sort]["field"]: sort_map[sort]["dir"]}},
                {"$skip": skip},
                {"$limit": limit}
            ]

            books_cursor = digital_collection.aggregate(pipeline)
            books = await books_cursor.to_list(length=limit)

        else:
            # Other sorts or default
            sort_field, sort_dir = ("_id", 1)
            if sort in sort_map:
                sort_field = sort_map[sort]["field"]
                sort_dir = sort_map[sort]["dir"]

            books_cursor = (
                digital_collection
                .find(query)
                .sort(sort_field, sort_dir)
                .skip(skip)
                .limit(limit)
            )
            books = await books_cursor.to_list(length=limit)

        total_count = await digital_collection.count_documents(query)

        for b in books:
            b["_id"] = str(b["_id"])

        return {
            "books": books,
            "page": page,
            "limit": limit,
            "total": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
    
if __name__ == "__main__":
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
