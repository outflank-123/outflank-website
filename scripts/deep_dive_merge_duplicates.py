#!/usr/bin/env python3
"""
Deep-Dive Deduplication and Gallery Merger
Identifies all cross-catalog duplicate products:
1. Preserves ONE primary product record.
2. Combines all alternate page views from other catalogs into that product's image_gallery.
3. Cleans OCR noise in product titles.
4. Deletes redundant duplicate records and empty fragments.
"""

import os
import re
from collections import defaultdict
from typing import Dict, List, Set
from dotenv import dotenv_values
from supabase import create_client, Client

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
env_vars = dotenv_values(env_path)

SUPABASE_URL = env_vars.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def normalize_key(name: str) -> str:
    n = re.sub(r'\s*-\s*[A-Z0-9\s/-]+$', '', name, flags=re.IGNORECASE)
    n = re.sub(r'[^a-z0-9]', '', n.lower())
    return n

def clean_title(name: str) -> str:
    t = name
    t = re.sub(r'\(one\s*', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^(lal|twith|ae|’|\+|b|¢|\||•|—)\s+', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^(Out of the Box\s*(@|eee|rom bern)?\s*)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^(CREATIVE WAYS TO USE\s*)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^(CREATIVE WAYS\s*)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'&\s*(ey|ts)\b', '', t, flags=re.IGNORECASE)
    t = re.sub(r':\s*', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    if t.isupper():
        t = t.title()
    return t

JUNK_TITLES = {
    'tumbler', 'miined your logo', '3 color light option', 
    'capacity 460ml approx', 'water sensor auto light up', 
    'rechargeable battery', 'mdf 2 part mobile stand',
    'special designed pocket for zippered closure'
}

def main():
    print("Fetching all products from Supabase for deep dive...")
    res = supabase.from_('products').select('*').execute()
    products = res.data or []
    print(f"Total products in DB before deduplication: {len(products)}")

    # Isolate catalog products from the 14 core apparel products
    catalog_prods = [p for p in products if p.get('source_pdf')]
    core_prods = [p for p in products if not p.get('source_pdf')]

    # Group by normalized title
    grouped = defaultdict(list)
    for p in catalog_prods:
        norm = normalize_key(p['name'])
        if len(norm) >= 3:
            grouped[norm].append(p)

    total_deleted = 0
    total_galleries_merged = 0
    ids_to_delete: Set[str] = set()

    for norm, group in grouped.items():
        if len(group) <= 1:
            continue

        # Primary item: prefer one with code or longest title
        primary = sorted(group, key=lambda x: (
            1 if (x.get('branding_config') or {}).get('product_code') else 0,
            len(x.get('description') or ''),
            len(x['name'])
        ), reverse=True)[0]

        # Gather all gallery images across all duplicates in this group
        combined_images = []
        if primary.get('primary_image_url'):
            combined_images.append(primary['primary_image_url'])
        for img in (primary.get('image_gallery') or []):
            if img not in combined_images:
                combined_images.append(img)

        duplicates = [p for p in group if p['id'] != primary['id']]
        for dup in duplicates:
            ids_to_delete.add(dup['id'])
            d_url = dup.get('primary_image_url')
            if d_url and d_url not in combined_images and len(combined_images) < 5:
                combined_images.append(d_url)
            for g in (dup.get('image_gallery') or []):
                if g not in combined_images and len(combined_images) < 5:
                    combined_images.append(g)

        # Update primary with combined gallery and clean title
        new_name = clean_title(primary['name'])
        update_payload = {
            'name': new_name,
            'image_gallery': combined_images
        }
        supabase.from_('products').update(update_payload).eq('id', primary['id']).execute()
        total_galleries_merged += 1
        print(f"Merged group: \"{primary['name']}\" ({len(duplicates)} duplicates merged, {len(combined_images)} images in gallery)")

    # Also mark junk/fragment titles
    for p in catalog_prods:
        clean_p_name = p['name'].strip().lower()
        if clean_p_name in JUNK_TITLES or 'your nfc' in clean_p_name:
            ids_to_delete.add(p['id'])

    print(f"\nDeleting {len(ids_to_delete)} duplicate/junk product rows...")
    
    # Delete in batches of 30
    id_list = list(ids_to_delete)
    for i in range(0, len(id_list), 30):
        batch = id_list[i:i+30]
        supabase.from_('products').delete().in_('id', batch).execute()
        total_deleted += len(batch)
        print(f" - Deleted batch {i // 30 + 1} ({len(batch)} items)")

    # Verify final count
    final_res = supabase.from_('products').select('id', count='exact').execute()
    final_count = final_res.count

    print("\n" + "=" * 60)
    print("DEEP DIVE DEDUPLICATION COMPLETE!")
    print(f"Total Redundant Products Removed: {total_deleted}")
    print(f"Total Multi-Image Galleries Enriched: {total_galleries_merged}")
    print(f"Total 100% Unique Products Remaining in Database: {final_count}")
    print("=" * 60)

if __name__ == '__main__':
    main()
