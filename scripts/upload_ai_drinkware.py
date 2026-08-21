#!/usr/bin/env python3
import os
import io
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from PIL import Image

# --- Setup ---
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
BUCKET_NAME = "product-images"

def slugify(text):
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text)[:80]

def upload_image(filepath_str: str, category_slug: str, group_id: str, variant_name: str) -> str:
    path = Path(filepath_str)
    if not path.exists():
        print(f"Missing file: {path}")
        return None
    
    # Crop the bottom 50px (watermark) and convert to WebP
    img = Image.open(path)
    w, h = img.size
    cropped = img.crop((0, 0, w, h - 50))
    
    buf = io.BytesIO()
    cropped.convert("RGB").save(buf, format="WEBP", quality=85)
    webp_bytes = buf.getvalue()

    safe_variant = slugify(variant_name or "default")
    filename = f"{category_slug}/{group_id}/{safe_variant}.webp"
    
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=webp_bytes,
            file_options={"content-type": "image/webp", "upsert": "true", "cache-control": "max-age=31536000, immutable"}
        )
        return supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
    except Exception as e:
        print(f"Upload warning (might exist): {e}")
        return supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

def main():
    cat_name = "Drinkware"
    cat_slug = slugify(cat_name)
    
    # Upsert Category
    res = supabase.table("categories").select("id").eq("slug", cat_slug).execute()
    if res.data:
        category_id = res.data[0]["id"]
    else:
        insert_res = supabase.table("categories").insert({
            "name": cat_name,
            "slug": cat_slug,
            "description": "Premium insulated flasks, bamboo tumblers, and elegant glass bottles.",
            "sort_order": 4
        }).execute()
        category_id = insert_res.data[0]["id"]

    products = [
        {
            "id": "F100",
            "name": "Vacuum Insulated Flask",
            "short": "Sleek matte black stainless steel vacuum insulated flask for keeping beverages hot or cold.",
            "variant": "Matte Black",
            "hex": "#1a1a1a",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/flask_black_1787226948956.jpg"
        },
        {
            "id": "F200",
            "name": "Bamboo Tumbler",
            "short": "Insulated tumbler wrapped in natural bamboo wood finish with a stainless steel lid.",
            "variant": "Natural Bamboo",
            "hex": "#d1bfae",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/tumbler_bamboo_1787226962275.jpg"
        },
        {
            "id": "F300",
            "name": "Glass Water Bottle",
            "short": "Clear glass water bottle wrapped in a pastel mint green silicone sleeve for grip.",
            "variant": "Mint Green",
            "hex": "#98ff98",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/glass_bottle_mint_1787226974442.jpg"
        }
    ]

    for p in products:
        url = upload_image(p["img"], cat_slug, p["id"], p["variant"])
        if not url: continue
        
        slug = slugify(p["name"] + " " + p["id"])
        payload = {
            "category_id": category_id,
            "name": p["name"],
            "slug": slug,
            "short_desc": p["short"],
            "color_variants": [{
                "name": p["variant"],
                "hex": p["hex"],
                "images": [url]
            }],
            "primary_image_url": url,
            "image_gallery": [url],
            "is_active": True,
            "is_featured": False
        }
        
        existing = supabase.table("products").select("id").eq("slug", slug).execute()
        if existing.data:
            supabase.table("products").update(payload).eq("id", existing.data[0]["id"]).execute()
            print(f"Updated {p['name']}")
        else:
            supabase.table("products").insert(payload).execute()
            print(f"Inserted {p['name']}")

if __name__ == "__main__":
    main()
