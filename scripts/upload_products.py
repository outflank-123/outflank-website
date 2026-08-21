#!/usr/bin/env python3
"""
Outflank B2B Corporate Gifting — Product Data Upload Script
=============================================================
Extracts products from PDF catalogs, uses Google Gemini Vision to:
  1. Identify product names
  2. Detect color variants (same product, different colors)
  3. Groups variants under a single product entry

Then:
  - Compresses images to WebP (< 100KB) using Pillow
  - Uploads images to Supabase Storage (product-images bucket)
  - Inserts grouped products into Supabase DB (bypasses RLS with service role key)

Usage:
  pip install -r requirements.txt
  python upload_products.py

Required .env variables:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  GEMINI_API_KEY
"""

import os
import io
import re
import json
import time
import base64
import hashlib
import logging
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
from PIL import Image as PilImage
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

# ─── Setup ────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("outflank-upload")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
PDF_DIR = Path(__file__).parent.parent / "pdf"
BUCKET_NAME = "product-images"
MAX_WEBP_SIZE_KB = 95  # target < 100KB
GEMINI_MODEL = "gemini-3.6-flash"
VISION_BATCH_SIZE = 6   # pages per Gemini call (cost management)

genai.configure(api_key=GEMINI_API_KEY)

# ─── Supabase client ──────────────────────────────────────────────────────────
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80]


def category_from_filename(filename: str) -> str:
    """Convert PDF filename to human-readable category name."""
    stem = Path(filename).stem
    # Remove common words
    stem = re.sub(r"[-_]+", " ", stem)
    return stem.title()


def compress_to_webp(pil_image: PilImage.Image, max_kb: int = MAX_WEBP_SIZE_KB) -> bytes:
    """Compress PIL image to WebP bytes under max_kb."""
    quality = 85
    while quality >= 20:
        buf = io.BytesIO()
        rgb = pil_image.convert("RGB")
        rgb.save(buf, format="WEBP", quality=quality, method=6)
        data = buf.getvalue()
        if len(data) <= max_kb * 1024:
            return data
        quality -= 10
    # Last resort: resize
    w, h = pil_image.size
    resized = pil_image.resize((w // 2, h // 2), PilImage.LANCZOS)
    buf = io.BytesIO()
    resized.convert("RGB").save(buf, format="WEBP", quality=60, method=6)
    return buf.getvalue()


def extract_pages_from_pdf(pdf_path: Path) -> list[PilImage.Image]:
    """Extract all pages from a PDF as PIL Images at 150 DPI."""
    doc = fitz.open(str(pdf_path))
    images = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        mat = fitz.Matrix(150 / 72, 150 / 72)  # 150 DPI
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = PilImage.frombytes("RGB", [pix.width, pix.height], pix.samples)
        images.append(img)
    doc.close()
    log.info(f"  Extracted {len(images)} pages from {pdf_path.name}")
    return images


def pil_to_base64(img: PilImage.Image) -> str:
    """Convert PIL image to base64 JPEG string for Gemini."""
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=70)
    return base64.b64encode(buf.getvalue()).decode()


# ─── Gemini Vision Analysis ───────────────────────────────────────────────────

VISION_PROMPT = """
You are analyzing pages from a B2B corporate gifting product catalog PDF.

For EACH page in this batch, identify:
1. The main product name
2. Whether this page is a COLOR VARIANT of another page in this batch (same product, different color)
3. If it's a variant, assign the same group_id to all variants of the same product
4. The color name and approximate hex code if visible

Return a JSON array (one object per page, in order):
[
  {
    "page_index": 0,
    "product_name": "Stainless Steel Sipper Bottle",
    "group_id": "sipper-bottle-001",
    "is_variant": false,
    "color_name": "Midnight Black",
    "color_hex": "#1a1a1a",
    "short_desc": "Premium stainless steel sipper with vacuum insulation, ideal for corporate gifting"
  },
  {
    "page_index": 1,
    "product_name": "Stainless Steel Sipper Bottle",
    "group_id": "sipper-bottle-001",
    "is_variant": true,
    "color_name": "Pearl White",
    "color_hex": "#f5f5f0",
    "short_desc": "Premium stainless steel sipper with vacuum insulation, ideal for corporate gifting"
  }
]

Rules:
- group_id must be a stable kebab-case slug (use product name + a number)
- If the page is clearly NOT a product (e.g. cover page, divider, contact info), return null for that entry
- Return ONLY the raw JSON array, no markdown code blocks
"""

def analyze_pages_with_gemini(
    page_images: list[PilImage.Image],
    start_index: int
) -> list[dict | None]:
    """Send a batch of page images to Gemini Vision and parse results."""
    model = genai.GenerativeModel(GEMINI_MODEL)

    parts: list[Any] = [VISION_PROMPT]
    for i, img in enumerate(page_images):
        b64 = pil_to_base64(img)
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": b64
            }
        })
        parts.append(f"\n[Page {start_index + i}]")

    try:
        response = model.generate_content(parts, generation_config={"temperature": 0.1})
        raw = response.text.strip()
        # Strip potential markdown code block
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*$", "", raw)
        results = json.loads(raw)
        return results
    except Exception as e:
        log.warning(f"Gemini error: {e}")
        return [None] * len(page_images)


