#!/usr/bin/env python3
"""
Upload script for structured CSV product data.
Reads products.csv and uploads images to Supabase, then creates DB records.
"""

import os
import csv
from pathlib import Path
from io import BytesIO
from PIL import Image as PILImage
from dotenv import load_dotenv
from supabase import create_client, Client

# --- Setup ---
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "product-images"

def slugify(text):
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text)[:80]

def guess_hex(color_name):
    name = color_name.lower()
    if 'black' in name: return '#1a1a1a'
    if 'white' in name: return '#f5f5f5'
    if 'red' in name: return '#e3231c'
    if 'blue' in name: return '#007aff'
    if 'grey' in name or 'gray' in name: return '#8e8e93'
    if 'brown' in name: return '#a2845e'
    if 'orange' in name: return '#ff9500'
    if 'green' in name: return '#34c759'
    if 'cork' in name: return '#d4b58e'
    if 'bamboo' in name: return '#d1bfae'
    if 'silver' in name or 'steel' in name: return '#d1d1d6'
    return '#888888'

def upload_image(filepath: Path, category_slug: str, group_id: str, variant_name: str) -> str:
    if not filepath.exists():
        print(f"  [!] Missing file: {filepath.name}")
        return None
    
    safe_variant = slugify(variant_name or "default")
    base_name = filepath.stem
    filename = f"{category_slug}/{group_id}/{safe_variant}-{base_name}.webp"
    
    try:
        with PILImage.open(filepath) as img:
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGBA')
            
            max_size = 1000
            if img.width > max_size or img.height > max_size:
                img.thumbnail((max_size, max_size), PILImage.Resampling.LANCZOS)
                
            buffer = BytesIO()
            quality = 80
            img.save(buffer, format="WEBP", quality=quality, method=6)
            image_bytes = buffer.getvalue()
            
            # aggressive compression if still > 50kb
            while len(image_bytes) > 50 * 1024 and quality > 10:
                quality -= 10
                buffer = BytesIO()
                img.save(buffer, format="WEBP", quality=quality, method=6)
                image_bytes = buffer.getvalue()

        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=image_bytes,
            file_options={"content-type": "image/webp", "upsert": "true", "cache-control": "max-age=31536000, immutable"}
        )
        return supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
    except Exception as e:
        print(f"  [-] Upload failed or existed: {e}. Trying to get URL anyway.")
        return supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

def main():
    folder_path = Path(__file__).parent.parent / "products" / "employee_joining_kits_clean_white"
    csv_path = folder_path / "products.csv"
    
    if not csv_path.exists():
        print(f"CSV not found at {csv_path}")
        return

    # Ensure category exists
    cat_name = "Employee Joining Kits"
    cat_slug = slugify(cat_name)
    
    res = supabase.table("categories").select("id").eq("slug", cat_slug).execute()
    if res.data:
        category_id = res.data[0]["id"]
    else:
        insert_res = supabase.table("categories").insert({
            "name": cat_name,
            "slug": cat_slug,
            "description": "Premium onboarding and employee joining kits.",
            "sort_order": 5
        }).execute()
        category_id = insert_res.data[0]["id"]
        print(f"Created category: {cat_name}")

    # Parse CSV
    products = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row["product_id"]
            if pid not in products:
                products[pid] = {
                    "name": row["product_name"],
                    "slug": slugify(row["product_name"] + " " + pid),
                    "short_desc": f"Source Code: {row['source_product_code']}",
                    "variants": []
                }
            
            # Variant info
            products[pid]["variants"].append({
                "name": row["variant"],
                "hex": guess_hex(row["variant"]),
                "image_file": row["image_file"]
            })
            
    # Upload and DB Insert
    for pid, data in products.items():
        print(f"Processing: {data['name']} ({pid})")
        color_variants = []
        
        for v in data["variants"]:
            img_path = folder_path / v["image_file"]
            url = upload_image(img_path, cat_slug, pid, v["name"])
            if url:
                color_variants.append({
                    "name": v["name"],
                    "hex": v["hex"],
                    "images": [url]
                })
                
        if not color_variants:
            print(f"  [!] No valid variants/images for {pid}, skipping.")
            continue
            
        primary_image = color_variants[0]["images"][0]
        
        # Upsert Product
        existing = supabase.table("products").select("id").eq("slug", data["slug"]).execute()
        
        payload = {
            "category_id": category_id,
            "name": data["name"],
            "slug": data["slug"],
            "short_desc": data["short_desc"],
            "color_variants": color_variants,
            "primary_image_url": primary_image,
            "image_gallery": [primary_image],
            "is_active": True,
            "is_featured": False
        }
        
        if existing.data:
            supabase.table("products").update(payload).eq("id", existing.data[0]["id"]).execute()
            print(f"  ↻ Updated {pid} in DB")
        else:
            supabase.table("products").insert(payload).execute()
            print(f"  ✓ Inserted {pid} into DB")

if __name__ == "__main__":
    main()
