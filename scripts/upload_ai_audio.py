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
    cat_name = "Speakers & Headphones"
    cat_slug = slugify(cat_name)
    
    # Upsert Category
    res = supabase.table("categories").select("id").eq("slug", cat_slug).execute()
    if res.data:
        category_id = res.data[0]["id"]
    else:
        insert_res = supabase.table("categories").insert({
            "name": cat_name,
            "slug": cat_slug,
            "description": "Premium audio gear including true wireless earbuds, ANC headphones, and desktop speakers.",
            "sort_order": 3
        }).execute()
        category_id = insert_res.data[0]["id"]

    products = [
        {
            "id": "S100",
            "name": "S100 True Wireless Earbuds",
            "short": "Minimalist true wireless earbuds with matte charging case and pristine sound.",
            "variant": "White",
            "hex": "#f5f5f5",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/tws_earbuds_white_1787226719100.jpg"
        },
        {
            "id": "S200",
            "name": "S200 ANC Headphones",
            "short": "Premium over-ear active noise cancelling headphones with soft earcups.",
            "variant": "Black",
            "hex": "#1a1a1a",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/anc_headphones_black_1787226734051.jpg"
        },
        {
            "id": "S300",
            "name": "S300 Portable Bluetooth Speaker",
            "short": "Compact, rugged waterproof bluetooth speaker in deep navy blue with woven mesh.",
            "variant": "Navy Blue",
            "hex": "#000080",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/bt_speaker_blue_1787226750599.jpg"
        },
        {
            "id": "S400",
            "name": "S400 Aluminum Desktop Speaker",
            "short": "Premium desktop bluetooth speaker machined from a single block of brushed silver aluminum.",
            "variant": "Silver",
            "hex": "#c0c0c0",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/desk_speaker_silver_1787226764659.jpg"
        },
        {
            "id": "S500",
            "name": "S500 Retro Wood Speaker",
            "short": "Retro-inspired desktop speaker with a rich walnut wood grain finish and sleek black grille.",
            "variant": "Walnut",
            "hex": "#5c4033",
            "img": "/Users/faqrealam149/.gemini/antigravity-ide/brain/c3a8c6ad-8c77-4444-ae7b-da9038d7d421/retro_speaker_walnut_1787226778277.jpg"
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
