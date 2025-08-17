#%%
# --- Dependencies ---
# Before running, please ensure you have installed the necessary libraries.
# You can install them using pip:
#
# pip install pandas
# pip install requests
# pip install transformers
# pip install torch
# pip install sentencepiece
# pip install sacremoses
#

import requests
import json
import os
import tempfile
import sys
import re
import difflib

# Set temporary directory to avoid PyTorch issues
os.environ['TMPDIR'] = os.path.expanduser('~/tmp')
os.makedirs(os.path.expanduser('~/tmp'), exist_ok=True)

# --- Direct Import for Debugging ---
try:
    import torch
    print("--- PyTorch Check: Successfully imported torch. ---")
except ImportError as e:
    print(f"--- PyTorch Check: FAILED to import torch at startup. ---")
    print(f"--- Detailed Error: {e}")
    print("--- Please ensure torch is correctly installed in the interpreter being used. ---")
    sys.exit(1)

try:
    from transformers import MarianMTModel, MarianTokenizer
    TRANSLATION_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Translation models not available: {e}")
    TRANSLATION_AVAILABLE = False
    MarianMTModel = None
    MarianTokenizer = None


# For Ollama, ensure the server is running in another terminal tab
# In your terminal, you can run:
# ollama serve
# To check if it's running, you can use:
# curl http://localhost:11434

