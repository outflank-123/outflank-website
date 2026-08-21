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
    cat_name = "Electronics & Accessories"
    cat_slug = slugify(cat_name)
    
    # Upsert Category
    res = supabase.table("categories").select("id").eq("slug", cat_slug).execute()
    if res.data:
        category_id = res.data[0]["id"]
    else:
        insert_res = supabase.table("categories").insert({
            "name": cat_name,
            "slug": cat_slug,
            "description": "Premium electronic gadgets, charging cables, and folding phone stands.",
            "sort_order": 6
        }).execute()
        category_id = insert_res.data[0]["id"]

    products = [
        {
            "id": "E238",
            "name": "Foldy Flat Mobile Stand",
            "short": "Compact design mobile stand with 5 angle adjustment that can be folded flat to store.",
            "variants": [
                {
                    "name": "Red",
                    "hex": "#ff3b30",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/foldy_stand_red_1787228548370.jpg"
                },
                {
                    "name": "Blue",
                    "hex": "#007aff",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/foldy_stand_blue_1787228561839.jpg"
                },
                {
                    "name": "Orange",
                    "hex": "#ff9500",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/foldy_stand_orange_1787228577973.jpg"
                }
            ]
        },
        {
            "id": "C194",
            "name": "TidyCord Retractable Box",
            "short": "Retractable fast charging cable box with SIM card slots and USB/Lightning connectors.",
            "variants": [
                {
                    "name": "Black",
                    "hex": "#1a1a1a",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/tidycord_black_1787228589261.jpg"
                },
                {
                    "name": "White",
                    "hex": "#f5f5f5",
                    "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/tidycord_white_1787228603745.jpg"
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
