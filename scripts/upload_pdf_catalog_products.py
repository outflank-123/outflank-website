#!/usr/bin/env python3
"""
Catalog Products Ingestion Script
Extracts unique products from 17 PDF catalogs in pdf/ directory:
1. Deduplication: Only unique products across all pages/catalogs are added.
2. WebP Compression: Full-page catalog plates compressed strictly <= 30 KB.
3. Supabase Storage: Uploads to 'product-images' bucket.
4. Database: Upserts distinct products with extracted codes, names, specs, and category relations.
"""

import os
import re
import sys
import glob
import time
import io
import uuid
from typing import Dict, List, Optional, Set, Tuple
from concurrent.futures import ThreadPoolExecutor

import pymupdf
import pytesseract
from PIL import Image
from dotenv import dotenv_values
from supabase import create_client, Client

# --- Setup Environment & Supabase ---
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
env_vars = dotenv_values(env_path)

SUPABASE_URL = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
STORAGE_BUCKET = 'product-images'
MAX_WEBP_BYTES = 30720 # 30 KB strict limit

# --- Category Definitions ---
CATEGORY_MAPPINGS = {
    'covid-corona-epidemic-prevention-items.pdf': {
        'name': 'Healthcare & Safety',
        'slug': 'healthcare-safety',
        'desc': 'Protective gear, sanitizers, and healthcare essentials.'
    },
    'customized-products-made-to-order.pdf': {
        'name': 'Customized & Made to Order',
        'slug': 'customized-made-to-order',
        'desc': 'Bespoke corporate merchandise and made-to-order promotional items.'
    },
    'doctor-utility-pharma.pdf': {
        'name': 'Doctor & Pharma Specials',
        'slug': 'doctor-pharma-specials',
        'desc': 'Specialized medical utility items, clinic gifts, and pharma kits.'
    },
    'eco-friendly-products.pdf': {
        'name': 'Eco-Friendly & Sustainable',
        'slug': 'eco-friendly-products',
        'desc': 'Sustainable bamboo, cork, kraft paper, and biodegradable gifts.'
    },
    'electronics-and-mobile-accessories.pdf': {
        'name': 'Tech & Mobile Accessories',
        'slug': 'tech-and-power',
        'desc': 'Chargers, cables, stands, and premium tech utilities.'
    },
    'employee-joining-kits.pdf': {
        'name': 'Joining Kits & Gift Sets',
        'slug': 'joining-kits-gift-sets',
        'desc': 'Curated welcome kits and onboarding sets for team members.'
    },
    'flasks-sippers-mugs.pdf': {
        'name': 'Drinkware & Bottles',
        'slug': 'drinkware',
        'desc': 'Vacuum flasks, stainless steel mugs, and temperature bottles.'
    },
    'gift-sets.pdf': {
        'name': 'Joining Kits & Gift Sets',
        'slug': 'joining-kits-gift-sets',
        'desc': 'Executive gift combinations and luxury gift boxes.'
    },
    'home-kitchen.pdf': {
        'name': 'Home & Kitchen',
        'slug': 'home-kitchen',
        'desc': 'Modern kitchenware, storage containers, and dining accessories.'
    },
    'lamps-torches.pdf': {
        'name': 'Audio & Desk Lighting',
        'slug': 'audio-and-lighting',
        'desc': 'Desk lamps, emergency torches, and illuminated organizers.'
    },
    'multifunction-keychains.pdf': {
        'name': 'Keychains & Tools',
        'slug': 'keychains-tools',
        'desc': 'Multi-tool keychains, metallic rings, and functional accessories.'
    },
    'office-table-tops-and-stationery.pdf': {
        'name': 'Office & Desk Essentials',
        'slug': 'office-and-desk',
        'desc': 'Desk organizers, memo pads, pens, and table accessories.'
    },
    'plastic-bottles-sippers-shakers.pdf': {
        'name': 'Drinkware & Bottles',
        'slug': 'drinkware',
        'desc': 'BPA-free plastic sippers, sports bottles, and protein shakers.'
    },
    'power-banks.pdf': {
        'name': 'Tech & Mobile Accessories',
        'slug': 'tech-and-power',
        'desc': 'High-capacity power banks, slim battery packs, and wireless banks.'
    },
    'speakers-headphones-earphones.pdf': {
        'name': 'Audio & Desk Lighting',
        'slug': 'audio-and-lighting',
        'desc': 'Bluetooth speakers, premium headphones, and conference audio.'
    },
    'table-wall-clocks.pdf': {
        'name': 'Clocks & Timepieces',
        'slug': 'clocks-timepieces',
        'desc': 'Executive table clocks, wall timepieces, and digital clocks.'
    },
    'work-from-home.pdf': {
        'name': 'Work From Home Essentials',
        'slug': 'work-from-home',
        'desc': 'Ergonomic stands, lap desks, desk mats, and remote work kits.'
    },
}

