#!/usr/bin/env python3
"""
consolidate_categories.py
==========================
Consolidates the 20 scattered/duplicate categories into 7 clean,
industry-standard corporate gifting categories, reassigns all product foreign keys,
and cleans up unused/redundant category records.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

TARGET_CATEGORIES = [
    {
        "name": "Apparel & T-Shirts",
        "slug": "apparel-t-shirts",
        "description": "Premium corporate polo t-shirts, round neck tees, dri-fit activewear, and custom branded team hoodies.",
        "icon_name": "Shirt",
        "sort_order": 1,
        "source_slugs": ["corporate-apparel-t-shirts", "apparel-t-shirts"]
    },
    {
        "name": "Joining Kits & Gift Sets",
        "slug": "joining-kits-gift-sets",
        "description": "Curated employee onboarding welcome hampers, executive corporate gift boxes, and festive combos.",
        "icon_name": "Package",
        "sort_order": 2,
        "source_slugs": ["employee-joining-kits", "gift-sets"]
    },
    {
        "name": "Drinkware & Bottles",
        "slug": "drinkware",
        "description": "Insulated vacuum flasks, smart temperature bottles, Nordic ceramic mugs, and eco tumblers.",
        "icon_name": "Coffee",
        "sort_order": 3,
        "source_slugs": ["drinkware", "flasks-sippers-mugs", "plastic-bottles-sippers-shakers"]
    },
    {
        "name": "Tech & Mobile Accessories",
        "slug": "tech-and-power",
        "description": "High-capacity power banks, wireless charging docks, universal travel adapters, and smart mobile stands.",
        "icon_name": "Smartphone",
        "sort_order": 4,
        "source_slugs": ["power-banks", "electronics-and-mobile-accessories", "electronics-accessories"]
    },
    {
        "name": "Audio & Desk Lighting",
        "slug": "audio-and-lighting",
        "description": "True wireless earbuds, ANC headphones, desktop Bluetooth speakers, and rechargeable lamps.",
        "icon_name": "Headphones",
        "sort_order": 5,
        "source_slugs": ["speakers-headphones", "speakers-headphones-earphones", "lamps-torches"]
    },
    {
        "name": "Eco-Friendly & Sustainable",
        "slug": "eco-friendly-products",
        "description": "Plantable seed paper sets, wheat straw wireless chargers, bamboo organizers, and biodegradable corporate gifts.",
        "icon_name": "Leaf",
        "sort_order": 6,
        "source_slugs": ["eco-friendly-products"]
    },
    {
        "name": "Office & Desk Essentials",
        "slug": "office-and-desk",
        "description": "Executive PU leather desk blotters, magnetic organizers, clocks, perpetual calendars, and workspace accessories.",
        "icon_name": "PenTool",
        "sort_order": 7,
        "source_slugs": [
            "office-table-tops-and-stationery",
            "table-wall-clocks",
            "multifunction-keychains",
            "doctor-utility-pharma",
            "customized-products-made-to-order",
            "home-kitchen",
            "work-from-home"
        ]
    }
]

def main():
    print("🚀 Starting Category Consolidation into 7 Streamlined Categories...\n")
    
    # 1. Get existing categories
    all_cats = supabase.table("categories").select("*").execute().data or []
    cat_by_slug = {c["slug"]: c for c in all_cats}
    cat_by_id = {c["id"]: c for c in all_cats}
    
    print(f"Current total categories in DB: {len(all_cats)}")

    # 2. Upsert target categories and track their new IDs
    target_id_map = {} # target_slug -> uuid
    for tcat in TARGET_CATEGORIES:
        existing = cat_by_slug.get(tcat["slug"])
        if existing:
            supabase.table("categories").update({
                "name": tcat["name"],
                "description": tcat["description"],
                "icon_name": tcat["icon_name"],
                "sort_order": tcat["sort_order"]
            }).eq("id", existing["id"]).execute()
            target_id_map[tcat["slug"]] = existing["id"]
            print(f"✓ Updated target category: '{tcat['name']}' ({tcat['slug']})")
        else:
            inserted = supabase.table("categories").insert({
                "name": tcat["name"],
                "slug": tcat["slug"],
                "description": tcat["description"],
                "icon_name": tcat["icon_name"],
                "sort_order": tcat["sort_order"]
            }).execute()
            target_id_map[tcat["slug"]] = inserted.data[0]["id"]
            print(f"✓ Created target category: '{tcat['name']}' ({tcat['slug']})")

    # 3. Reassign products from source slugs to target IDs
    print("\n📦 Reassigning products to consolidated categories...")
    for tcat in TARGET_CATEGORIES:
        target_id = target_id_map[tcat["slug"]]
        
        for src_slug in tcat["source_slugs"]:
            src_cat = cat_by_slug.get(src_slug)
            if not src_cat:
                continue
            
            # Find products in this source category
            prods = supabase.table("products").select("id, name").eq("category_id", src_cat["id"]).execute().data or []
            if prods:
                for p in prods:
                    supabase.table("products").update({"category_id": target_id}).eq("id", p["id"]).execute()
                print(f"  ↳ Reassigned {len(prods)} products from '{src_cat['name']}' ({src_slug}) -> '{tcat['name']}'")

    # 4. Clean up / Delete old unused redundant categories
    print("\n🧹 Cleaning up redundant categories...")
    target_ids = set(target_id_map.values())
    for old_cat in all_cats:
        if old_cat["id"] not in target_ids:
            # Verify no products remain
            remaining = supabase.table("products").select("id").eq("category_id", old_cat["id"]).execute().data or []
            if len(remaining) == 0:
                supabase.table("categories").delete().eq("id", old_cat["id"]).execute()
                print(f"  ✓ Deleted empty legacy category: '{old_cat['name']}' ({old_cat['slug']})")
            else:
                print(f"  ⚠️ Legacy category '{old_cat['name']}' still has {len(remaining)} products! (Skipping delete)")

    # 5. Final Report
    print("\n📊 Final Category Status:")
    final_cats = supabase.table("categories").select("id, name, slug, sort_order").order("sort_order").execute().data or []
    all_prods = supabase.table("products").select("id, name, category_id").execute().data or []
    
    for c in final_cats:
        count = len([p for p in all_prods if p["category_id"] == c["id"]])
        print(f"  • [{c['sort_order']}] {c['name']} ({c['slug']}) -> {count} products")

    print(f"\n🎉 Successfully consolidated into {len(final_cats)} clean categories!")

if __name__ == "__main__":
    main()
