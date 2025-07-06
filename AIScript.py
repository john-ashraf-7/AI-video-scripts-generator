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
import pandas as pd
import os
import sys

# --- Direct Import for Debugging ---
# We are explicitly importing torch here to see if the script can find it at startup.
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

    def __init__(self, ollama_model="llama3.2:latest", ollama_api_url="http://localhost:11434/api/generate"):
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
            "publication": (
                "You are a scriptwriter for short museum videos. Generate a short, engaging 3-paragraph video script "
                "based on the following information. Do not add any pre-amble, just the script itself. "
                "Start with a visual cue in parentheses.\n\n"
                "Intro: From the library's digital archives, we bring you a publication by {creator}, dated {date}.\n"
                "Body: Titled '{title}', this item details the following: {description}\n"
                "Conclusion: This publication offers a unique insight into its subject. Explore more stories like this in our digital collection."
            ),
            # --- NEW "DEEP DIVE" PROMPT ---
            # This prompt instructs the LLM to use its own knowledge to add details.
            "publication_deep_dive": (
                "You are a knowledgeable historian and an engaging scriptwriter for museum videos. "
                "Your task is to create a compelling 3-paragraph video script about the book titled '{title}' by {creator}, published around {date}. "
                "Do not add any pre-amble, just the script itself. Start with a visual cue in parentheses.\n\n"
                "**Instructions:**\n"
                "1.  **Introduction:** Introduce the book, its author, and its general purpose based on the title.\n"
                "2.  **Body Paragraph (Deep Dive):** This is the most important part. Using your own knowledge, delve into the *specific contents* of the book. Mention one or two specific people, stories, or themes that are discussed in '{title}'. Be as detailed as your knowledge allows to make the script interesting.\n"
                "3.  **Conclusion:** Conclude by reflecting on the book's importance or legacy and encourage viewers to explore similar topics."
            ),
            "photograph": (
                "You are a scriptwriter for short museum videos. Generate a short, engaging 3-paragraph video script "
                "for a historical photograph. Do not add any pre-amble, just the script itself. "
                "Start with a visual cue in parentheses, like '(CLOSE UP on the photograph)'\n\n"
                "Context: This photograph, titled '{title}', was taken by {creator} around {date}.\n"
                "Description: The photo captures the following scene: {description}\n"
                "Narrative Hook: Generate a compelling narrative that speculates on the story behind the image and its significance."
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

    def _get_metadata_from_csv(self, file_path, row_index=0):
        """
        Parses metadata from a specific row of a given CSV file.
        """
        print(f"\n1. Parsing metadata from '{file_path}'...")
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"The file was not found at the specified path: {file_path}")

            df = pd.read_csv(file_path)

            if not df.empty and len(df) > row_index:
                row = df.iloc[row_index]
                metadata = {
                    "identifier": row.get('AUC no.', 'N/A'),
                    "title": row.get('TITLE', 'No Title Available'),
                    "creator": row.get('AUTHOR', 'Unknown Author'),
                    "date": str(row.get('D.O. Pub.', 'No Date Available')),
                    # The description is now less important as the LLM will generate its own.
                    "description": f"A publication titled '{row.get('TITLE', 'No Title')}' by {row.get('AUTHOR', 'Unknown')}."
                }
                print(f"   - Successfully parsed metadata for: {metadata['title']}")
                return metadata
            else:
                return self._get_default_metadata("CSV file is empty or index is out of bounds.")

        except FileNotFoundError as e:
            print(f"   - [ERROR] {e}")
            return self._get_default_metadata(str(e))
        except Exception as e:
            print(f"   - [ERROR] An unexpected error occurred while reading the CSV: {e}")
            return self._get_default_metadata(str(e))

    def _get_default_metadata(self, reason="No data source provided."):
        """Returns a default metadata object when real data can't be fetched."""
        print(f"   - [WARNING] Could not fetch metadata: {reason}")
        return {
            "identifier": "N/A", "title": "No Title", "creator": "Unknown",
            "date": "Unknown", "description": "No description available."
        }

    def _create_prompt(self, metadata, artifact_type="publication"):
        """
        Creates a prompt by selecting a template and filling it with metadata.
        """
        print("2. Creating prompt...")
        template = self.prompt_templates.get(artifact_type, self.prompt_templates["default"])
        prompt = template.format(**metadata)
        print(f"   - Using template for artifact type: '{artifact_type}'")
        return prompt

    def _quality_check(self, script_text):
        """
        Performs basic checks on the generated script.
        """
        if not script_text or "error" in script_text.lower() or len(script_text.strip()) == 0:
            return False, "QC Failed: Generation returned an empty or error-like response."
        if len(script_text.split()) < 20:
            return False, "QC Failed: Generated script is too short (words: {len(script_text.split())})."
        if not script_text.strip().startswith('('):
            return False, "QC Failed: Script does not start with a visual cue as requested."

        return True, "Quality check passed."
    
    def refine_translation_with_ollama(self, arabic_text):
        """
        Takes a machine-translated Arabic script and uses an LLM to refine it.
        """
        print("\n6. Refining translation with Ollama LLM...")

        # This prompt is crucial. It instructs the LLM to act as an editor.
        refinement_prompt = (
            "You are an expert Arabic editor. The following text is a machine translation of a video script. "
            "Your task is to proofread and refine this text. Correct any grammatical errors, improve the "
            "sentence structure, and enhance the overall flow to make it sound natural and eloquent, as if "
            "written by a native speaker. Preserve the original meaning and intent. "
            "Do not add any commentary, explanations, or preamble. "
            "Only output the final, polished Arabic text.\n\n"
            f"--- DRAFT TEXT ---\n{arabic_text}\n--- END DRAFT ---\n\n"
            "Polished Arabic Script:"
        )

        payload = {"model": self.ollama_model, "prompt": refinement_prompt, "stream": False}

        try:
            response = requests.post(self.ollama_api_url, json=payload, timeout=90)
            response.raise_for_status()
            response_data = response.json()
            refined_text = response_data.get('response', 'Error: Could not parse refinement response.')
            print("   - Refinement with Ollama successful.")
            return refined_text
        except requests.exceptions.RequestException as e:
            return f"[FATAL ERROR] An error occurred during refinement: {e}"

    def generate_script(self, prompt):
        """
        Sends the prompt to the local Ollama instance to generate the script.
        """
        print("3. Sending prompt to local Ollama instance...")
        payload = {"model": self.ollama_model, "prompt": prompt, "stream": False}

        try:
            response = requests.post(self.ollama_api_url, json=payload, timeout=60)
            response.raise_for_status()
            response_data = response.json()
            generated_text = response_data.get('response', 'Error: Could not parse response from Ollama.')
            print("   - Successfully received response from Ollama.")
            return generated_text
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                return (f"[FATAL ERROR] An error occurred during script generation: {e}\n"
                        f"   - This '404 Not Found' error confirms the model '{self.ollama_model}' is not available on the Ollama server.\n"
                        f"   - Please ensure you have run 'ollama pull {self.ollama_model}' and that the model name is correct.")
            return f"[FATAL ERROR] An HTTP error occurred during script generation: {e}"
        except requests.exceptions.RequestException as e:
            return f"[FATAL ERROR] An error occurred during script generation: {e}"

    def translate_to_arabic(self, script_text):
        """
        Translates the given English text to Arabic paragraph by paragraph
        to avoid truncation by the model.
        """
        print("\n5. Translating to Arabic...")
        try:
            # Lazy load model and tokenizer on first use
            if self.translation_model is None or self.translation_tokenizer is None:
                print("   - Loading translation model for the first time... (This may take a moment)")
                self.translation_tokenizer = MarianTokenizer.from_pretrained(self.translation_model_name)
                self.translation_model = MarianMTModel.from_pretrained(self.translation_model_name)
                print("   - Translation model loaded.")

            # Split the script into paragraphs. We split by double newlines.
            paragraphs = script_text.strip().split('\n\n')
            translated_paragraphs = []

            print(f"   - Translating {len(paragraphs)} paragraph(s)...")
            for i, p in enumerate(paragraphs):
                if not p.strip():  # Skip empty lines
                    continue
                
                print(f"     - Translating paragraph {i+1}...")
                inputs = self.translation_tokenizer(p, return_tensors="pt", padding=True, truncation=True, max_length=512)
                translated_ids = self.translation_model.generate(**inputs)
                translated_p = self.translation_tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]
                translated_paragraphs.append(translated_p)

            # Join the translated paragraphs back together
            full_translation = "\n\n".join(translated_paragraphs)
            print("   - Translation successful.")
            return full_translation

        except ImportError as e:
            return f"[ERROR] Translation failed due to an ImportError. This means a required library is missing or cannot be found by 'transformers'.\n--- Detailed Error Message ---\n{e}\n-----------------------------"
        except Exception as e:
            return f"[ERROR] Could not perform translation due to an unexpected error: {e}"

    def run_pipeline(self, source_path, artifact_type="publication"):
        """
        Main pipeline to run the full script generation process.
        """
        print("--- Starting Script Generation Pipeline ---\n")

        # Run the pre-flight checks for Ollama first.
        if not self._check_ollama_status():
            print("\n--- Pipeline Halted: Ollama server is not accessible. ---")
            return
        
        if not self._check_available_models():
            print("\n--- Pipeline Halted: Required Ollama model not found. ---")
            return

        # 1. Get Metadata
        metadata = self._get_metadata_from_csv(source_path)
        if metadata['identifier'] == 'N/A':
            print("\n--- Pipeline Halted: Could not retrieve valid metadata. ---")
            return

        # 2. Create Prompt
        prompt = self._create_prompt(metadata, artifact_type)

        # 3. Generate Script
        script = self.generate_script(prompt)

        # 4. Quality Control
        print("\n4. Performing quality control...")
        is_passed, qc_message = self._quality_check(script)
        print(f"   - {qc_message}")

        print("\n--- SCRIPT GENERATION COMPLETE ---")
        print("="*50)
        if not is_passed:
            print("   *** SCRIPT FAILED QUALITY CONTROL ***")
        print(script.strip())
        print("="*50)

        # 5. Translate if QC passed
        if is_passed:
            # Step 5a: Get the initial "draft" translation
            translated_script = self.translate_to_arabic(script)
            print("\n--- INITIAL DRAFT TRANSLATION (ARABIC) ---")
            print("="*50)
            print(translated_script.strip())
            print("="*50)

            # Step 5b: Use the LLM to refine the draft translation
            refined_script = self.refine_translation_with_ollama(translated_script)
            print("\n--- REFINED SCRIPT (ARABIC) ---")
            print("="*50)
            print(refined_script.strip())
            print("="*50)
            
        else:
            print("\nSkipping translation due to QC failure.")

        print("\n--- Pipeline Finished ---")


if __name__ == "__main__":
    # --- Configuration ---
    # Update this path to the actual location of your CSV file.
    CSV_FILE_PATH = "/Users/refobic/Downloads/22.csv"
    
    # --- CHOOSE THE ARTIFACT TYPE ---
    # "publication" -> Simple script based only on metadata.
    # "publication_deep_dive" -> Rich script using the LLM's own knowledge.
    ARTIFACT_TYPE = "publication_deep_dive"
    
    # Select the Ollama model to use
    OLLAMA_MODEL = "llama3.2:3b"

    # --- Execution ---
    # Check if the file path exists before running
    if not os.path.exists(CSV_FILE_PATH):
        print(f"[ERROR] The file was not found at the specified path: {CSV_FILE_PATH}")
        print("Please update the 'CSV_FILE_PATH' variable in the script.")
        sys.exit(1) # Exit the script if the file doesn't exist

    engine = ScriptGenerator(ollama_model=OLLAMA_MODEL)
    engine.run_pipeline(source_path=CSV_FILE_PATH, artifact_type=ARTIFACT_TYPE)