# ─── Supabase Storage Upload ───────────────────────────────────────────────────

def upload_image_to_supabase(
    webp_bytes: bytes,
    category_slug: str,
    group_id: str,
    color_name: str,
    image_index: int
) -> str | None:
    """Upload WebP bytes to Supabase Storage, return public URL."""
    safe_color = slugify(color_name or "default")
    filename = f"{category_slug}/{group_id}/{safe_color}-{image_index}.webp"

    try:
        # Check if already exists
        existing = supabase.storage.from_(BUCKET_NAME).list(f"{category_slug}/{group_id}")
        existing_names = [f["name"] for f in (existing or [])]
        base_name = f"{safe_color}-{image_index}.webp"
        if base_name in existing_names:
            log.info(f"  → Already uploaded: {filename}")
        else:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=filename,
                file=webp_bytes,
                file_options={"content-type": "image/webp", "upsert": "true", "cache-control": "max-age=31536000, immutable"}
            )
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        return public_url
    except Exception as e:
        log.error(f"  ✗ Upload failed for {filename}: {e}")
        return None


# ─── Category DB helpers ───────────────────────────────────────────────────────

def get_or_create_category(category_name: str, category_slug: str) -> str | None:
    """Return category ID, creating it if it doesn't exist."""
    res = supabase.table("categories").select("id").eq("slug", category_slug).execute()
    if res.data:
        return res.data[0]["id"]

    insert_res = supabase.table("categories").insert({
        "name": category_name,
        "slug": category_slug,
        "description": f"Products from the {category_name} catalog",
        "sort_order": 99
    }).execute()
    return insert_res.data[0]["id"] if insert_res.data else None


# ─── Product upsert ───────────────────────────────────────────────────────────

def upsert_product(
    category_id: str,
    product_name: str,
    group_id: str,
    short_desc: str,
    color_variants: list[dict],
    source_pdf: str
):
    """Insert or update a product in the DB."""
    slug = slugify(product_name)
    primary_image = None
    if color_variants and color_variants[0].get("images"):
        primary_image = color_variants[0]["images"][0]

    # Check if product slug already exists (from a previous run)
    existing = supabase.table("products").select("id, color_variants").eq("slug", slug).execute()
    if existing.data:
        # Merge color variants
        existing_product = existing.data[0]
        existing_variants: list = existing_product.get("color_variants") or []
        existing_names = {v["name"] for v in existing_variants}
        for cv in color_variants:
            if cv["name"] not in existing_names:
                existing_variants.append(cv)
        supabase.table("products").update({
            "color_variants": existing_variants,
            "primary_image_url": primary_image or existing_product.get("primary_image_url"),
        }).eq("id", existing_product["id"]).execute()
        log.info(f"  ↻ Updated product: {product_name}")
    else:
        supabase.table("products").insert({
            "category_id": category_id,
            "name": product_name,
            "slug": slug,
            "short_desc": short_desc[:200] if short_desc else None,
            "min_order_qty": 50,
            "lead_time_days": 15,
            "color_variants": color_variants,
            "primary_image_url": primary_image,
            "source_pdf": source_pdf,
            "is_active": True,
            "is_featured": False,
        }).execute()
        log.info(f"  ✓ Inserted product: {product_name}")


# ─── Main pipeline ─────────────────────────────────────────────────────────────

