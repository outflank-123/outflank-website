import os
import re
from typing import Dict, List, Set, Tuple
from dotenv import dotenv_values
from supabase import create_client, Client

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
env_vars = dotenv_values(env_path)
supabase: Client = create_client(env_vars["NEXT_PUBLIC_SUPABASE_URL"], env_vars["SUPABASE_SERVICE_ROLE_KEY"])

def sanitize_title(t: str) -> str:
    # Clean leading OCR noise
    t = re.sub(r'^(lal|twith|ae|’|\+|b|¢|\||•|—|oe|eye|w|we)\s+', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^(Out of the Box\s*(@|eee|rom bern)?\s*)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^(CREATIVE WAYS TO USE\s*)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^(CREATIVE WAYS\s*)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'^\s*:\s*', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def main():
    print("Starting Comprehensive Deduplication and Merger Execution...")
    res = supabase.from_("products").select("*").execute()
    products = res.data or []
    by_id = {p["id"]: p for p in products}
    print(f"Total products before processing: {len(products)}")

    cat_page_to_prod = {}
    for p in products:
        bc = p.get("branding_config") or {}
        cat = bc.get("catalog_file") or (p.get("source_pdf") or "").split("(")[0].strip()
        page = bc.get("page_number")
        if cat and page is not None:
            cat_page_to_prod[(cat, page)] = p

    # 1. SPECIFIC MERGES
    pairs_by_cat_page = [
        # Power banks: ZapX 10 Mini (P.9) & ourPut USB-A (P.8)
        ("power-banks.pdf", 9, "power-banks.pdf", 8, "ZapX 10 Mini: 10,000 mAh Power Bank - C 193"),
        # Lamps torches: HandyBeam (P.27) & side lamp (P.28)
        ("lamps-torches.pdf", 27, "lamps-torches.pdf", 28, "HandyBeam Rechargeable Torch With Side Lamp - E 368"),
        # Customized: Tapframe (P.15) & Tapframe to use (P.16)
        ("customized-products-made-to-order.pdf", 15, "customized-products-made-to-order.pdf", 16, "Tapframe High Gloss MDF Photo Frame With NFC Tag - D 44"),
        # Doctor: Lunch bag (P.23) & containers (P.24)
        ("doctor-utility-pharma.pdf", 23, "doctor-utility-pharma.pdf", 24, "Zippy Square Lunch Box Bag With Fork, Spoon & Table Mat - H 342"),
        # Doctor: Lamp clip (P.50) & attaches to tables (P.51)
        ("doctor-utility-pharma.pdf", 50, "doctor-utility-pharma.pdf", 51, "3 Color Type-C Lamp With Mobile Stand - E 396"),
        # Eco: BamBox (P.78) & connectors (P.79)
        ("eco-friendly-products.pdf", 78, "eco-friendly-products.pdf", 79, "BamBox Travel Cable Box With Universal Connectors - C 217"),
        # Electronics: Power USB Hub (P.64) & hard disks (P.66)
        ("electronics-and-mobile-accessories.pdf", 64, "electronics-and-mobile-accessories.pdf", 66, "Power USB Hub With 4 USB Outputs & Double Side Logo Glow - C 183"),
        # Flasks: ClearSip (P.20) & frosted design (P.21)
        ("flasks-sippers-mugs.pdf", 20, "flasks-sippers-mugs.pdf", 21, "ClearSip Double Wall Borosilicate Bottle With SS Infuser Net - H 373"),
        # Flasks: Flora steel (P.74) & capacity (P.75)
        ("flasks-sippers-mugs.pdf", 74, "flasks-sippers-mugs.pdf", 75, "Flora Steel Bottle Natural - 281"),
        # Flasks: Cola 500ml (P.61) & Cola 500ml P (P.62)
        ("flasks-sippers-mugs.pdf", 61, "flasks-sippers-mugs.pdf", 62, "Cola 500 Ml. Vacuum Flask - H 308"),
        # Kitchen: Pooja thali (P.65) & gift box (P.64)
        ("home-kitchen.pdf", 65, "home-kitchen.pdf", 64, "Pooja Thali Set: Pooja Plate, Agarbatti Stand, Diya & Prasad Bowl - Z 40"),
        # Office: Castille Milano (P.74) & notepad pocket (P.76)
        ("office-table-tops-and-stationery.pdf", 74, "office-table-tops-and-stationery.pdf", 76, "Castille Milano Omni Zippered Work Folder With Replaceable Notebook"),
        # Office: Orbit wave wiro (P.33) & magnet sticks (P.32)
        ("office-table-tops-and-stationery.pdf", 33, "office-table-tops-and-stationery.pdf", 32, "Orbit Wave Wiro Tumbler With S-Shape Partition - E 376"),
        # Office: Photo frame wiro (P.27) & round branding plate (P.30)
        ("office-table-tops-and-stationery.pdf", 27, "office-table-tops-and-stationery.pdf", 30, "Photo Frame With Round Wiro Tumbler - E 378"),
        # Plastic: Gym shaker (P.8) & shaker ball (P.9)
        ("plastic-bottles-sippers-shakers.pdf", 8, "plastic-bottles-sippers-shakers.pdf", 9, "Gym Shaker With Double Compartment - H 146"),
        # Plastic: Spidey bottle (P.12) & bpa free plate (P.13)
        ("plastic-bottles-sippers-shakers.pdf", 12, "plastic-bottles-sippers-shakers.pdf", 13, "Spidey Water Bottle (Spiderman Web Style) - H 15"),
        # Keychains: Round hanging (P.23) & glowing logo (P.24)
        ("multifunction-keychains.pdf", 23, "multifunction-keychains.pdf", 24, "Round Hanging Metal Keychain With PU Strap - J 128"),
        # Kitchen: Electra lunch box steel (P.49) & microwaveable plate (P.50)
        ("home-kitchen.pdf", 49, "home-kitchen.pdf", 50, "Power Plus Electra Lunch Box Steel - H 07"),
        # Flasks: Insulated mug matte (P.83) & press button (P.82)
        ("flasks-sippers-mugs.pdf", 83, "flasks-sippers-mugs.pdf", 82, "Insulated Mug In Matte Finish - H 248")
    ]

    # 2. DIRECT DELETIONS
    direct_deletions_by_cat_page = [
        ("doctor-utility-pharma.pdf", 6),
        ("doctor-utility-pharma.pdf", 7),
        ("doctor-utility-pharma.pdf", 8),
        ("doctor-utility-pharma.pdf", 9),
        ("employee-joining-kits.pdf", 5),
        ("gift-sets.pdf", 43),
        ("lamps-torches.pdf", 5),
        ("electronics-and-mobile-accessories.pdf", 12),
        ("electronics-and-mobile-accessories.pdf", 83),
        ("electronics-and-mobile-accessories.pdf", 87),
        ("table-wall-clocks.pdf", 3),
        ("table-wall-clocks.pdf", 22),
        ("office-table-tops-and-stationery.pdf", 5),
        ("office-table-tops-and-stationery.pdf", 37),
        ("home-kitchen.pdf", 2),
        ("work-from-home.pdf", 12)
    ]

    # 3. TITLE CLEANUPS
    title_cleanups_by_cat_page = [
        ("doctor-utility-pharma.pdf", 73, "Orbit Duo Round Wiro Double Tumbler - E 374"),
        ("flasks-sippers-mugs.pdf", 51, "Hexa Edge Insulated Steel Bottle - H 319"),
        ("doctor-utility-pharma.pdf", 26, "GlassMate Lunch Box With Microwave Borosilicate Containers - H 313"),
        ("lamps-torches.pdf", 43, "Ultra Compact Torch With Lantern - E 135"),
        ("doctor-utility-pharma.pdf", 103, "Visiting Card Holder & Double Pen Holder - E 313"),
        ("customized-products-made-to-order.pdf", 24, "Rotating 360 Table Clock With 3-Side Branding - A 139"),
        ("electronics-and-mobile-accessories.pdf", 67, "Dual USB Home Charger With LED Night Lamp - C 123"),
        ("speakers-headphones-earphones.pdf", 3, "Retro Mini TV Bluetooth Speaker With Phone Holder"),
        ("electronics-and-mobile-accessories.pdf", 89, "TimeWaver Plus Color Clock - A 152"),
        ("office-table-tops-and-stationery.pdf", 94, "Large Table Top Stationery Holder With Clock - A 135"),
        ("multifunction-keychains.pdf", 18, "Power Glow Keychain With In-Built Torch - J 136"),
        ("flasks-sippers-mugs.pdf", 16, "Gallon Style Glass Bottle With Carry Handle - H 381"),
        ("eco-friendly-products.pdf", 89, "Bamboo Long Fast Charging Cable With Light Up Logo - C 201"),
        ("electronics-and-mobile-accessories.pdf", 65, "Power Strip With USB Ports & 2 Mode Lamp"),
        ("electronics-and-mobile-accessories.pdf", 70, "Power Board With 4 Sockets, USB Ports And Phone Stand"),
        ("electronics-and-mobile-accessories.pdf", 71, "Power Glow All In 1 Charging Cable With Light Up Logo")
    ]

    all_delete_ids: Set[str] = set()

    # Step A: Perform merges
    print("\n--- Performing Merges ---")
    for target_cat, target_page, src_cat, src_page, new_title in pairs_by_cat_page:
        target = cat_page_to_prod.get((target_cat, target_page))
        source = cat_page_to_prod.get((src_cat, src_page))
        if not target or not source:
            print(f"Skipping missing pair: {target_cat} P.{target_page} / {src_cat} P.{src_page}")
            continue

        # Combine gallery
        gallery = list(target.get("image_gallery") or [])
        if target.get("primary_image_url") and target["primary_image_url"] not in gallery:
            gallery.insert(0, target["primary_image_url"])
        
        src_primary = source.get("primary_image_url")
        if src_primary and src_primary not in gallery:
            gallery.append(src_primary)
        
        for g in (source.get("image_gallery") or []):
            if g and g not in gallery:
                gallery.append(g)

        update_payload = {
            "name": new_title,
            "image_gallery": gallery
        }
        supabase.from_("products").update(update_payload).eq("id", target["id"]).execute()
        all_delete_ids.add(source["id"])
        print(f"Merged into [{new_title}] (Now has {len(gallery)} gallery images)")

    # Step B: Mark direct deletions
    print("\n--- Marking Direct Deletions ---")
    for cat, page in direct_deletions_by_cat_page:
        item = cat_page_to_prod.get((cat, page))
        if item:
            all_delete_ids.add(item["id"])
            print(f"Marked delete: [{item['name'][:40]}] ({cat} P.{page})")

    # Step C: Delete all marked redundant rows
    print(f"\n--- Deleting {len(all_delete_ids)} redundant rows ---")
    id_list = list(all_delete_ids)
    for i in range(0, len(id_list), 30):
        batch = id_list[i:i+30]
        supabase.from_("products").delete().in_("id", batch).execute()
        print(f"Deleted batch {i // 30 + 1} ({len(batch)} items)")

    # Step D: Perform title cleanups
    print("\n--- Performing Title Cleanups ---")
    for cat, page, clean_title in title_cleanups_by_cat_page:
        item = cat_page_to_prod.get((cat, page))
        if item and item["id"] not in all_delete_ids:
            supabase.from_("products").update({"name": clean_title}).eq("id", item["id"]).execute()
            print(f"Renamed {cat} P.{page} to: [{clean_title}]")

    # Step E: General title sanitation across all remaining products
    print("\n--- General Title Sanitation ---")
    res_after = supabase.from_("products").select("id, name").execute()
    remaining = res_after.data or []
    cleaned_count = 0
    for p in remaining:
        orig = p["name"]
        cleaned = sanitize_title(orig)
        if cleaned != orig:
            supabase.from_("products").update({"name": cleaned}).eq("id", p["id"]).execute()
            cleaned_count += 1

    print(f"Sanitized {cleaned_count} product titles.")

    # Final Count
    final_res = supabase.from_("products").select("id", count="exact").execute()
    print("\n" + "=" * 60)
    print("DEDUPLICATION AND CLEANUP COMPLETE!")
    print(f"Total Rows Deleted: {len(all_delete_ids)}")
    print(f"Remaining Clean Unique Products: {final_res.count}")
    print("=" * 60)

if __name__ == '__main__':
    main()
