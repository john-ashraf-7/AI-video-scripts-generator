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
import sys
import re
import difflib

# --- Direct Import for Debugging ---
try:
    import torch
    print("--- PyTorch Check: Successfully imported torch. ---")
except ImportError as e:
    print(f"--- PyTorch Check: FAILED to import torch at startup. ---")
    print(f"--- Detailed Error: {e}")
    print("--- Please ensure torch is correctly installed in the interpreter being used. ---")
    sys.exit(1)

from transformers import MarianMTModel, MarianTokenizer


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
        """
        Initializes the ScriptGenerator.

        Args:
            ollama_model (str): The name of the Ollama model to use.
            ollama_api_url (str): The API endpoint for the local Ollama instance.
        """
        self.ollama_model = ollama_model
        self.ollama_api_url = ollama_api_url
        self.translation_model_name = 'Helsinki-NLP/opus-mt-en-ar'
        self.translation_model = None
        self.translation_tokenizer = None

        self.prompt_templates = {
            "publication_deep_dive": (
                "You are a master storyteller and scriptwriter for a museum's short documentary series. Your task is to transform the following facts into a short, compelling 2-minute video script that brings the subject to life. The script must be exactly 3 paragraphs, with a visual cue before each paragraph."
                "\n\n**CRITICAL INSTRUCTIONS:**"
                "\n1.  **Create a Narrative:** Do not simply list the facts. Weave them into a story with a hook, a body, and a conclusion."
                "\n2.  **Focus on the 'Why':** Why is this person or work important? What was their world like? What is their legacy?"
                "\n3.  **Handle Missing Info:** If the description is missing, use the known facts (like the author, title, and date) to speculate on the historical context and the story behind the publication."
                "\n4.  **Adhere to the Format:** Your entire response must start directly with the first visual cue. Do not add any preambles or introductions."
                "\n\n--- Verified Facts ---"
                "\n{factual_summary}"
                "\n--- End of Facts ---"
                "\n\n(Visual cue for the opening shot)"
                "\n\n[Paragraph 1: The Hook. Introduce the central character or theme in an intriguing way.]"
                "\n\n(Visual cue for the middle section)"
                "\n\n[Paragraph 2: The Context. Describe the world in which the book was written and its significance during that time.]"
                "\n\n(Visual cue for the conclusion)"
                "\n\n[Paragraph 3: The Legacy. Explain why this work still matters and leave the audience with a powerful thought.]"
            ),
            "photograph": (
                "You are a scriptwriter for short museum videos. Generate a short, engaging 3-paragraph video script "
                "for a historical photograph. Do not add any pre-amble. "
                "Start with a visual cue in parentheses, like '(CLOSE UP on the photograph)'. "
                "**IMPORTANT: Do not use any markdown formatting like asterisks or hashtags. The output must be plain text.**\n\n"
                "Context: This photograph, titled '{title}', was taken by {creator} around {date}.\n"
                "Description: The photo captures the following scene: {description}\n"
                "Narrative Hook: Generate a compelling narrative that speculates on the story behind the image and its significance."
            ),
            "publication": (
                "You are a scriptwriter for short museum videos. Generate a short, engaging 3-paragraph video script "
                "based on the following information. Do not add any pre-amble, just the script itself. "
                "Start with a visual cue in parentheses.\n\n"
                "Intro: From the library's digital archives, we bring you a publication by {creator}, dated {date}.\n"
                "Body: Titled '{title}', this item details the following: {description}\n"
                "Conclusion: This publication offers a unique insight into its subject. Explore more stories like this in our digital collection."
            ),
            "default": (
                "You are a scriptwriter. Generate a short, engaging 3-paragraph video script based on this item: "
                "Title: {title}, Creator: {creator}, Date: {date}, Description: {description}. "
                "Start with a visual cue."
            )
        }

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
                        "identifier": item.get('Call number', item.get('identi', f'Row_{index}')),
                        "title": item.get('Title', item.get('Title (English)', 'No Title Available')),
                        "creator": item.get('Creator', 'Unknown Author'),
                        "date": str(item.get('Date', 'No Date Available')),
                        "description": item.get('Description', item.get('Description (English)', 'No description provided.'))
                    }
                    print(f"   - Successfully parsed metadata for: {metadata['title']}")
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
            "identifier": "N/A", "title": "No Title", "creator": "Unknown",
            "date": "Unknown", "description": "No description available."
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

    def _generate_factual_summary(self, metadata):
        """Generates a factual summary by combining local metadata and Google Books API data."""
        print("2. Generating Factual Summary (Hybrid API + LLM Approach)...")
        
        # --- API CALL INTEGRATION ---
        api_facts = self._fetch_book_details_from_api(metadata)
        
        # Create the text block for the API facts, or a note if it failed
        if api_facts:
            api_facts_text = (
                f"Title: {api_facts['api_title']}\n"
                f"Author(s): {api_facts['api_authors']}\n"
                f"Published Date: {api_facts['api_published_date']}\n"
                f"Publisher: {api_facts['api_publisher']}\n"
                f"Categories: {api_facts['api_categories']}\n"
                f"Page Count: {api_facts['api_page_count']}\n"
                f"Description: {api_facts['api_description']}"
            )
        else:
            api_facts_text = "No additional information was found from the books database."

        # --- NEW AND IMPROVED PROMPT ---
        prompt = (
            "You are a research assistant. Create a concise, factual summary about a publication. "
            "Combine the Original Metadata with the more reliable Verified API Data. "
            "**CRITICAL: If there is a conflict, trust the 'Verified API Data'.**\n\n"
            "--- Original Metadata (from library record) ---\n"
            "Title: {title}\n"
            "Creator: {creator}\n"
            "Date: {date}\n\n"
            "--- Verified API Data (from Google Books) ---\n"
            "{api_data}\n"
            "--- End of Data ---\n\n"
            "Based on ALL the information above, write a single, clean paragraph summarizing the key facts about this book."
        ).format(
            title=metadata['title'],
            creator=metadata['creator'],
            date=metadata['date'],
            api_data=api_facts_text
        )
        
        summary = self._send_prompt_to_ollama(prompt, timeout=90)
        print("   - Factual summary received.")
        return summary

    def _create_prompt(self, metadata, artifact_type="publication_deep_dive", factual_summary=None):
        """Creates the final prompt, injecting the factual summary if available."""
        print("3. Creating final script prompt...")
        template = self.prompt_templates.get(artifact_type)
        if not template:
            return f"Generate a script for {metadata['title']}"

        if artifact_type == "publication_deep_dive" and factual_summary:
            metadata_with_summary = metadata.copy()
            metadata_with_summary['factual_summary'] = factual_summary
            prompt = template.format(**metadata_with_summary)
        else:
            prompt = template.format(**metadata)
            
        print(f"   - Using template for artifact type: '{artifact_type}'")
        return prompt

    def _quality_check(self, script_text):
        """Performs basic checks."""
        if not script_text or "error" in script_text.lower() or len(script_text.strip()) < 10:
            return False, "QC Failed: Generation returned an empty or error-like response."
        
        cleaned_text = re.sub(r'\[.*?paragraph.*?\]', '', script_text, flags=re.IGNORECASE)
        
        if len(cleaned_text.split()) < 20:
            return False, f"QC Failed: Generated script is too short (words: {len(cleaned_text.split())})."
        
        cleaned_script_for_cue = script_text.strip().lstrip(' *')
        if not cleaned_script_for_cue.startswith('('):
            return False, "QC Failed: Script does not start with a visual cue as requested."
        
        return True, "Quality check passed."
    
    def refine_translation_with_ollama(self, arabic_text):
        """Takes a machine-translated Arabic script and uses an LLM to refine it."""
        print("\n7. Refining translation with Ollama LLM...")
        refinement_prompt = (
            "You are an expert Arabic language editor. Proofread and polish the following machine-translated DRAFT TEXT. "
            "Your job is ONLY to correct grammar and improve the flow. "
            "You MUST NOT change the paragraph structure or the location of visual cues `()`. "
            "You MUST NOT add any notes, commentary, or preambles. "
            "Your final output should ONLY be the polished Arabic script and nothing else.\n\n"
            f"--- DRAFT TEXT ---\n{arabic_text}\n--- END DRAFT ---\n\n"
            "Polished Arabic Script:"
        )
        
        response_text = self._send_prompt_to_ollama(refinement_prompt, timeout=90)
        
        if "Polished Arabic Script:" in response_text:
            final_text = response_text.split("Polished Arabic Script:")[-1].strip()
        elif "--- END DRAFT ---" in response_text:
            final_text = response_text.split("--- END DRAFT ---")[-1].strip()
        else:
            final_text = response_text
        
        print("   - Refinement with Ollama successful.")
        return final_text

    def translate_to_arabic(self, script_text):
        """Translates the given English text to Arabic paragraph by paragraph."""
        print("\n6. Translating to Arabic...")
        try:
            if self.translation_model is None or self.translation_tokenizer is None:
                print("   - Loading translation model for the first time... (This may take a moment)")
                self.translation_tokenizer = MarianTokenizer.from_pretrained(self.translation_model_name)
                self.translation_model = MarianMTModel.from_pretrained(self.translation_model_name)
                print("   - Translation model loaded.")

            paragraphs = script_text.strip().split('\n\n')
            translated_paragraphs = []
            print(f"   - Translating {len(paragraphs)} paragraph(s)...")
            for i, p in enumerate(paragraphs):
                if not p.strip() or "[your visual cue here]" in p.lower():
                    continue
                print(f"     - Translating paragraph {i+1}...")
                inputs = self.translation_tokenizer(p, return_tensors="pt", padding=True, truncation=True, max_length=512)
                translated_ids = self.translation_model.generate(**inputs)
                translated_p = self.translation_tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]
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
    JSON_FILE_PATH = "/Users/refobic/Downloads/auc_digital_selenium_firstpage.jsonl"
    
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
