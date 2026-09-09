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
If there are multiple products, pick the main one. Do not include markdown formatting like ```json, just the raw JSON object.
"""

results = []
image_files = sorted(glob.glob("scratch_home_kitchen/page_*.jpg"))

# Just process 2-4 for a quick test/upload
for img_path in image_files[1:4]: 
    print(f"Processing {img_path}...", flush=True)
    try:
        img = Image.open(img_path)
        res = model.generate_content([prompt, img])
        text = res.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        
        data = json.loads(text)
        data['image_source'] = img_path
        results.append(data)
        print(f"Success for {img_path}: {data.get('name')}", flush=True)
    except Exception as e:
        print(f"Error processing {img_path}: {e}", flush=True)

with open("kitchen_products.json", "w") as f:
    json.dump(results, f, indent=2)
print("Finished.", flush=True)