class ScriptGenerator:
    """
    An engine to generate video scripts from metadata, with support for
    multiple prompt templates, metadata sources, quality control, and translation.
    """

    def __init__(self, ollama_model="llama3:8b", ollama_api_url="http://localhost:11434/api/generate"):
        self.ollama_model = ollama_model
        self.ollama_api_url = ollama_api_url
        # Translation components can be kept or removed as needed
        self.translation_model_name = 'Helsinki-NLP/opus-mt-en-ar'
        self.translation_model = None
        self.translation_tokenizer = None

        self.prompt_templates = {
            # --- ✨ NEW, MORE STRICT PROMPT ---
            "publication_deep_dive": (
                "You are a professional scriptwriter. Your only job is to produce a clean, ready-to-use video script based on the information below. "
                "The script MUST be exactly 3 paragraphs. Each paragraph MUST be preceded by a visual cue in parentheses, like `(A shot of the book cover)`."
                "\n\n**CRITICAL RULES:**"
                "\n1. **NO EXTRA TEXT:** Your response MUST start DIRECTLY with the first visual cue. Do NOT include titles, headings, preambles, or markdown (`**`, `#`)."
                "\n2. **USE PROVIDED INFO ONLY:** Base the entire script on the 'Source Information' provided. Do not invent facts or use outside knowledge."
                "\n3. **EXACTLY 3 PARAGRAPHS:** You must produce exactly 3 paragraphs separated by double newlines."
                "\n4. **VISUAL CUES:** Each paragraph must start with a visual cue in parentheses."
                "\n5. **STRUCTURE:** Paragraph 1 = Introduction, Paragraph 2 = Body/Details, Paragraph 3 = Conclusion."
                "\n\n--- Source Information ---\n"
                "{factual_summary}"
                "\n--- End of Information ---"
            ),
            "photograph": (
                "You are a scriptwriter for short museum videos. Generate a short, engaging 3-paragraph video script for a historical photograph. "
                "Your response must be ONLY the script itself. Start DIRECTLY with a visual cue in parentheses. Do NOT use markdown."
                "\n\nContext: This photograph, titled '{title}', was taken by {creator} around {date}.\n"
                "Description: The photo captures the following scene: {description}\n"
                "Narrative Hook: Generate a compelling narrative that speculates on the story behind the image and its significance."
            ),
            "publication": (
                "You are a scriptwriter for short museum videos. Generate a short, engaging 3-paragraph video script based on the following information. "
                "Your response must be ONLY the script itself. Start DIRECTLY with a visual cue in parentheses. Do NOT use markdown."
                "\n\nIntro: From the library's digital archives, we bring you a publication by {creator}, dated {date}.\n"
                "Body: Titled '{title}', this item details the following: {description}\n"
                "Conclusion: This publication offers a unique insight into its subject."
            ),
            "default": (
                "You are a scriptwriter. Generate a short, engaging 3-paragraph video script based on this item: "
                "Title: {title}, Creator: {creator}, Date: {date}, Description: {description}. "
                "Start DIRECTLY with a visual cue."
            )
        }

    def _clean_raw_script(self, raw_script: str) -> str:
        """
        Cleans the raw LLM output by removing preambles, markdown, and extra comments.
        """
        # Find the first visual cue, which can be in parentheses or brackets.
        pos1 = raw_script.find('(')
        pos2 = raw_script.find('[')

        start_pos = -1
        if pos1 != -1 and pos2 != -1:
            start_pos = min(pos1, pos2)
        elif pos1 != -1:
            start_pos = pos1
        elif pos2 != -1:
            start_pos = pos2
        
        # If a cue is found, slice the script from that point.
        if start_pos != -1:
            script = raw_script[start_pos:]
        else:
            script = raw_script  # Keep original if no cue is found, QC will catch it

        # Remove markdown, placeholders, and extra whitespace.
        script = re.sub(r'\*\*', '', script)  # Remove bold markdown
        script = re.sub(r'\[.*?paragraph.*?\]', '', script, flags=re.IGNORECASE)
        script = re.sub(r'\(Your visual cue here\)', '(Visual cue)', script, flags=re.IGNORECASE)
        
        # Remove common AI-generated comments and annotations
        script = re.sub(r'^.*?(?:Here is|Here\'s|This is|I have|Generated|Script:|Translation:).*?\n', '', script, flags=re.IGNORECASE | re.MULTILINE)
        script = re.sub(r'^.*?(?:improved|refined|corrected|enhanced).*?\n', '', script, flags=re.IGNORECASE | re.MULTILINE)
        script = re.sub(r'^.*?(?:Note:|Comment:|Feedback:|Suggestion:).*?\n', '', script, flags=re.IGNORECASE | re.MULTILINE)
        
        # Remove any lines that are just commentary (not actual script content)
        lines = script.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith(('Note:', 'Comment:', 'Feedback:', 'Suggestion:', 'Here is', 'Here\'s', 'This is')):
                # Check if line contains actual script content (visual cues or meaningful text)
                if line.startswith('(') or line.startswith('[') or len(line) > 10:
                    cleaned_lines.append(line)
        
        # Preserve paragraph structure by ensuring proper spacing
        script = '\n\n'.join(cleaned_lines)
        
        # Ensure we have proper paragraph separation for the 3-paragraph structure
        # Look for visual cues and ensure they start new paragraphs
        script = re.sub(r'\n([(][^)]+[)])\n', r'\n\n\1\n', script)
        
        # Validate and fix the 3-paragraph structure
        script = self._ensure_three_paragraph_structure(script)
        
        return script.strip()

    def _ensure_three_paragraph_structure(self, script: str) -> str:
        """
        Ensures the script has exactly 3 paragraphs with visual cues.
        """
        # Split by double newlines to get paragraphs
        paragraphs = [p.strip() for p in script.split('\n\n') if p.strip()]
        
        # Count visual cues
        visual_cues = re.findall(r'\([^)]+\)', script)
        
        print(f"   - Found {len(paragraphs)} paragraphs and {len(visual_cues)} visual cues")
        
        # If we have exactly 3 visual cues but wrong paragraph count, fix it
        if len(visual_cues) == 3 and len(paragraphs) != 3:
            print(f"   - Fixing paragraph structure: {len(paragraphs)} paragraphs -> 3 paragraphs")
            # Split by visual cues to create proper paragraphs
            parts = re.split(r'\([^)]+\)', script)
            cues = re.findall(r'\([^)]+\)', script)
            
            fixed_paragraphs = []
            for i, cue in enumerate(cues):
                if i < len(parts) - 1:
                    # Get the text after this cue (before the next cue)
                    text_after_cue = parts[i + 1].strip()
                    # Remove any leading/trailing whitespace and newlines
                    text_after_cue = re.sub(r'^\s*\n+', '', text_after_cue)
                    text_after_cue = re.sub(r'\n+\s*$', '', text_after_cue)
                    
                    paragraph = cue + '\n' + text_after_cue
                    fixed_paragraphs.append(paragraph)
            
            if len(fixed_paragraphs) == 3:
                script = '\n\n'.join(fixed_paragraphs)
                print(f"   - Successfully fixed to 3 paragraphs")
        
        # If we still don't have 3 paragraphs, try to force the structure
        if len(paragraphs) != 3:
            print(f"   - Warning: Script does not have exactly 3 paragraphs. Attempting to fix...")
            # Try to identify the three main sections and force the structure
            if len(visual_cues) >= 3:
                # Use the first 3 visual cues to create the structure
                script = self._force_three_paragraph_structure(script, visual_cues[:3])
        
        return script

    def _force_three_paragraph_structure(self, script: str, cues: list) -> str:
        """
        Forces the script into a 3-paragraph structure using the provided visual cues.
        """
        # Split the script by the visual cues
        parts = re.split(r'\([^)]+\)', script)
        
        # Create the three paragraphs
        paragraphs = []
        for i, cue in enumerate(cues):
            if i < len(parts) - 1:
                text_content = parts[i + 1].strip()
                # Clean up the text content
                text_content = re.sub(r'^\s*\n+', '', text_content)
                text_content = re.sub(r'\n+\s*$', '', text_content)
                
                paragraph = cue + '\n' + text_content
                paragraphs.append(paragraph)
        
        return '\n\n'.join(paragraphs)


    def _check_ollama_status(self):
        """
        --- Pre-flight Check 1 ---
        Checks if the Ollama server is running and accessible.
        """
        print("--- Pre-flight Check: Verifying Ollama Connection ---")
        try:
            base_url = self.ollama_api_url.replace("/api/generate", "")
            response = requests.get(base_url, timeout=5)
            response.raise_for_status()
            print(f"   - Success: Ollama server is responsive at {base_url}.")
            return True
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
            print("   - [FATAL] Could not connect to Ollama.")
            print("   - ACTION: Please ensure the Ollama application is running on your machine.")
            return False
        except requests.exceptions.RequestException as e:
            print(f"   - [FATAL] An unexpected error occurred while checking Ollama status: {e}")
            return False

    def _check_available_models(self):
        """
        --- Pre-flight Check 2 ---
        Checks if the required Ollama model is available locally.
        """
        print("--- Pre-flight Check: Verifying Ollama Models ---")
        try:
            tags_url = self.ollama_api_url.replace("/api/generate", "/api/tags")
            response = requests.get(tags_url, timeout=10)
            response.raise_for_status()
            models_data = response.json()
            
            available_models = [model['name'] for model in models_data.get('models', [])]
            
            if not available_models:
                print(f"   - [FATAL] No models found in your local Ollama instance.")
                print(f"   - ACTION: Please pull a model by running 'ollama pull {self.ollama_model}' in your terminal.")
                return False

            print(f"   - Available models: {', '.join(available_models)}")

            if self.ollama_model in available_models:
                print(f"   - Success: Required model '{self.ollama_model}' is available.")
                return True
            else:
                # Let's try to find a similar model if the exact one is not found
                base_model_name = self.ollama_model.split(':')[0]
                similar_models = [m for m in available_models if m.startswith(base_model_name)]
                if similar_models:
                    print(f"   - [WARNING] Required model '{self.ollama_model}' not found. Using '{similar_models[0]}' instead.")
                    self.ollama_model = similar_models[0]
                    return True
                else:
                    print(f"   - [FATAL] Required model '{self.ollama_model}' is not available locally.")
                    print(f"   - ACTION: Please run 'ollama pull {self.ollama_model}' in your terminal.")
                    return False

        except requests.exceptions.RequestException as e:
            print(f"   - [FATAL] Could not get model list from Ollama: {e}")
            return False

    def _get_metadata_from_json(self, file_path, row_indices):
        print(f"\n1. Parsing metadata from '{file_path}' for rows: {row_indices}...")
        metadata_list = []
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"The file was not found at the specified path: {file_path}")
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            for index in row_indices:
                if not (0 <= index < len(lines)):
                    print(f"   - [WARNING] Row index {index} is out of bounds. Skipping.")
                    continue
                try:
                    item = json.loads(lines[index])
                    metadata = {
                        # Basic identification
                        "identifier": item.get('Call number', item.get('identi', f'Row_{index}')),
                        "title": item.get('Title', item.get('Title (English)', 'No Title Available')),
                        "title_arabic": item.get('Title (Arabic)', ''),
                        "creator": item.get('Creator', 'Unknown Author'),
                        "creator_arabic": item.get('Creator (Arabic)', ''),
                        "date": str(item.get('Date', 'No Date Available')),
                        "description": item.get('Description', item.get('Description (English)', 'No description provided.')),
                        
                        # Publication details
                        "publisher": item.get('Publisher', ''),
                        "location": item.get('Location', ''),
                        "location_governorate": item.get('Location-Governorate (English)', ''),
                        "location_governorate_arabic": item.get('Location-Governorate (Arabic)', ''),
                        "location_country": item.get('Location-Country (English)', ''),
                        "location_country_arabic": item.get('Location-Country (Arabic)', ''),
                        
                        # Academic/scholarly context
                        "subject": item.get('Subject', ''),
                        "subject_lc": item.get('Subject LC', ''),
                        "language": item.get('Language', ''),
                        "genre": item.get('Genre (AAT)', ''),
                        "type": item.get('Type', ''),
                        "keywords_english": item.get('Keywords (English)', ''),
                        "keywords_arabic": item.get('Keywords (Arabic)', ''),
                        
                        # Collection and institutional context
                        "collection": item.get('Collection', ''),
                        "source": item.get('Source', ''),
                        "medium": item.get('Medium', ''),
                        
                        # Special fields for maps and other formats
                        "scale": item.get('Scale', ''),
                        "format": item.get('Format', ''),
                        "coverage_spatial": item.get('Coverage-Spatial/Note', ''),
                        
                        # Rights and access
                        "rights": item.get('Rights', ''),
                        "access_rights": item.get('Access Rights', ''),
                        "license": item.get('License', ''),
                        "call_number": item.get('Call number', ''),
                        "catalogue_link": item.get('Link to catalogue', ''),
                        
                        # Additional context
                        "notes": item.get('Notes', ''),
                        "image_url": item.get('Image URL', ''),
                        
                        # Preserve all original fields for comprehensive access
                        "raw_data": item
                    }
                    print(f"   - Successfully parsed comprehensive metadata for: {metadata['title']}")
                    metadata_list.append(metadata)
                except json.JSONDecodeError:
                    print(f"   - [ERROR] Could not decode JSON from row {index}. Skipping.")
            return metadata_list
        except Exception as e:
            print(f"   - [ERROR] An unexpected error occurred while reading the JSON file: {e}")
            return []

    def _get_default_metadata(self, reason="No data source provided."):
        """Returns a default metadata object when real data can't be fetched."""
        print(f"   - [WARNING] Could not fetch metadata: {reason}")
        return {
            # Basic identification
            "identifier": "N/A", 
            "title": "No Title", 
            "title_arabic": "",
            "creator": "Unknown",
            "creator_arabic": "",
            "date": "Unknown", 
            "description": "No description available.",
            
            # Publication details
            "publisher": "",
            "location": "",
            "location_governorate": "",
            "location_governorate_arabic": "",
            "location_country": "",
            "location_country_arabic": "",
            
            # Academic/scholarly context
            "subject": "",
            "subject_lc": "",
            "language": "",
            "genre": "",
            "type": "",
            "keywords_english": "",
            "keywords_arabic": "",
            
            # Collection and institutional context
            "collection": "",
            "source": "",
            "medium": "",
            
            # Special fields
            "scale": "",
            "format": "",
            "coverage_spatial": "",
            
            # Rights and access
            "rights": "",
            "access_rights": "",
            "license": "",
            "call_number": "",
            "catalogue_link": "",
            
            # Additional context
            "notes": "",
            "image_url": "",
            
            # Raw data
            "raw_data": {}
        }

    def _send_prompt_to_ollama(self, prompt, timeout=60):
        """Generic function to send any prompt to the Ollama API."""
        payload = {"model": self.ollama_model, "prompt": prompt, "stream": False}
        try:
            response = requests.post(self.ollama_api_url, json=payload, timeout=timeout)
            response.raise_for_status()
            response_data = response.json()
            return response_data.get('response', 'Error: Could not parse response from Ollama.')
        except requests.exceptions.HTTPError as e:
            error_message = f"[FATAL ERROR] An HTTP error occurred: {e}"
            if e.response.status_code == 404:
                error_message += f"\n   - This confirms model '{self.ollama_model}' is not on the server. Please pull it."
            return error_message
        except requests.exceptions.RequestException as e:
            return f"[FATAL ERROR] A connection error occurred: {e}"

    def _fetch_book_details_from_api(self, metadata, api_key="AIzaSyDGtQmOvuR8akfp8NqXoITm5_AVjFFp48A"):
        """
        Fetches book info from the Google Books API and intelligently selects
        the best match instead of just the first result.
        """
        print("   - Step B: Querying Google Books API for verified facts...")
        query = f"intitle:{metadata['title']}+inauthor:{metadata['creator']}"
        api_url = f"https://www.googleapis.com/books/v1/volumes?q={query}&key={api_key}"

        try:
            response = requests.get(api_url, timeout=10)
            response.raise_for_status()
            data = response.json()

            if "items" not in data or not data["items"]:
                print("     - API Warning: No books found matching the query.")
                return None

            # --- INTELLIGENT MATCHING LOGIC ---
            best_match_item = None
            highest_score = 0.0
            original_title = metadata['title']

            for item in data["items"]:
                volume_info = item.get("volumeInfo", {})
                api_title = volume_info.get("title", "")
                if not api_title:
                    continue

                # Calculate the similarity between the original title and the API title
                similarity_score = difflib.SequenceMatcher(None, original_title.lower(), api_title.lower()).ratio()

                if similarity_score > highest_score:
                    highest_score = similarity_score
                    best_match_item = item

            # Set a threshold to ensure the match is relevant and not just random
            SIMILARITY_THRESHOLD = 0.6

            if best_match_item and highest_score >= SIMILARITY_THRESHOLD:
                book_info = best_match_item["volumeInfo"]
                print(f"     - Success: Found best match '{book_info.get('title')}' with score {highest_score:.2f}")

                facts = {
                    "api_title": book_info.get("title", "N/A"),
                    "api_authors": ", ".join(book_info.get("authors", [])),
                    "api_publisher": book_info.get("publisher", "N/A"),
                    "api_published_date": book_info.get("publishedDate", "N/A"),
                    "api_description": book_info.get("description", "No description from API."),
                    "api_page_count": book_info.get("pageCount", "N/A"),
                    "api_categories": ", ".join(book_info.get("categories", [])),
                }
                return facts
            else:
                print(f"     - API Warning: No close match found. Best score was {highest_score:.2f}.")
                return None

        except requests.exceptions.RequestException as e:
            print(f"     - API Error: Could not connect to Google Books API. {e}")
            return None

    def _generate_factual_summary(self, metadata: dict) -> str:
        """
        Creates a comprehensive factual summary from all available metadata fields.
        This method utilizes the rich metadata to provide detailed context.
        """
        print("2. Generating Enhanced Factual Summary (from all metadata fields)...")
        
        # Build comprehensive summary using all available fields
        summary_parts = []
        
        # Basic identification
        title = metadata.get('title', metadata.get('Title', 'N/A'))
        title_arabic = metadata.get('title_arabic', metadata.get('Title (Arabic)', ''))
        summary_parts.append(f"Title: {title}")
        if title_arabic:
            summary_parts.append(f"Arabic Title: {title_arabic}")
        
        # Creator information
        creator = metadata.get('creator', metadata.get('Creator', 'N/A'))
        creator_arabic = metadata.get('creator_arabic', metadata.get('Creator (Arabic)', ''))
        summary_parts.append(f"Creator/Author: {creator}")
        if creator_arabic:
            summary_parts.append(f"Arabic Creator: {creator_arabic}")
        
        # Publication details
        date = metadata.get('date', metadata.get('Date', 'N/A'))
        publisher = metadata.get('publisher', metadata.get('Publisher', ''))
        location = metadata.get('location', metadata.get('Location', ''))
        location_governorate = metadata.get('location_governorate', metadata.get('Location-Governorate (English)', ''))
        location_country = metadata.get('location_country', metadata.get('Location-Country (English)', ''))
        
        summary_parts.append(f"Date: {date}")
        if publisher:
            summary_parts.append(f"Publisher: {publisher}")
        if location:
            summary_parts.append(f"Location: {location}")
        if location_governorate:
            summary_parts.append(f"Governorate: {location_governorate}")
        if location_country:
            summary_parts.append(f"Country: {location_country}")
        
        # Content description
        description = metadata.get('description', metadata.get('Description', 'No description provided.'))
        summary_parts.append(f"Description: {description}")
        
        # Academic/scholarly context
        subject = metadata.get('subject', metadata.get('Subject', ''))
        subject_lc = metadata.get('subject_lc', metadata.get('Subject LC', ''))
        language = metadata.get('language', metadata.get('Language', ''))
        genre = metadata.get('genre', metadata.get('Genre (AAT)', ''))
        type_info = metadata.get('type', metadata.get('Type', ''))
        keywords_english = metadata.get('keywords_english', metadata.get('Keywords (English)', ''))
        keywords_arabic = metadata.get('keywords_arabic', metadata.get('Keywords (Arabic)', ''))
        
        if subject:
            summary_parts.append(f"Subject: {subject}")
        if subject_lc:
            summary_parts.append(f"Subject Classification: {subject_lc}")
        if language:
            summary_parts.append(f"Language: {language}")
        if genre:
            summary_parts.append(f"Genre: {genre}")
        if type_info:
            summary_parts.append(f"Type: {type_info}")
        if keywords_english:
            summary_parts.append(f"Keywords (English): {keywords_english}")
        if keywords_arabic:
            summary_parts.append(f"Keywords (Arabic): {keywords_arabic}")
        
        # Collection and institutional context
        collection = metadata.get('collection', metadata.get('Collection', ''))
        source = metadata.get('source', metadata.get('Source', ''))
        medium = metadata.get('medium', metadata.get('Medium', ''))
        
        if collection:
            summary_parts.append(f"Collection: {collection}")
        if source:
            summary_parts.append(f"Source Institution: {source}")
        if medium:
            summary_parts.append(f"Medium: {medium}")
        
        # Special fields for maps and other formats
        scale = metadata.get('scale', metadata.get('Scale', ''))
        format_type = metadata.get('format', metadata.get('Format', ''))
        coverage = metadata.get('coverage_spatial', metadata.get('Coverage-Spatial/Note', ''))
        
        if scale:
            summary_parts.append(f"Scale: {scale}")
        if format_type:
            summary_parts.append(f"Format: {format_type}")
        if coverage:
            summary_parts.append(f"Geographic Coverage: {coverage}")
        
        # Rights and access
        rights = metadata.get('rights', metadata.get('Rights', ''))
        access_rights = metadata.get('access_rights', metadata.get('Access Rights', ''))
        license_info = metadata.get('license', metadata.get('License', ''))
        call_number = metadata.get('call_number', metadata.get('Call number', ''))
        catalogue_link = metadata.get('catalogue_link', metadata.get('Link to catalogue', ''))
        
        if rights:
            summary_parts.append(f"Rights: {rights}")
        if access_rights:
            summary_parts.append(f"Access Rights: {access_rights}")
        if license_info:
            summary_parts.append(f"License: {license_info}")
        if call_number:
            summary_parts.append(f"Call Number: {call_number}")
        if catalogue_link:
            summary_parts.append(f"Catalogue Link: {catalogue_link}")
        
        # Additional context
        notes = metadata.get('notes', metadata.get('Notes', ''))
        image_url = metadata.get('image_url', metadata.get('Image URL', ''))
        
        if notes:
            summary_parts.append(f"Additional Notes: {notes}")
        if image_url:
            summary_parts.append(f"Image Available: {image_url}")
        
        summary = "\n".join(summary_parts)
        print(f"   - Enhanced factual summary created with {len(summary_parts)} metadata fields.")
        return summary

    def _create_prompt(self, metadata, artifact_type="publication_deep_dive", factual_summary=None):
        """Creates the final prompt, injecting the factual summary if available."""
        print("3. Creating final script prompt...")
        template = self.prompt_templates.get(artifact_type)
        if not template:
            return f"Generate a script for {metadata['title']}"

        # This logic remains the same, but the factual_summary is now guaranteed
        # to be from your metadata only.
        if artifact_type == "publication_deep_dive" and factual_summary:
            metadata_with_summary = metadata.copy()
            metadata_with_summary['factual_summary'] = factual_summary
            prompt = template.format(**metadata_with_summary)
        else:
            prompt = template.format(**metadata)
            
        print(f"   - Using template for artifact type: '{artifact_type}'")
        return prompt

    def _quality_check(self, script_text: str):
        """Performs basic checks on the cleaned script."""
        if not script_text or "error" in script_text.lower() or len(script_text.strip()) < 10:
            return False, "QC Failed: Generation returned an empty or error-like response."
        
        if len(script_text.split()) < 20:
            return False, f"QC Failed: Generated script is too short (words: {len(script_text.split())})."
        
        # Check if the cleaned script starts correctly.
        if not (script_text.startswith('(') or script_text.startswith('[')):
            return False, "QC Failed: Script does not start with a visual cue like `()` or `[]`."
        
        return True, "Quality check passed."
    
    def refine_translation_with_ollama(self, arabic_text):
        """Takes a machine-translated Arabic script and uses an LLM to refine it."""
        print("\n7. Refining translation with Ollama LLM...")
        refinement_prompt = (
            "You are an expert Arabic language editor. Your ONLY job is to fix awkward wording and grammar errors in the Arabic text below. "
            "CRITICAL RULES:\n"
            "1. DO NOT add, remove, or change any visual cues in parentheses like (A shot of the book cover)\n"
            "2. DO NOT add extra sentences, words, or content\n"
            "3. DO NOT change the paragraph structure or number of paragraphs\n"
            "4. DO NOT add introductions, conclusions, or commentary\n"
            "5. ONLY fix grammar mistakes and awkward Arabic phrasing\n"
            "6. Keep the exact same meaning and length\n"
            "7. Your response must start DIRECTLY with the corrected Arabic text\n"
            "8. DO NOT add any notes, comments, or explanations\n"
            "9. DO NOT say 'Here is the improved version' or similar phrases\n"
            "10. Start immediately with the first visual cue or Arabic text\n"
            "11. PRESERVE ALL CONTENT - do not truncate or cut off any part of the text\n"
            "12. Ensure the complete script is returned with all paragraphs intact\n\n"
            f"Text to refine:\n{arabic_text}"
        )
        
        response_text = self._send_prompt_to_ollama(refinement_prompt, timeout=90)
        
        # Clean the response to ensure it starts directly with the Arabic text
        cleaned_response = response_text.strip()
        
        # Remove any potential preambles or labels
        lines = cleaned_response.split('\n')
        
        # Find the first line that contains Arabic text or visual cue
        start_index = 0
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            # Skip lines that are just commentary or explanations
            if (line_stripped.startswith('(') or 
                any(ord(char) > 127 for char in line_stripped) or
                (len(line_stripped) > 10 and not line_stripped.lower().startswith(('here is', 'here\'s', 'this is', 'note:', 'comment:', 'improved', 'refined')))):
                start_index = i
                break
        
        final_text = '\n'.join(lines[start_index:]).strip()
        
        # More conservative cleaning - only remove obvious commentary lines
        final_lines = final_text.split('\n')
        cleaned_lines = []
        for line in final_lines:
            line_stripped = line.strip()
            # Only remove lines that are clearly commentary, not actual content
            if (line_stripped and 
                not line_stripped.lower().startswith(('note:', 'comment:', 'feedback:', 'suggestion:')) and
                not line_stripped.lower().startswith(('here is the', 'here\'s the', 'this is the')) and
                not (len(line_stripped) < 5 and line_stripped.lower() in ['improved', 'refined', 'corrected'])):
                cleaned_lines.append(line)
        
        final_text = '\n\n'.join(cleaned_lines).strip()
        
        # Ensure proper paragraph separation for the 3-paragraph structure
        # Look for visual cues and ensure they start new paragraphs
        final_text = re.sub(r'\n([(][^)]+[)])\n', r'\n\n\1\n', final_text)
        
        print("   - Refinement with Ollama successful.")
        return final_text

    def translate_to_arabic(self, script_text):
        """Translates the given English text to Arabic paragraph by paragraph, preserving visual cues."""
        print("\n6. Translating to Arabic...")
        try:
            if self.translation_model is None or self.translation_tokenizer is None:
                print("   - Loading translation model for the first time... (This may take a moment)")
                self.translation_tokenizer = MarianTokenizer.from_pretrained(self.translation_model_name)
                self.translation_model = MarianMTModel.from_pretrained(self.translation_model_name)
                print("   - Translation model loaded.")

            # Split by double newlines to preserve paragraph structure
            paragraphs = script_text.strip().split('\n\n')
            translated_paragraphs = []
            print(f"   - Translating {len(paragraphs)} paragraph(s)...")
            
            # Ensure we have exactly 3 paragraphs for the standard format
            if len(paragraphs) < 3:
                print(f"   - Warning: Found {len(paragraphs)} paragraphs, expected 3. Attempting to fix structure...")
                # Try to split by visual cues if paragraphs are not properly separated
                if len(paragraphs) == 1:
                    # Split the single paragraph by visual cues
                    content = paragraphs[0]
                    visual_cue_pattern = r'\([^)]+\)'
                    cues = re.findall(visual_cue_pattern, content)
                    if len(cues) >= 3:
                        # Split by visual cues to create proper paragraphs
                        parts = re.split(visual_cue_pattern, content)
                        paragraphs = []
                        for i, cue in enumerate(cues):
                            if i < len(parts) - 1:
                                paragraph = cue + parts[i + 1].strip()
                                paragraphs.append(paragraph)
            
            for i, p in enumerate(paragraphs):
                if not p.strip():
                    continue
                
                print(f"     - Translating paragraph {i+1}...")
                
                # Check if paragraph starts with visual cue
                visual_cue = ""
                text_to_translate = p.strip()
                
                # Extract visual cue if present (starts with parenthesis)
                if text_to_translate.startswith('(') and ')' in text_to_translate:
                    cue_end = text_to_translate.find(')') + 1
                    visual_cue = text_to_translate[:cue_end]
                    text_to_translate = text_to_translate[cue_end:].strip()
                
                # Translate only the text content, not the visual cue
                if text_to_translate:
                    # Split long text into smaller chunks if needed
                    if len(text_to_translate) > 400:
                        # Split by sentences for very long paragraphs
                        sentences = text_to_translate.split('. ')
                        translated_sentences = []
                        for sentence in sentences:
                            if sentence.strip():
                                inputs = self.translation_tokenizer(sentence, return_tensors="pt", padding=True, truncation=True, max_length=256)
                                translated_ids = self.translation_model.generate(**inputs)
                                translated_sentence = self.translation_tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]
                                translated_sentences.append(translated_sentence)
                        translated_text = '. '.join(translated_sentences)
                    else:
                        inputs = self.translation_tokenizer(text_to_translate, return_tensors="pt", padding=True, truncation=True, max_length=512)
                        translated_ids = self.translation_model.generate(**inputs)
                        translated_text = self.translation_tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]
                    
                    # Combine visual cue with translated text
                    if visual_cue:
                        translated_p = visual_cue + "\n" + translated_text
                    else:
                        translated_p = translated_text
                        
                    translated_paragraphs.append(translated_p)
            
            full_translation = "\n\n".join(translated_paragraphs)
            print("   - Translation successful.")
            return full_translation
        except Exception as e:
            return f"[ERROR] Could not perform translation due to an unexpected error: {e}"

    def run_pipeline(self, source_path, artifact_type="publication_deep_dive", row_indices=None):
        if row_indices is None:
            row_indices = [0]
        print("--- Starting Script Generation Pipeline ---\n")

        if not self._check_ollama_status() or not self._check_available_models():
            print("\n--- Pipeline Halted due to pre-flight check failure. ---")
            return

        all_metadata = self._get_metadata_from_json(source_path, row_indices)
        if not all_metadata:
            print("\n--- Pipeline Halted: Could not retrieve any valid metadata. ---")
            return
        
        output_dir = "results"
        os.makedirs(output_dir, exist_ok=True)

        for i, metadata in enumerate(all_metadata):
            print(f"\n\n{'='*20} Processing Object {i+1}/{len(all_metadata)}: '{metadata.get('title', 'N/A')}' {'='*20}")

            factual_summary = None
            if artifact_type == "publication_deep_dive":
                print("2. Generating Factual Summary (for improved accuracy)...")
                factual_summary = self._generate_factual_summary(metadata)

            prompt = self._create_prompt(metadata, artifact_type, factual_summary)

            print("4. Generating final creative script...")
            raw_script = self._send_prompt_to_ollama(prompt)

            # --- NEW & IMPROVED SCRIPT CLEANING ---
            # This is the key change. It finds the first instance of '(' which marks
            # the true beginning of the script, and discards any preamble from the LLM.
            first_cue_position = raw_script.find('(')
            if first_cue_position != -1:
                # If a parenthesis is found, trim the script to start from there.
                script = raw_script[first_cue_position:]
            else:
                # If no parenthesis is found, use the raw script and let the QC catch it.
                script = raw_script

            # Continue with the rest of the cleaning
            script = re.sub(r'\[.*?paragraph.*?\]', '', script, flags=re.IGNORECASE).strip()
            script = re.sub(r'\(Your visual cue here\)', '(Visual cue)', script, flags=re.IGNORECASE).strip()

            print("   - Script received and robustly cleaned.")

            print("\n5. Performing quality control...")
            is_passed, qc_message = self._quality_check(script)
            print(f"   - {qc_message}")
            
            safe_title = re.sub(r'[\\/*?:"<>|]', "", metadata['title'])[:50].strip()

            if is_passed:
                en_filename = os.path.join(output_dir, f"{safe_title}_en.txt")
                with open(en_filename, 'w', encoding='utf-8') as f:
                    f.write(script)
                print(f"\n✅ English script saved to: {en_filename}")
                
                translated_script = self.translate_to_arabic(script)
                refined_script = self.refine_translation_with_ollama(translated_script)
                
                ar_filename = os.path.join(output_dir, f"{safe_title}_ar.txt")
                with open(ar_filename, 'w', encoding='utf-8') as f:
                    f.write(refined_script)
                print(f"✅ Refined Arabic script saved to: {ar_filename}")
            else:
                print("\nSkipping translation and saving due to QC failure.")

        print("\n\n--- All selected objects processed. Pipeline Finished ---")


