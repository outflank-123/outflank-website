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
    cat_name = "Lamps & Torches"
    cat_slug = slugify(cat_name)
    
    # Upsert Category
    res = supabase.table("categories").select("id").eq("slug", cat_slug).execute()
    if res.data:
        category_id = res.data[0]["id"]
    else:
        insert_res = supabase.table("categories").insert({
            "name": cat_name,
            "slug": cat_slug,
            "description": "Premium rechargeable lamps, reading lights, and heavy-duty portable torches.",
            "sort_order": 5
        }).execute()
        category_id = insert_res.data[0]["id"]

    # We structure them as products containing an array of color variants!
    products = [
        {
            "id": "E393",
            "name": "Lumibloc Rechargeable Metal Table Lamp",
            "short": "Sleek minimalist metal table lamp with square shade, touch sensor, and Type-C charging.",
            "variants": [
                {
                    "name": "Black",
                    "hex": "#1a1a1a",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/lumibloc_black_1787228039603.jpg"
                },
                {
                    "name": "White",
                    "hex": "#f5f5f5",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/lumibloc_white_1787228051197.jpg"
                }
            ]
        },
        {
            "id": "E365",
            "name": "Versabeam Mini Torch",
            "short": "Compact rechargeable torch and emergency lamp with 3 light modes and a pocket holder.",
            "variants": [
                {
                    "name": "Yellow",
                    "hex": "#ffcc00",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/versabeam_mini_yellow_1787228063379.jpg"
                },
                {
                    "name": "Blue",
                    "hex": "#003366",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/versabeam_mini_blue_1787228074982.jpg"
                }
            ]
        }
    ]

    for p in products:
        color_variants = []
        gallery = []
        primary_url = None
        
        for idx, var in enumerate(p["variants"]):
            url = upload_image(var["img"], cat_slug, p["id"], var["name"])
            if url:
                if idx == 0: primary_url = url
                gallery.append(url)
                color_variants.append({
                    "name": var["name"],
                    "hex": var["hex"],
                    "images": [url]
                })
                
        if not color_variants: continue
        
        slug = slugify(p["name"] + " " + p["id"])
        payload = {
            "category_id": category_id,
            "name": p["name"],
            "slug": slug,
            "short_desc": p["short"],
            "color_variants": color_variants,
            "primary_image_url": primary_url,
            "image_gallery": gallery,
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
