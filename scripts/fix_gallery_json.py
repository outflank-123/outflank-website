import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

def fix_image_galleries():
    # Fetch all products
    prods = supabase.table("products").select("id, name, image_gallery").execute().data
    
    updated = 0
    for p in prods:
        galleries = p.get("image_gallery")
        if not galleries:
            continue
            
        fixed_gallery = []
        needs_fix = False
        
        for g in galleries:
            if isinstance(g, str) and g.startswith('{"url":'):
                # It's a stringified JSON object! Extract the URL.
                try:
                    obj = json.loads(g)
                    if "url" in obj:
                        fixed_gallery.append(obj["url"])
                        needs_fix = True
                        continue
                except:
                    pass
            fixed_gallery.append(g)
            
        if needs_fix:
            print(f"Fixing gallery for {p['name']}...")
            supabase.table("products").update({"image_gallery": fixed_gallery}).eq("id", p["id"]).execute()
            updated += 1
            
    print(f"Fixed {updated} products.")

if __name__ == "__main__":
    fix_image_galleries()
