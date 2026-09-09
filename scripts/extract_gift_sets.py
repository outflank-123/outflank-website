import os
import json
import glob
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("models/gemini-3.6-flash")

prompt = """
Analyze the product in this catalog page.
Return a valid JSON object with the following schema:
{
  "code": "product code",
  "name": "product name",
  "description": "short description of the product",
  "features": ["feature 1", "feature 2"],
  "colors": ["Color 1", "Color 2"]
}
If this is a title page and not a product, return {"is_title_page": true}
"""

results = []
image_files = sorted(glob.glob("scratch_gift_sets/page_*.jpg"))

for img_path in image_files:
    print(f"Processing {img_path}...", flush=True)
    try:
        img = Image.open(img_path)
        res = model.generate_content([prompt, img])
        text = res.text.strip()
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif text.startswith('```'):
             text = text[3:-3].strip()
        
        data = json.loads(text)
        if data.get("is_title_page"):
             print(f"Skipped {img_path}: Title page", flush=True)
             continue
             
        data['image_source'] = img_path
        results.append(data)
        print(f"Success for {img_path}: {data.get('name')}", flush=True)
    except Exception as e:
        print(f"Error processing {img_path}: {e}", flush=True)

with open("gift_sets_products.json", "w") as f:
    json.dump(results, f, indent=2)
print("Finished extraction.", flush=True)