def ensure_bucket():
    """Create product-images bucket if it doesn't exist."""
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if BUCKET_NAME not in bucket_names:
            supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
            log.info(f"Created storage bucket: {BUCKET_NAME}")
    except Exception as e:
        log.warning(f"Bucket check failed (may already exist): {e}")


def process_pdf(pdf_path: Path):
    log.info(f"\n{'='*60}")
    log.info(f"Processing: {pdf_path.name}")
    log.info('='*60)

    category_name = category_from_filename(pdf_path.name)
    category_slug = slugify(Path(pdf_path.stem).name)

    category_id = get_or_create_category(category_name, category_slug)
    if not category_id:
        log.error(f"Could not get/create category for {pdf_path.name}")
        return

    # Extract pages
    pages = extract_pages_from_pdf(pdf_path)
    if not pages:
        log.warning(f"No pages extracted from {pdf_path.name}")
        return

    # Gemini analysis in batches
    all_analysis: list[dict | None] = []
    for batch_start in range(0, len(pages), VISION_BATCH_SIZE):
        batch = pages[batch_start:batch_start + VISION_BATCH_SIZE]
        log.info(f"  Analyzing pages {batch_start}–{batch_start + len(batch) - 1} with Gemini...")
        results = analyze_pages_with_gemini(batch, batch_start)
        all_analysis.extend(results)
        time.sleep(2)  # Rate limiting

    # Group by group_id
    groups: dict[str, dict] = {}
    for page_idx, analysis in enumerate(all_analysis):
        if not analysis or not isinstance(analysis, dict):
            continue
        gid = analysis.get("group_id")
        if not gid:
            continue

        if gid not in groups:
            groups[gid] = {
                "product_name": analysis.get("product_name", "Unknown Product"),
                "short_desc": analysis.get("short_desc", ""),
                "color_variants_map": {}  # color_name -> {hex, page_indices[]}
            }

        color_name = analysis.get("color_name") or "Standard"
        color_hex = analysis.get("color_hex") or "#888888"

        if color_name not in groups[gid]["color_variants_map"]:
            groups[gid]["color_variants_map"][color_name] = {
                "hex": color_hex,
                "page_indices": []
            }
        groups[gid]["color_variants_map"][color_name]["page_indices"].append(page_idx)

    log.info(f"  Identified {len(groups)} product groups")

    # Upload images and build color_variants array
    for gid, group in groups.items():
        log.info(f"\n  Product: {group['product_name']} [{gid}]")
        color_variants = []

        for color_name, color_data in group["color_variants_map"].items():
            image_urls = []
            for img_idx, page_idx in enumerate(color_data["page_indices"]):
                if page_idx >= len(pages):
                    continue
                page_img = pages[page_idx]
                webp_bytes = compress_to_webp(page_img)
                kb = len(webp_bytes) / 1024
                log.info(f"    Uploading {color_name} image {img_idx} ({kb:.0f}KB)...")
                url = upload_image_to_supabase(
                    webp_bytes, category_slug, gid, color_name, img_idx
                )
                if url:
                    image_urls.append(url)

            if image_urls:
                color_variants.append({
                    "name": color_name,
                    "hex": color_data["hex"],
                    "images": image_urls
                })

        if color_variants:
            upsert_product(
                category_id=category_id,
                product_name=group["product_name"],
                group_id=gid,
                short_desc=group["short_desc"],
                color_variants=color_variants,
                source_pdf=pdf_path.name
            )


def main():
    log.info("🚀 Outflank Product Upload Pipeline Starting")
    log.info(f"   PDF directory: {PDF_DIR}")
    log.info(f"   Supabase URL: {SUPABASE_URL[:40]}...")

    ensure_bucket()

    pdf_files = sorted(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        log.error(f"No PDF files found in {PDF_DIR}")
        return

    log.info(f"Found {len(pdf_files)} PDF(s) to process:")
    for p in pdf_files:
        log.info(f"  - {p.name}")

    for pdf_path in pdf_files:
        # Skip ppt file if accidentally included
        if "ppt" in pdf_path.name.lower():
            log.info(f"Skipping: {pdf_path.name}")
            continue
        try:
            process_pdf(pdf_path)
        except Exception as e:
            log.error(f"Failed processing {pdf_path.name}: {e}", exc_info=True)

    log.info("\n✅ Upload pipeline complete!")


if __name__ == "__main__":
    main()