if __name__ == "__main__":
    # --- Configuration ---
    # ❗️ UPDATE THIS PATH to the actual location of your JSON Lines file.
    # JSON_FILE_PATH = "/Users/refobic/Downloads/auc_digital_selenium_firstpage.jsonl"
    JSON_FILE_PATH = "./sample_data.jsonl"
    
    ARTIFACT_TYPE = "publication_deep_dive"
    
    OLLAMA_MODEL = "llama3:8b"

    # --- User Input for Object Selection ---
    print(f"Metadata file being used: {JSON_FILE_PATH}")
    print("You can process up to 3 objects at a time.")
    
    selected_indices = []
    while True:
        try:
            user_input = input("➡️ Enter up to 3 row numbers (e.g., 0, 1, 2) to process from the JSON file: ")
            indices_str = [s.strip() for s in user_input.split(',')]
            selected_indices = [int(s) for s in indices_str if s]
            
            if not selected_indices:
                print("No indices provided. Please try again.")
                continue
            if len(selected_indices) > 3:
                print("Error: You can select a maximum of 3 objects. Please try again.")
                continue
            break
        except ValueError:
            print("Invalid input. Please enter numbers separated by commas (e.g., 5, 8, 12).")

    # --- Execution ---
    if not os.path.exists(JSON_FILE_PATH):
        print(f"[ERROR] The file was not found at the specified path: {JSON_FILE_PATH}")
        print("Please update the 'JSON_FILE_PATH' variable in the script.")
        sys.exit(1)

    engine = ScriptGenerator(ollama_model=OLLAMA_MODEL)
    
    engine.run_pipeline(
        source_path=JSON_FILE_PATH, 
        artifact_type=ARTIFACT_TYPE,
        row_indices=selected_indices
    )
    