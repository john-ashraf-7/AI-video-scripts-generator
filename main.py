from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import json
import re
from AIScript import ScriptGenerator
from motor.motor_asyncio import AsyncIOMotorClient 
from bson import ObjectId

app = FastAPI(title="AI Video Script Generator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
db_password = "llt123"
db_username = "muhammad"
DATABASE_URL = f"mongodb+srv://{db_username}:{db_password}@cluster0.rtcxvzm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = AsyncIOMotorClient(DATABASE_URL)
# TODO: change the database name
db = client.get_database("metadata")
digital_collection = db.get_collection("Digital Collection")

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

@app.get("/gallery/books")
async def get_books(page: int = 1, limit: int = 20):
    """
    Get a paginated list of books.
    """
    try:
        skip = (page - 1) * limit
        books_cursor = digital_collection.find().skip(skip).limit(limit)
        books = await books_cursor.to_list(length=limit)
        for book in books:
            book["_id"] = str(book["_id"])
        return {"books": books, "page": page, "limit": limit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve books: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8002)