# --- Cache Categories in Database ---
category_cache: Dict[str, str] = {}

def init_categories():
    print("Synchronizing categories in database...")
    res = supabase.from_('categories').select('id, name, slug').execute()
    existing = {c['slug']: c['id'] for c in res.data}
    
    for _, cat_info in CATEGORY_MAPPINGS.items():
        slug = cat_info['slug']
        if slug in existing:
            category_cache[slug] = existing[slug]
        else:
            insert_res = supabase.from_('categories').insert({
                'name': cat_info['name'],
                'slug': slug,
                'description': cat_info['desc']
            }).execute()
            if insert_res.data:
                category_cache[slug] = insert_res.data[0]['id']
                print(f"Created new category: {cat_info['name']} ({slug})")
            else:
                print(f"Warning: Could not create category {slug}")

# --- Text Extraction & Cleaning Helper Functions ---

CODE_PATTERNS = [
    re.compile(r'(?:Product\s*Code|Item\s*Code|Model\s*Code|Code)\s*[:\-]?\s*([A-Z]\s*\d{1,4}[a-z]?|[A-Z]{1,3}\d{1,4}[a-z]?|[A-Z0-9/-]{2,8})', re.IGNORECASE),
    re.compile(r'-\s*([A-Z0-9]{2,6}[a-z]?)\s*$', re.MULTILINE),
    re.compile(r'\b([A-Z]\s*\d{2,4}[a-z]?)\b'),
]

DISCARD_WORDS = {
    'all trademarks are property of their respective owners',
    'shown here for demo purpose only',
    'shown here for demo purposes only',
    'packing in gift box',
    'just tap your phone',
    'patent pending',
    'catalogue',
    'catalog',
    'special edition',
    'doctor utility',
    'pharma specials',
    'new arrival',
    'index',
    'contents',
    'welcome',
    'thank you'
}

def clean_ocr_line(line: str) -> str:
    line = re.sub(r'[«»¢~*#|_—=\\\[\]]+', ' ', line)
    line = re.sub(r'\s+', ' ', line).strip()
    return line

def extract_product_code(text: str) -> Optional[str]:
    for pat in CODE_PATTERNS:
        match = pat.search(text)
        if match:
            candidate = match.group(1).strip()
            # Clean candidate
            candidate = re.sub(r'[^A-Za-z0-9\s/-]', '', candidate).strip()
            # Filter out non-codes
            words = candidate.lower().split()
            if candidate and len(candidate) >= 2 and len(candidate) <= 12:
                if not any(w in ['the', 'and', 'for', 'with', 'page', 'side', 'set', 'box', 'gift', 'mdf', 'pen'] for w in words):
                    return ' '.join(candidate.split()).upper()
    return None

