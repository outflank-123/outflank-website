import os
import json
import io
import uuid
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from PIL import Image

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
BUCKET_NAME = "product-images"

def slugify(text):
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text)[:80]

def get_or_create_category():
    slug = "home-kitchen"
    res = supabase.table("categories").select("id").eq("slug", slug).execute()
    if res.data:
        return res.data[0]['id']
    
    # Create category
    cat_data = {
        "id": str(uuid.uuid4()),
        "name": "Home & Kitchen",
        "slug": slug,
        "description": "Premium kitchenware, elegant coffee mugs, durable lunch boxes, and handy kitchen tools for corporate gifting.",
        "icon_name": "Home",
        "sort_order": 8
    }
    insert_res = supabase.table("categories").insert(cat_data).execute()
    return insert_res.data[0]['id']

def upload_image(filepath_str: str, category_slug: str, group_id: str, variant_name: str) -> str:
    path = Path(filepath_str)
    if not path.exists():
        return None
    
    img = Image.open(path)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="WEBP", quality=85)
    webp_bytes = buf.getvalue()

    safe_variant = slugify(variant_name or "default")
    filename = f"{category_slug}/{group_id}/{safe_variant}.webp"
    
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=webp_bytes,
            file_options={"content-type": "image/webp", "upsert": "true"}
        )
        return f"{os.environ['NEXT_PUBLIC_SUPABASE_URL']}/storage/v1/object/public/{BUCKET_NAME}/{filename}"
    except Exception as e:
        print(f"Upload error: {e}")
        return None

def process_products():
    category_id = get_or_create_category()
    
    with open("kitchen_products.json", "r") as f:
        products = json.load(f)
    
    for item in products:
        group_id = slugify(item['code'])
        img_path = item['image_source']
        
        print(f"Uploading image for {item['name']}...")
        image_url = upload_image(img_path, "home-kitchen", group_id, "main")
        if not image_url:
            print("Failed to upload image")
            continue
            
        product_slug = slugify(f"{item['name']} {item['code']}")
        
        check = supabase.table("products").select("id").eq("slug", product_slug).execute()
        
        features_html = "<ul>" + "".join([f"<li>{f}</li>" for f in item.get('features', [])]) + "</ul>"
        
        payload = {
            "category_id": category_id,
            "name": item['name'],
            "slug": product_slug,
            "short_desc": item['description'],
            "description": f"<p>{item['description']}</p>{features_html}",
            "base_price": 499,
            "min_order_qty": 50,
            "lead_time_days": 10,
            "is_active": True,
            "is_featured": False,
            "is_customizable": True,
            "primary_image_url": image_url,
            "image_gallery": [{"url": image_url}],
            "color_variants": [{"name": c, "hex": "#cccccc"} for c in item.get('colors', [])]
        }
        
        try:
            if check.data:
                supabase.table("products").update(payload).eq("id", check.data[0]['id']).execute()
                print(f"Updated DB record for {item['name']}")
            else:
                payload["id"] = str(uuid.uuid4())
                supabase.table("products").insert(payload).execute()
                print(f"Inserted DB record for {item['name']}")
        except Exception as e:
            print(f"DB Error: {e}")

if __name__ == "__main__":
    process_products()
