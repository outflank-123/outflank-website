import os
import re
from collections import defaultdict
from dotenv import dotenv_values
from supabase import create_client

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
env_vars = dotenv_values(env_path)
supabase = create_client(env_vars["NEXT_PUBLIC_SUPABASE_URL"], env_vars["SUPABASE_SERVICE_ROLE_KEY"])

res = supabase.from_("products").select("*").execute()
products = res.data or []
print(f"Total products in DB: {len(products)}")

# Group by catalog_file
by_catalog = defaultdict(list)
non_catalog = []

for p in products:
    bc = p.get("branding_config") or {}
    cat = bc.get("catalog_file") or p.get("source_pdf")
    if cat:
        # extract just the filename
        cat_file = cat.split("(")[0].strip()
        by_catalog[cat_file].append(p)
    else:
        non_catalog.append(p)

print(f"Non-catalog (core apparel): {len(non_catalog)}")
print(f"Catalogs represented: {len(by_catalog)}")

# Look for:
# 1. Non-product pages (e.g. Intro pages, gift packing box pages, warranty/company profiles)
# 2. Fragment titles
# 3. Consecutive pages in same catalog with same or related product codes or same product name

print("\n=== CATALOG BY CATALOG AUDIT ===")
for cat, prods in sorted(by_catalog.items()):
    prods.sort(key=lambda x: (x.get("branding_config") or {}).get("page_number", 0))
    print(f"\n--- {cat} ({len(prods)} products) ---")
    for p in prods:
        bc = p.get("branding_config") or {}
        pg = bc.get("page_number")
        code = bc.get("product_code")
        name = p["name"]
        print(f"  P.{pg:3} | Code: {str(code):10} | Name: {name[:50]}")