def extract_product_info(text: str, pdf_filename: str, page_num: int) -> Optional[Dict]:
    lines = [clean_ocr_line(l) for l in text.splitlines() if clean_ocr_line(l)]
    full_text_lower = text.lower()

    # Skip pure cover or disclaimer pages
    if len(text.strip()) < 35:
        return None
    if any(phrase in full_text_lower for phrase in ['table of contents', 'thank you for your business', 'corporate gift catalog 20']):
        if not any(marker in full_text_lower for marker in ['product code', 'capacity', 'material', 'stainless steel']):
            return None

    code = extract_product_code(text)
    
    # Filter lines for title candidates
    title_candidates = []
    bullet_points = []
    
    for line in lines:
        line_lower = line.lower()
        if any(dw in line_lower for dw in DISCARD_WORDS):
            continue
        if re.match(r'^(page\s*\d+|\d+\s*of\s*\d+|\d+)$', line_lower):
            continue
        if re.match(r'^(product|item|model)?\s*code\s*[:\-]', line_lower):
            continue

        # Check if line is a bullet or spec
        if re.match(r'^([+•\-\*]|\d+\.|\d+\))\s*', line) or any(s in line_lower for s in ['capacity:', 'material:', 'size:', 'dimension:', 'battery:', 'power:']):
            clean_b = re.sub(r'^([+•\-\*]|\d+\.|\d+\))\s*', '', line).strip()
            if len(clean_b) > 3:
                bullet_points.append(clean_b)
        else:
            if len(line) >= 4 and len(line) <= 90 and not any(kw in line_lower for kw in ['available in', 'colors :', 'colour :']):
                title_candidates.append(line)

    if not title_candidates and not bullet_points:
        return None

    # Derive title
    raw_title = ""
    if title_candidates:
        # Take first 1 or 2 meaningful title lines
        primary = title_candidates[0]
        if len(title_candidates) > 1 and len(primary) < 30 and not any(p in title_candidates[1].lower() for p in ['brand', 'demo', 'code']):
            raw_title = f"{primary} {title_candidates[1]}"
        else:
            raw_title = primary
    elif bullet_points:
        raw_title = bullet_points[0]

    # Clean Title formatting
    raw_title = re.sub(r'^[:\s\-\+]+', '', raw_title)
    raw_title = re.sub(r'^(ae|’|\+|b|¢|\||•|—)\s+', '', raw_title, flags=re.IGNORECASE)
    raw_title = re.sub(r'^(Out of the Box\s*(@|eee|rom bern)?\s*)', '', raw_title, flags=re.IGNORECASE)
    raw_title = re.sub(r'^(CREATIVE WAYS TO USE\s*)', '', raw_title, flags=re.IGNORECASE)
    raw_title = re.sub(r'\s+', ' ', raw_title).strip()
    # Normalize uppercase shouting into Title Case if all caps
    if raw_title.isupper():
        raw_title = raw_title.title()

    # Append code to title if not present
    title = raw_title
    if code and not code.lower() in title.lower():
        title = f"{raw_title} - {code}"

    # Build description
    desc_lines = []
    if bullet_points:
        desc_lines.append("Key Features & Specifications:")
        for bp in bullet_points[:8]:
            desc_lines.append(f"• {bp}")
    else:
        desc_lines.append(f"Premium corporate item from the {pdf_filename.replace('.pdf', '').replace('-', ' ').title()} collection.")
        if code:
            desc_lines.append(f"Product Code: {code}")

    short_desc = f"{raw_title}. Model: {code or 'Catalog Item'}. Wholesale and custom corporate branding available."

    return {
        'code': code,
        'title': title,
        'short_desc': short_desc,
        'description': "\n".join(desc_lines),
        'bullets': bullet_points
    }

# --- WebP Compression (Strictly <= 30 KB) ---

def compress_page_to_webp(page, max_bytes: int = MAX_WEBP_BYTES) -> Tuple[bytes, int, int]:
    # Render at 140 DPI
    pix = page.get_pixmap(dpi=140)
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    
    quality = 80
    while True:
        buf = io.BytesIO()
        img.save(buf, format='WEBP', quality=quality, effort=6)
        data = buf.getvalue()
        if len(data) <= max_bytes:
            return data, img.width, img.height
        
        if quality > 35:
            quality -= 10
        else:
            # Reduce resolution slightly to satisfy 30KB constraint
            w, h = img.size
            img = img.resize((int(w * 0.88), int(h * 0.88)), Image.Resampling.LANCZOS)
            quality = 65

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')[:75]

