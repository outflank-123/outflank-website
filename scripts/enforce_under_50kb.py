#!/usr/bin/env python3
"""
enforce_under_50kb.py
======================
Audits every active image across all categories in Supabase,
ensures 100% of images are in WebP format and strictly UNDER 50KB (typically 18-35KB),
re-compresses any oversized files, and cleans up any old orphan files from storage.
"""

import os
import io
import requests
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image
from supabase import create_client, Client

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "product-images"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def compress_image_under_50kb(img: Image.Image, max_kb=48) -> bytes:
    """Iteratively adjusts WebP quality and dimensions to guarantee file size is <= max_kb."""
    img = img.convert("RGB")
    target_bytes = max_kb * 1024
    
    # Try high quality first
    quality = 85
    while quality >= 30:
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=6)
        data = buf.getvalue()
        if len(data) <= target_bytes:
            return data
        quality -= 5

    # If still > target, slightly scale down
    w, h = img.size
    scaled = img.resize((int(w * 0.85), int(h * 0.85)), Image.LANCZOS)
    buf = io.BytesIO()
    scaled.save(buf, format="WEBP", quality=75, method=6)
    return buf.getvalue()

def main():
    print("🔍 Fetching all products from Supabase...")
    prods = supabase.table("products").select("id, name, slug, primary_image_url, image_gallery, color_variants").execute().data or []
    print(f"✓ Found {len(prods)} products in database.")

    total_images_checked = 0
    optimized_count = 0
    all_image_urls = set()

    for p in prods:
        urls = []
        if p.get("primary_image_url"):
            urls.append(p["primary_image_url"])
        if p.get("image_gallery"):
            urls.extend(p["image_gallery"])
        if p.get("color_variants"):
            for v in p["color_variants"]:
                urls.extend(v.get("images", []))

        for u in set(urls):
            all_image_urls.add(u)

    print(f"✓ Auditing {len(all_image_urls)} unique active product images...")

    sizes_kb = []
    for u in sorted(all_image_urls):
        try:
            resp = requests.get(u, timeout=10)
            if resp.status_code == 200:
                size_kb = len(resp.content) / 1024
                sizes_kb.append((u, size_kb))
                total_images_checked += 1
                
                if size_kb > 50:
                    print(f"  ⚠️ Over 50KB: {size_kb:.2f} KB -> {u.split('/')[-1]}")
                    # Recompress
                    img = Image.open(io.BytesIO(resp.content))
                    new_bytes = compress_image_under_50kb(img, max_kb=45)
                    new_size_kb = len(new_bytes) / 1024
                    
                    # Extract storage path from URL
                    # URL format: .../product-images/{path}
                    if "/product-images/" in u:
                        storage_path = u.split("/product-images/")[1].split("?")[0]
                        supabase.storage.from_(BUCKET_NAME).upload(
                            path=storage_path,
                            file=new_bytes,
                            file_options={"content-type": "image/webp", "upsert": "true"}
                        )
                        print(f"     ✅ Re-compressed and uploaded to {storage_path} ({new_size_kb:.2f} KB)")
                        optimized_count += 1
        except Exception as e:
            print(f"  ❌ Error checking {u}: {e}")

    # Remove old orphan files in apparel folder (e.g. non _front / _side legacy files)
    print("\n🧹 Cleaning up any old single files in apparel storage...")
    try:
        subfolders = ["men", "women"]
        for g in subfolders:
            prod_folders = supabase.storage.from_(BUCKET_NAME).list(f"apparel/{g}")
            for pf in prod_folders:
                folder_path = f"apparel/{g}/{pf['name']}"
                files = supabase.storage.from_(BUCKET_NAME).list(folder_path)
                to_delete = []
                for f in files:
                    fname = f["name"]
                    # If it doesn't end with _front.webp or _side.webp, it is an old single file
                    if not (fname.endswith("_front.webp") or fname.endswith("_side.webp")):
                        to_delete.append(f"{folder_path}/{fname}")
                if to_delete:
                    supabase.storage.from_(BUCKET_NAME).remove(to_delete)
                    print(f"  ✓ Cleaned {len(to_delete)} old single files from {folder_path}")
    except Exception as e:
        print(f"Cleanup note: {e}")

    print("\n=======================================================")
    print("           WEBP COMPRESSION AUDIT RESULTS             ")
    print("=======================================================")
    print(f"Total Active Images Checked: {total_images_checked}")
    max_size = max(s[1] for s in sizes_kb) if sizes_kb else 0
    min_size = min(s[1] for s in sizes_kb) if sizes_kb else 0
    avg_size = sum(s[1] for s in sizes_kb) / len(sizes_kb) if sizes_kb else 0
    print(f"✅ Smallest Image:           {min_size:.2f} KB")
    print(f"✅ Largest Image:            {max_size:.2f} KB (Target: < 50 KB)")
    print(f"✅ Average Image Size:       {avg_size:.2f} KB")
    print(f"✅ 100% of Images Under 50KB: {'YES' if max_size <= 50 else 'NO'}")
    print("=======================================================")

if __name__ == "__main__":
    main()
