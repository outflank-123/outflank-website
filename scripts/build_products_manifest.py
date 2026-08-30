#!/usr/bin/env python3
"""
build_products_manifest.py
===========================
Compiles a comprehensive, unified Master Product Manifest (products_master_manifest.json)
for the Outflank Corporate Gifting catalog.

- Loads all existing products from Supabase and marks them as "completed" with live URLs.
- Populates all remaining catalog categories and products from the PDF catalog files.
- Groups multi-color products as single product entities with variant arrays (name, hex, prompt, image_url).
- Generates high-detail commercial studio photography prompts for pending AI generation.
"""

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80]

def main():
    print("🚀 Fetching live products and categories from Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Fetch Categories
    cat_res = supabase.table("categories").select("*").order("sort_order").execute()
    categories_db = cat_res.data or []
    cat_by_id = {c["id"]: c for c in categories_db}
    cat_by_slug = {c["slug"]: c for c in categories_db}

    # 2. Fetch Existing Products
    prod_res = supabase.table("products").select("*, categories(*)").execute()
    existing_products = prod_res.data or []
    print(f"✓ Found {len(existing_products)} live products in Supabase across {len(categories_db)} categories.")

    manifest = {
        "metadata": {
            "title": "Outflank Corporate Gifting - Master AI Product Manifest",
            "version": "2.0.0",
            "description": "Unified product registry across all 18 PDF catalog categories for AI image generation and Supabase synchronization.",
            "total_categories": len(categories_db),
            "completed_products_in_db": len(existing_products),
            "storage_bucket": "product-images"
        },
        "categories_summary": {},
        "products": []
    }

    processed_slugs = set()

    # Add existing completed products from Supabase
    for p in existing_products:
        cat_info = p.get("categories") or cat_by_id.get(p.get("category_id"), {})
        cat_name = cat_info.get("name", "General")
        cat_slug = cat_info.get("slug", slugify(cat_name))
        
        variants = p.get("color_variants") or []
        formatted_variants = []
        for v in variants:
            formatted_variants.append({
                "name": v.get("name", "Standard"),
                "hex": v.get("hex", "#1a1a1a"),
                "image_url": v.get("images", [None])[0] if isinstance(v.get("images"), list) and v.get("images") else None,
                "status": "completed"
            })

        prod_entry = {
            "id": p.get("id"),
            "sku": p.get("slug", "").split("-")[-1].upper() if "-" in p.get("slug", "") else p.get("slug", ""),
            "name": p.get("name"),
            "slug": p.get("slug"),
            "category_name": cat_name,
            "category_slug": cat_slug,
            "description": p.get("description") or p.get("short_desc") or "",
            "short_desc": p.get("short_desc") or "",
            "base_price": float(p.get("base_price")) if p.get("base_price") is not None else None,
            "min_order_qty": p.get("min_order_qty") or 50,
            "lead_time_days": p.get("lead_time_days") or 15,
            "is_featured": p.get("is_featured", False),
            "is_customizable": p.get("is_customizable", True),
            "primary_image_url": p.get("primary_image_url"),
            "color_variants": formatted_variants,
            "status": "completed",
            "source_pdf": p.get("source_pdf") or f"{cat_slug}.pdf"
        }
        manifest["products"].append(prod_entry)
        processed_slugs.add(p.get("slug"))

    # 3. Add Catalog Items for Pending Categories
    pending_catalog = [
        # --- DRINKWARE (flasks-sippers-mugs.pdf) ---
        {
            "sku": "F400",
            "name": "Nordic Matte Ceramic Coffee Mug with Wooden Handle",
            "category_name": "Drinkware",
            "category_slug": "drinkware",
            "pdf_source": "flasks-sippers-mugs.pdf",
            "short_desc": "Modern Scandinavian ceramic mug with natural beechwood handle and spill-resistant lid.",
            "min_order_qty": 50,
            "lead_time_days": 12,
            "base_price": 450,
            "is_customizable": True,
            "variants": [
                {"name": "Matte White", "hex": "#f8f8f8", "prompt": "Minimalist matte white ceramic mug with natural beechwood handle, wooden coaster lid, soft studio lighting on clean white background, 8k commercial product shot"},
                {"name": "Charcoal Grey", "hex": "#2d3748", "prompt": "Charcoal grey matte ceramic coffee mug with light natural beechwood handle, wooden lid, studio lighting on pristine background, commercial product photo"},
                {"name": "Forest Green", "hex": "#1b4d3e", "prompt": "Deep forest green matte ceramic mug with beechwood handle, studio product shot, soft shadows, neutral backdrop"}
            ]
        },
        {
            "sku": "F500",
            "name": "HydroShield Double-Wall Vacuum Sports Bottle 750ml",
            "category_name": "Drinkware",
            "category_slug": "drinkware",
            "pdf_source": "flasks-sippers-mugs.pdf",
            "short_desc": "Premium 750ml double-wall insulated stainless steel sports bottle with carabiner loop cap.",
            "min_order_qty": 50,
            "lead_time_days": 14,
            "base_price": 650,
            "is_customizable": True,
            "variants": [
                {"name": "Midnight Black", "hex": "#1a1a1a", "prompt": "750ml matte black stainless steel sports bottle with ergonomic powder coating and carabiner loop lid, studio lighting, clean background"},
                {"name": "Cobalt Blue", "hex": "#0047ab", "prompt": "750ml cobalt blue insulated sports bottle with sleek powder coat finish, studio product photography, clean white background"},
                {"name": "Rose Gold", "hex": "#b76e79", "prompt": "750ml metallic rose gold vacuum insulated bottle with stainless steel accents, commercial lighting, clean background"}
            ]
        },
        {
            "sku": "F600",
            "name": "Smart Temperature Display Vacuum Flask",
            "category_name": "Drinkware",
            "category_slug": "drinkware",
            "pdf_source": "flasks-sippers-mugs.pdf",
            "short_desc": "500ml vacuum insulated bottle featuring an integrated LED touch temperature readout lid.",
            "min_order_qty": 50,
            "lead_time_days": 15,
            "base_price": 550,
            "is_customizable": True,
            "variants": [
                {"name": "Onyx Black", "hex": "#111111", "prompt": "Matte black smart insulated flask with glowing LED temperature display on top lid showing 55°C, studio product photography"},
                {"name": "Ruby Red", "hex": "#c41e3a", "prompt": "Ruby red matte smart vacuum flask with illuminated temperature display cap, commercial studio shot on white background"}
            ]
        },

        # --- ECO-FRIENDLY PRODUCTS (eco-friendly-products.pdf) ---
        {
            "sku": "ECO-101",
            "name": "Plantable Seed Paper Stationery Gift Set",
            "category_name": "Eco-Friendly Products",
            "category_slug": "eco-friendly-products",
            "pdf_source": "eco-friendly-products.pdf",
            "short_desc": "100% biodegradable stationery set with plantable seed pencils, notebook, and plantable gift box.",
            "min_order_qty": 100,
            "lead_time_days": 10,
            "base_price": 380,
            "is_customizable": True,
            "variants": [
                {"name": "Kraft Natural", "hex": "#c8ad8d", "prompt": "Eco-friendly kraft stationery gift set with plantable seed pencils, recycled handmade paper notebook, green seed capsule tips, studio product photo on crisp background"}
            ]
        },
        {
            "sku": "ECO-102",
            "name": "Wheat Straw Fast Wireless Charging Pad",
            "category_name": "Eco-Friendly Products",
            "category_slug": "eco-friendly-products",
            "pdf_source": "eco-friendly-products.pdf",
            "short_desc": "Eco-conscious 15W Qi fast wireless charger crafted from natural biodegradable wheat straw composite.",
            "min_order_qty": 50,
            "lead_time_days": 14,
            "base_price": 520,
            "is_customizable": True,
            "variants": [
                {"name": "Natural Oatmeal", "hex": "#e3dac9", "prompt": "Eco-friendly round wireless charging pad made of speckled wheat straw bioplastic, minimalist desk accessory, clean studio shot"},
                {"name": "Sage Green", "hex": "#9caf88", "prompt": "Eco-friendly sage green speckled wheat straw wireless charger, minimalist studio lighting on white backdrop"}
            ]
        },
        {
            "sku": "ECO-103",
            "name": "Bamboo Desktop Organizer with Phone Stand",
            "category_name": "Eco-Friendly Products",
            "category_slug": "eco-friendly-products",
            "pdf_source": "eco-friendly-products.pdf",
            "short_desc": "Crafted from sustainable solid bamboo with dedicated slots for smartphone, pens, business cards, and sticky notes.",
            "min_order_qty": 50,
            "lead_time_days": 12,
            "base_price": 590,
            "is_customizable": True,
            "variants": [
                {"name": "Natural Bamboo", "hex": "#d2b48c", "prompt": "Premium solid bamboo wood desktop organizer caddy with integrated smartphone dock, pen holder slots, elegant wood grain, studio photography"}
            ]
        },

        # --- ELECTRONICS & MOBILE ACCESSORIES (electronics-and-mobile-accessories.pdf) ---
        {
            "sku": "EL-101",
            "name": "Multi-Device 3-in-1 Magnetic Foldable Wireless Charging Station",
            "category_name": "Electronics & Mobile Accessories",
            "category_slug": "electronics-and-mobile-accessories",
            "pdf_source": "electronics-and-mobile-accessories.pdf",
            "short_desc": "Foldable 3-in-1 MagSafe compatible charger for iPhone, Apple Watch, and AirPods in a compact travel form factor.",
            "min_order_qty": 50,
            "lead_time_days": 15,
            "base_price": 1450,
            "is_customizable": True,
            "variants": [
                {"name": "Space Grey", "hex": "#383838", "prompt": "Sleek 3-in-1 magnetic folding wireless charging dock in space grey matte aluminum finish, floating phone dock, clean studio lighting"},
                {"name": "Silver White", "hex": "#f0f0f0", "prompt": "Premium 3-in-1 white and silver folding wireless charging stand for phone watch and earbuds, studio lighting on pristine background"}
            ]
        },
        {
            "sku": "EL-102",
            "name": "OmniCharge 6-in-1 Fast Charging Cable with Keyring",
            "category_name": "Electronics & Mobile Accessories",
            "category_slug": "electronics-and-mobile-accessories",
            "pdf_source": "electronics-and-mobile-accessories.pdf",
            "short_desc": "Compact universal charging cable with USB-C, Lightning, Micro-USB, and USB-A connectors encased in a magnetic carry clip.",
            "min_order_qty": 100,
            "lead_time_days": 10,
            "base_price": 280,
            "is_customizable": True,
            "variants": [
                {"name": "Matte Black", "hex": "#1a1a1a", "prompt": "Compact braided black multi-head universal charging cable with magnetic keychain adapter, studio product photography"},
                {"name": "Vibrant Red", "hex": "#e3231c", "prompt": "Braided red nylon 6-in-1 multi-connector keychain cable with aluminum connectors, clean white studio background"}
            ]
        },
        {
            "sku": "EL-103",
            "name": "Universal International Travel Adapter with Dual USB-C PD",
            "category_name": "Electronics & Mobile Accessories",
            "category_slug": "electronics-and-mobile-accessories",
            "pdf_source": "electronics-and-mobile-accessories.pdf",
            "short_desc": "All-in-one worldwide travel adapter supporting US, EU, UK, AU plugs with 35W GaN fast charging ports.",
            "min_order_qty": 50,
            "lead_time_days": 15,
            "base_price": 890,
            "is_customizable": True,
            "variants": [
                {"name": "Matte Black", "hex": "#1a1a1a", "prompt": "Compact universal all-in-one travel plug adapter in matte black finish with dual USB-C ports, slider pins, studio lighting"},
                {"name": "Arctic White", "hex": "#ffffff", "prompt": "Universal travel adapter in clean arctic white with silver slider buttons and USB-C ports, studio product shot"}
            ]
        },

        # --- GIFT SETS (gift-sets.pdf) ---
        {
            "sku": "GS-101",
            "name": "Executive Luxe Corporate 4-in-1 Gift Box",
            "category_name": "Gift Sets",
            "category_slug": "gift-sets",
            "pdf_source": "gift-sets.pdf",
            "short_desc": "Curated executive hamper containing a faux-leather A5 diary, metal stylus pen, 500ml vacuum flask, and leather keychain.",
            "min_order_qty": 30,
            "lead_time_days": 15,
            "base_price": 1250,
            "is_customizable": True,
            "variants": [
                {"name": "Executive Black Box", "hex": "#1a1a1a", "prompt": "Luxury matte black corporate gift hamper box laid open showing black thermal flask, leather journal, rollerball pen, and keychain nestled in velvet foam cutouts, premium studio lighting"},
                {"name": "Cognac Brown & Tan", "hex": "#8b5a2b", "prompt": "Luxury corporate gift box with tan brown leather notebook, bronze metal pen, and copper flask inside magnetic gift packaging, studio lighting"}
            ]
        },
        {
            "sku": "GS-102",
            "name": "Tech Enthusiast Power & Audio Duo Gift Set",
            "category_name": "Gift Sets",
            "category_slug": "gift-sets",
            "pdf_source": "gift-sets.pdf",
            "short_desc": "High-impact tech gift pairing a 10,000mAh magnetic power bank and true wireless stereo earbuds in a hard-shell gift box.",
            "min_order_qty": 30,
            "lead_time_days": 15,
            "base_price": 1850,
            "is_customizable": True,
            "variants": [
                {"name": "Midnight Black", "hex": "#1a1a1a", "prompt": "Tech gift set unboxed with matte black wireless power bank and matching TWS earbuds inside custom EVA foam presentation box, studio lighting"}
            ]
        },

        # --- OFFICE DESK & STATIONERY (office-table-tops-and-stationery.pdf) ---
        {
            "sku": "OF-101",
            "name": "Executive PU Leather Desk Mat with Magnetic Cable Organizer",
            "category_name": "Office Desk & Stationery",
            "category_slug": "office-table-tops-and-stationery",
            "pdf_source": "office-table-tops-and-stationery.pdf",
            "short_desc": "90x40cm waterproof dual-sided faux leather desk blotter pad with integrated magnetic cable holder.",
            "min_order_qty": 50,
            "lead_time_days": 12,
            "base_price": 550,
            "is_customizable": True,
            "variants": [
                {"name": "Black & Red", "hex": "#1a1a1a", "prompt": "Premium dual-sided faux leather desk blotter pad laid out with laptop and mouse, clean studio setup, smooth edge stitching"},
                {"name": "Navy Blue & Yellow", "hex": "#002060", "prompt": "Navy blue leather desk pad mat with subtle yellow stitching, minimalist workstation setup, studio product shot"}
            ]
        },
        {
            "sku": "OF-102",
            "name": "Rotary Metal Perpetual Calendar Desk Clock & Pen Stand",
            "category_name": "Office Desk & Stationery",
            "category_slug": "office-table-tops-and-stationery",
            "pdf_source": "office-table-tops-and-stationery.pdf",
            "short_desc": "Multi-function brushed metal desk accessory with manual wheel perpetual calendar, quartz clock, and heavy pen stand.",
            "min_order_qty": 50,
            "lead_time_days": 14,
            "base_price": 680,
            "is_customizable": True,
            "variants": [
                {"name": "Brushed Silver", "hex": "#c0c0c0", "prompt": "Brushed silver aluminum perpetual calendar desk accessory with quartz clock dial and pen rest, clean modern office studio lighting"}
            ]
        },

        # --- HOME & KITCHEN (home-kitchen.pdf) ---
        {
            "sku": "HK-101",
            "name": "Electric Salt & Pepper Gravity Grinder Set",
            "category_name": "Home & Kitchen",
            "category_slug": "home-kitchen",
            "pdf_source": "home-kitchen.pdf",
            "short_desc": "Automatic one-handed gravity-tilt electric spice mill set with LED light and adjustable ceramic coarseness.",
            "min_order_qty": 50,
            "lead_time_days": 15,
            "base_price": 850,
            "is_customizable": True,
            "variants": [
                {"name": "Brushed Stainless", "hex": "#d4d4d8", "prompt": "Set of 2 modern automatic electric gravity spice grinders in brushed stainless steel with clear acrylic spice chamber and blue LED light, studio product photo"}
            ]
        },
        {
            "sku": "HK-102",
            "name": "Insulated Stainless Steel Lunch Box with Thermal Bag",
            "category_name": "Home & Kitchen",
            "category_slug": "home-kitchen",
            "pdf_source": "home-kitchen.pdf",
            "short_desc": "Leakproof 3-tier vacuum insulated bento lunch box with stainless steel cutlery and insulated neoprene carrier.",
            "min_order_qty": 50,
            "lead_time_days": 14,
            "base_price": 720,
            "is_customizable": True,
            "variants": [
                {"name": "Graphite Grey", "hex": "#374151", "prompt": "3-tier insulated stainless steel modern bento box with matte grey exterior and matching insulated zip carry tote, clean studio photography"}
            ]
        },

        # --- WORK FROM HOME (work-from-home.pdf) ---
        {
            "sku": "WFH-101",
            "name": "Ergonomic Adjustable Aluminum Laptop Riser Stand",
            "category_name": "Work From Home",
            "category_slug": "work-from-home",
            "pdf_source": "work-from-home.pdf",
            "short_desc": "Fully collapsible heavy-duty aluminum laptop stand with dual-hinge angle adjustment and heat-dissipation ventilation.",
            "min_order_qty": 50,
            "lead_time_days": 12,
            "base_price": 950,
            "is_customizable": True,
            "variants": [
                {"name": "Space Grey", "hex": "#4b5563", "prompt": "Sleek ergonomic space grey aluminum laptop riser stand with silicone protective pads, studio lighting on clean white background"},
                {"name": "Silver", "hex": "#e5e7eb", "prompt": "Silver anodized aluminum folding laptop stand, studio product photography, clean shadows"}
            ]
        },
        {
            "sku": "WFH-102",
            "name": "USB-Powered LED Monitor Light Bar with Touch Dimmer",
            "category_name": "Work From Home",
            "category_slug": "work-from-home",
            "pdf_source": "work-from-home.pdf",
            "short_desc": "Screen-hanging desk light bar with asymmetric optical design, no screen glare, 3 color temperatures, and touch brightness controls.",
            "min_order_qty": 50,
            "lead_time_days": 15,
            "base_price": 1150,
            "is_customizable": True,
            "variants": [
                {"name": "Matte Black", "hex": "#1a1a1a", "prompt": "Slim matte black LED monitor light bar mounted over a computer screen with touch controls, warm ambient light, studio setting"}
            ]
        },

        # --- TABLE & WALL CLOCKS (table-wall-clocks.pdf) ---
        {
            "sku": "CLK-101",
            "name": "Nordic Wooden LED Digital Alarm Clock with Wireless Charging",
            "category_name": "Table & Wall Clocks",
            "category_slug": "table-wall-clocks",
            "pdf_source": "table-wall-clocks.pdf",
            "short_desc": "Triangular wooden desk clock with hidden white LED time/temperature display and built-in Qi wireless charging top surface.",
            "min_order_qty": 50,
            "lead_time_days": 14,
            "base_price": 790,
            "is_customizable": True,
            "variants": [
                {"name": "Walnut Wood", "hex": "#5c4033", "prompt": "Minimalist triangular dark walnut wood digital desk clock with bright white LED time readout shining through wood grain and top wireless charging pad, studio shot"},
                {"name": "Light Bamboo", "hex": "#d2b48c", "prompt": "Light natural bamboo wooden digital desk alarm clock with white digital LED numbers, modern studio product photography"}
            ]
        },

        # --- MULTIFUNCTION KEYCHAINS (multifunction-keychains.pdf) ---
        {
            "sku": "KC-101",
            "name": "Precision Titanium 8-in-1 EDC Multi-Tool Keychain",
            "category_name": "Multifunction Keychains",
            "category_slug": "multifunction-keychains",
            "pdf_source": "multifunction-keychains.pdf",
            "short_desc": "Compact aircraft-grade metal pocket multi-tool featuring bottle opener, pry bar, hex wrenches, and box cutter.",
            "min_order_qty": 100,
            "lead_time_days": 10,
            "base_price": 190,
            "is_customizable": True,
            "variants": [
                {"name": "Titanium Grey", "hex": "#555555", "prompt": "Precision CNC machined titanium pocket multi-tool keychain with laser-etched ruler and bottle opener, studio product photo on white background"},
                {"name": "Matte Black", "hex": "#1a1a1a", "prompt": "Matte black coated steel multi-tool keychain tool with heavy-duty key ring, clean commercial studio lighting"}
            ]
        },

        # --- PLASTIC BOTTLES & SHAKERS (plastic-bottles-sippers-shakers.pdf) ---
        {
            "sku": "PBS-101",
            "name": "Tritan Pro Gym Shaker Bottle with Wire Whisk Ball 700ml",
            "category_name": "Plastic Bottles & Shakers",
            "category_slug": "plastic-bottles-sippers-shakers",
            "pdf_source": "plastic-bottles-sippers-shakers.pdf",
            "short_desc": "BPA-free durable Eastman Tritan fitness shaker with leak-proof flip cap, measurement markings, and stainless blending ball.",
            "min_order_qty": 100,
            "lead_time_days": 10,
            "base_price": 260,
            "is_customizable": True,
            "variants": [
                {"name": "Smoked Black", "hex": "#222222", "prompt": "700ml smoked translucent tritan gym protein shaker bottle with matte black leakproof lid and stainless steel mixer ball inside, studio product shot"},
                {"name": "Clear & Cyan", "hex": "#00bcd4", "prompt": "Clear tritan fitness shaker bottle with cyan blue sports cap and silicone carrying loop, clean white studio background"}
            ]
        },

        # --- DOCTOR & PHARMA UTILITY (doctor-utility-pharma.pdf) ---
        {
            "sku": "DR-101",
            "name": "Medical Grade Stylus Pen with Integrated LED Pupil Torch",
            "category_name": "Doctor & Pharma Utility",
            "category_slug": "doctor-utility-pharma",
            "pdf_source": "doctor-utility-pharma.pdf",
            "short_desc": "High-precision diagnostic penlight for medical professionals with pupil gauge scale, touch stylus, and rollerball tip.",
            "min_order_qty": 100,
            "lead_time_days": 12,
            "base_price": 220,
            "is_customizable": True,
            "variants": [
                {"name": "Hospital Silver", "hex": "#d1d5db", "prompt": "Sleek stainless steel medical diagnostic penlight with pupil measurement scale printed on barrel, LED tip light, clean medical studio shot"},
                {"name": "Navy Blue", "hex": "#1e3a8a", "prompt": "Navy blue aluminum medical utility pen with integrated LED diagnostic light and silver pocket clip, studio lighting"}
            ]
        },

        # --- COVID & PREVENTION ITEMS (covid-corona-epidemic-prevention-items.pdf) ---
        {
            "sku": "COV-101",
            "name": "Automatic Touchless Mist Hand Sanitizer Dispenser 45ml",
            "category_name": "Covid & Prevention Items",
            "category_slug": "covid-corona-epidemic-prevention-items",
            "pdf_source": "covid-corona-epidemic-prevention-items.pdf",
            "short_desc": "Pocket-sized USB rechargeable infrared sensor nano-mist sanitizer sprayer with ambient LED indicator.",
            "min_order_qty": 100,
            "lead_time_days": 10,
            "base_price": 320,
            "is_customizable": True,
            "variants": [
                {"name": "Pure White", "hex": "#ffffff", "prompt": "Pocket-size white touchless infrared hand sanitizer nano mist sprayer with clear reservoir base, studio product photography"}
            ]
        },

        # --- CUSTOMIZED PRODUCTS (customized-products-made-to-order.pdf) ---
        {
            "sku": "CUST-101",
            "name": "Custom 3D Soft PVC Molded USB Flash Drive",
            "category_name": "Customized Products",
            "category_slug": "customized-products-made-to-order",
            "pdf_source": "customized-products-made-to-order.pdf",
            "short_desc": "Bespoke 3D molded rubber USB memory drive manufactured to match custom corporate logos and mascots.",
            "min_order_qty": 200,
            "lead_time_days": 20,
            "base_price": 340,
            "is_customizable": True,
            "variants": [
                {"name": "Custom 3D Multi-Color", "hex": "#e3231c", "prompt": "Custom 3D molded soft PVC corporate USB flash drive shaped like a branded mascot with removable cap, colorful commercial studio photography"}
            ]
        }
    ]

    for item in pending_catalog:
        slug = slugify(f"{item['name']} {item['sku']}")
        if slug in processed_slugs:
            continue

        formatted_variants = []
        for v in item["variants"]:
            formatted_variants.append({
                "name": v["name"],
                "hex": v["hex"],
                "image_url": None,
                "image_prompt": v.get("prompt"),
                "status": "pending"
            })

        prod_entry = {
            "sku": item["sku"],
            "name": item["name"],
            "slug": slug,
            "category_name": item["category_name"],
            "category_slug": item["category_slug"],
            "description": item["short_desc"],
            "short_desc": item["short_desc"],
            "base_price": item["base_price"],
            "min_order_qty": item["min_order_qty"],
            "lead_time_days": item["lead_time_days"],
            "is_featured": False,
            "is_customizable": item["is_customizable"],
            "primary_image_url": None,
            "color_variants": formatted_variants,
            "status": "pending",
            "source_pdf": item["pdf_source"],
            "ai_prompt_template": item["variants"][0].get("prompt") if item["variants"] else ""
        }
        manifest["products"].append(prod_entry)
        processed_slugs.add(slug)

    # Calculate category summary
    for p in manifest["products"]:
        cname = p["category_name"]
        if cname not in manifest["categories_summary"]:
            manifest["categories_summary"][cname] = {
                "total": 0,
                "completed": 0,
                "pending": 0,
                "category_slug": p["category_slug"],
                "source_pdf": p["source_pdf"]
            }
        manifest["categories_summary"][cname]["total"] += 1
        if p["status"] == "completed":
            manifest["categories_summary"][cname]["completed"] += 1
        else:
            manifest["categories_summary"][cname]["pending"] += 1

    out_path = Path(__file__).parent.parent / "products_master_manifest.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\n🎉 Master Product Manifest created successfully at: {out_path.name}")
    print(f"📊 Total products cataloged: {len(manifest['products'])}")
    print(f"   ✓ Completed in Supabase: {len([p for p in manifest['products'] if p['status'] == 'completed'])}")
    print(f"   ⏳ Pending AI Image Generation: {len([p for p in manifest['products'] if p['status'] == 'pending'])}")
    print("\nCategory breakdown:")
    for cname, stats in manifest["categories_summary"].items():
        status_tag = "✅ COMPLETE" if stats["pending"] == 0 else f"⏳ {stats['pending']} PENDING"
        print(f"  • {cname:35} Total: {stats['total']:2} | Done: {stats['completed']:2} | {status_tag}")

if __name__ == "__main__":
    main()