# --- Ingestion Process ---

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Upload unique catalog products")
    parser.add_argument("--file", type=str, help="Process only a specific PDF filename (e.g. covid-corona-epidemic-prevention-items.pdf)")
    parser.add_argument("--limit", type=int, help="Limit number of PDFs to process")
    args = parser.parse_args()

    init_categories()
    
    # Track seen products for deduplication across the entire session
    seen_codes: Set[str] = set()
    seen_slugs: Set[str] = set()
    
    # Pre-populate seen codes and slugs from DB
    print("Fetching existing products to avoid duplicates...")
    existing_prods = supabase.from_('products').select('id, name, slug, branding_config').execute()
    existing_by_code: Dict[str, str] = {}
    for p in (existing_prods.data or []):
        seen_slugs.add(p['slug'])
        cfg = p.get('branding_config') or {}
        p_code = cfg.get('product_code')
        if p_code:
            norm_code = re.sub(r'[^a-z0-9]', '', str(p_code).lower())
            if norm_code:
                seen_codes.add(norm_code)
                existing_by_code[norm_code] = p['id']

    print(f"Pre-loaded {len(seen_codes)} existing product codes and {len(seen_slugs)} slugs.")

    if args.file:
        target_path = os.path.join('pdf', args.file) if not args.file.startswith('pdf') else args.file
        pdf_files = [target_path]
    else:
        pdf_files = sorted(glob.glob('pdf/*.pdf'))
        if args.limit:
            pdf_files = pdf_files[:args.limit]

    print(f"\nFound {len(pdf_files)} PDF catalog file(s) to process.\n" + "=" * 60)

    total_inserted = 0
    total_appended_gallery = 0
    total_skipped = 0

    for idx, pdf_path in enumerate(pdf_files, 1):
        filename = os.path.basename(pdf_path)
        cat_info = CATEGORY_MAPPINGS.get(filename, {
            'name': 'Office & Desk Essentials',
            'slug': 'office-and-desk',
            'desc': 'Corporate office items'
        })
        category_id = category_cache.get(cat_info['slug'])

        doc = pymupdf.open(pdf_path)
        total_pages = len(doc)
        print(f"\n[{idx}/{len(pdf_files)}] {filename} ({total_pages} pages) -> Category: {cat_info['name']}")

        pdf_slug = filename.replace('.pdf', '')
        
        # We start from page index 1 (skipping cover page 0)
        start_page = 1 if total_pages > 1 else 0
        pages_to_process = list(range(start_page, total_pages))

        cat_inserted = 0
        cat_appended = 0
        cat_skipped = 0

        for p_idx in pages_to_process:
            page = doc[p_idx]
            page_num = p_idx + 1

            # 1. OCR Page
            pix_ocr = page.get_pixmap(dpi=120)
            img_ocr = Image.open(io.BytesIO(pix_ocr.tobytes('png')))
            ocr_text = pytesseract.image_to_string(img_ocr)

            # 2. Extract Info
            info = extract_product_info(ocr_text, filename, page_num)
            if not info or not info.get('title'):
                cat_skipped += 1
                total_skipped += 1
                continue

            code = info.get('code')
            norm_code = re.sub(r'[^a-z0-9]', '', code.lower()) if code else None
            base_slug = slugify(info['title'])
            
            # --- DEDUPLICATION CHECK ---
            if norm_code and norm_code in seen_codes:
                # Same product already seen!
                existing_id = existing_by_code.get(norm_code)
                if existing_id:
                    # Render WebP and append to gallery if space allows
                    try:
                        webp_data, _, _ = compress_page_to_webp(page)
                        file_name = f"page_{page_num}_{uuid.uuid4().hex[:6]}.webp"
                        storage_path = f"catalog-products/{pdf_slug}/{file_name}"
                        
                        supabase.storage.from_(STORAGE_BUCKET).upload(
                            storage_path,
                            webp_data,
                            file_options={"content-type": "image/webp", "upsert": "true"}
                        )
                        pub_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
                        
                        # Get current gallery and append
                        cur_prod = supabase.from_('products').select('image_gallery').eq('id', existing_id).single().execute()
                        gallery = cur_prod.data.get('image_gallery') or []
                        if len(gallery) < 5 and pub_url not in gallery:
                            gallery.append(pub_url)
                            supabase.from_('products').update({'image_gallery': gallery}).eq('id', existing_id).execute()
                            cat_appended += 1
                            total_appended_gallery += 1
                    except Exception as e:
                        pass
                cat_skipped += 1
                total_skipped += 1
                continue

            # 3. Compress Page to WebP strictly <= 30 KB
            webp_data, w, h = compress_page_to_webp(page)
            if len(webp_data) > MAX_WEBP_BYTES:
                print(f"  Warning: Page {page_num} size {len(webp_data)} > 30KB, skipping.")
                cat_skipped += 1
                total_skipped += 1
                continue

            # 4. Upload to Supabase Storage
            clean_code_slug = slugify(code) if code else f"p{page_num}"
            file_name = f"{clean_code_slug}_{uuid.uuid4().hex[:6]}.webp"
            storage_path = f"catalog-products/{pdf_slug}/{file_name}"

            try:
                upload_res = supabase.storage.from_(STORAGE_BUCKET).upload(
                    storage_path,
                    webp_data,
                    file_options={"content-type": "image/webp", "upsert": "true"}
                )
                pub_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
            except Exception as e:
                print(f"  Storage upload error for page {page_num}: {e}")
                cat_skipped += 1
                total_skipped += 1
                continue

            # 5. Unique Slug Generation
            slug = base_slug
            counter = 1
            while slug in seen_slugs:
                counter += 1
                slug = f"{base_slug}-{counter}"
            seen_slugs.add(slug)
            if norm_code:
                seen_codes.add(norm_code)

            # 6. Insert Product Record
            product_record = {
                'name': info['title'],
                'slug': slug,
                'category_id': category_id,
                'short_desc': info['short_desc'],
                'description': info['description'],
                'base_price': None, # Wholesale quote on inquiry
                'min_order_qty': 50,
                'lead_time_days': 7,
                'is_featured': False,
                'is_active': True,
                'is_retail': False, # Wholesale only
                'is_customizable': True,
                'primary_image_url': pub_url,
                'image_gallery': [pub_url],
                'source_pdf': f"{filename} (Page {page_num})",
                'branding_config': {
                    '_is_retail': False,
                    'source': 'pdf_catalog',
                    'product_code': code,
                    'catalog_file': filename,
                    'page_number': page_num
                },
                'tags': [cat_info['name'], 'Corporate Gift', 'Catalog Item'] + ([code] if code else [])
            }

            try:
                insert_res = supabase.from_('products').insert(product_record).execute()
                if insert_res.data:
                    new_id = insert_res.data[0]['id']
                    if norm_code:
                        existing_by_code[norm_code] = new_id
                    cat_inserted += 1
                    total_inserted += 1
                    print(f"  [+] P.{page_num}: {info['title'][:45]} | Code: {code or 'N/A'} | {len(webp_data)/1024:.1f} KB")
            except Exception as e:
                print(f"  Database insert error for page {page_num}: {e}")
                cat_skipped += 1
                total_skipped += 1

        print(f"  Summary for {filename}: {cat_inserted} new products added, {cat_appended} views appended to gallery, {cat_skipped} covers/duplicates skipped.")

    print("\n" + "=" * 60)
    print(f"INGESTION COMPLETE!")
    print(f"Total Unique Products Added: {total_inserted}")
    print(f"Total Gallery Views Appended: {total_appended_gallery}")
    print(f"Total Covers & Duplicate Pages Skipped: {total_skipped}")
    print("=" * 60)

if __name__ == '__main__':
    main()
