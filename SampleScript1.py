#%%
import requests
import json
import pandas as pd
from transformers import MarianMTModel, MarianTokenizer
# for ollama write in terminal :      ollama serve
# to check it is running :      curl http://localhost:11434
# you can kill ollama by activity monitor or


#make sure to change file path of the .csv
#I assumed the files are csv but we can add more support later


def parseMetadata():
    df = pd.read_excel('/home/nicolas/Documents/Metadata G1 2025 -1.xlsx') #change file path if youa are using this code from github 

    if not df.empty:
        firstRow = df.iloc[0] #take first row as sample metadata
        metadata = {
            "identifier": firstRow.get('AUC no.', 'N/A'),  # will use AUC no. as identifier
            "title": firstRow.get('TITLE', 'No Title Available'),
            "creator": firstRow.get('AUTHOR', 'Unknown Author'),
            "date": str(firstRow.get('D.O. Pub.', 'No Date Available')), # use 'D.O. Pub.' for date
            "description": f"A publication titled '{firstRow.get('TITLE', 'No Title Available')}' by {firstRow.get('AUTHOR', 'Unknown Author')}, published in {str(firstRow.get('D.O. Pub.', 'No Date Available'))}." # Generic description
        }
    else:
        metadata = {
            "identifier": "N/A",
            "title": "No Title Available",
            "creator": "Unknown Author",
            "date": "No Date Available",
            "description": "No metadata available from the CSV file."
        }
    return metadata
#%%
def createPrompt(metadata):

    intro = f"From the library's digital archives, we bring you a publication by {metadata['creator']}, dated {metadata['date']}."
    desc = f"Titled '{metadata['title']}', this item details the following: {metadata['description']}"
    conclusion = f"This publication offers a unique insight into its subject. Explore more stories like this in our digital collection."

    prompt = f"You are a scriptwriter for short museum videos. Generate a short, engaging 3-paragraph video script based on the following information. Do not add any pre-amble, just the script itself. Start with a visual cue in parentheses. \n\nIntro: {intro} \nBody: {desc} \nConclusion: {conclusion}"
    return prompt

def genScript(prompt):

    API = "http://localhost:11434/api/generate" #local api

    payload = {
        "model": "llama3.2:latest",
        "prompt": prompt,
        "stream": False
    }

    # --- DEBUGGING: Print the JSON payload before sending ---
    print("[DEBUG] Preparing to send the following payload to Ollama:")
    print(json.dumps(payload, indent=2))
    print("-" * 50)

    print("3. Sending prompt to local Ollama instance...")
    try:
        # Make the POST request with a timeout
        response = requests.post(API, json=payload, timeout=30)

        # Raise an exception for bad status codes (4xx or 5xx)
        response.raise_for_status()

        # # --- DEBUGGING: Print the raw JSON response from the API ---
        # print("[DEBUG] Received raw response from Ollama:")
        # print(response.text)
        # print("-" * 50)

        response_data = response.json()

        return response_data.get('response', 'Error: Could not parse the "response" field from Ollama.')

    except requests.exceptions.ConnectionError:
        return "Connection to Ollama failed. Please ensure Ollama is running and accessible at 'http://localhost:11434'."
    except requests.exceptions.Timeout:
        return "Request to Ollama timed out. The server may be overloaded or unresponsive."
    except requests.exceptions.HTTPError as http_err:
        # --- DEBUGGING: Print detailed HTTP error information ---
        error_message = f"[FATAL ERROR] HTTP Error occurred: {http_err}\n"
        error_message += f"Status Code: {response.status_code}\n"
        error_message += f"Response Body: {response.text}"
        return error_message
    except requests.exceptions.RequestException as e:
        return f"[FATAL ERROR] An API request failed: {e}"
def translateToArabic(script):
    model = 'Helsinki-NLP/opus-mt-en-ar'
    tokenizer = MarianTokenizer.from_pretrained(model)
    model = MarianMTModel.from_pretrained(model)

    inputs = tokenizer(script, return_tensors="pt", padding=True, truncation=True)

    translated = model.generate(**inputs)

    translated_text = tokenizer.batch_decode(translated, skip_special_tokens=True)
    return translated_text[0] if translated_text else "Translation failed."
def main():
    print("--- Starting Script Generation ---\n")

    # 1. Parse metadata
    print("1. Parsing MetaData...")
    sample = parseMetadata()
    print(f"   - Title: {sample['title']}\n")

    # 2. Create prompt
    print("2. Creating prompt...")
    prompt = createPrompt(sample)
    # The full prompt is long, so we'll just confirm it was created.
    print("   - Prompt created successfully.\n")

    # 3. Generate script using Ollama
    script = genScript(prompt)

    # 4. Display the final result or error
    print("\n4. Script:")
    print("="*50)
    if script.strip().startswith("[FATAL ERROR]"):
        print("   *** SCRIPT GENERATION FAILED ***")
        print(script.strip())
    else:
        print(script.strip())
    print("="*50)
    print("\n--- Script Generation Complete ---")
    print("Translating into Arabic...")
    translated_script = translateToArabic(script)
    print("\n--- Translated Script ---")
    print(translated_script.strip())
    print("\n--- Translation Complete ---") 
if __name__ == "__main__":
    main()
