import os
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

def upload_image(filepath_str: str, category_slug: str, group_id: str, variant_name: str) -> str:
    path = Path(filepath_str)
    if not path.exists():
        print(f"Missing {path}")
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
    res = supabase.table("categories").select("id").eq("slug", "tech-and-power").execute()
    category_id = res.data[0]['id']
    
    brain_dir = Path("/Users/faqrealam149/.gemini/antigravity-ide/brain/06edc2ac-f668-4683-a5dc-321b1672bc57/")
    
    img1 = list(brain_dir.glob("tech_power_bank_*.jpg"))[0]
    img2 = list(brain_dir.glob("tech_wireless_charger_*.jpg"))[0]
    img3 = list(brain_dir.glob("tech_travel_adapter_*.jpg"))[0]
    
    products = [
        {
            "code": "T-01",
            "name": "Ultra-Slim 10000mAh Power Bank",
            "description": "A sleek, ultra-slim 10000mAh corporate power bank in matte charcoal grey. Features a minimal digital battery indicator and fast charging capabilities.",
            "features": ["10000mAh Capacity", "Digital Battery Display", "Ultra-Slim Profile", "Dual USB-C Outputs"],
            "colors": ["Charcoal Grey"],
            "image_source": str(img1),
            "price": 1299
        },
        {
            "code": "T-02",
            "name": "Premium 15W Wireless Charging Pad",
            "description": "A high-end 15W fast wireless charging pad constructed from black anodized aluminum with a textured fabric surface.",
            "features": ["15W Fast Wireless Charging", "Anodized Aluminum Body", "Textured Fabric Top", "Anti-Slip Base"],
            "colors": ["Black"],
            "image_source": str(img2),
            "price": 999
        },
        {
            "code": "T-03",
            "name": "Global Travel Adapter Pro",
            "description": "A universal international travel adapter in matte black, featuring multiple USB-C ports, PD fast charging, and standard plug sliders for over 150 countries.",
            "features": ["Universal Plug Adapters", "Dual USB-C PD Ports", "Compact Design", "Overcharge Protection"],
            "colors": ["Black"],
            "image_source": str(img3),
            "price": 1499
        }
    ]
    
    for item in products:
        group_id = slugify(item['code'])
        img_path = item['image_source']
        
        print(f"Uploading AI image for {item['name']}...")
        image_url = upload_image(img_path, "tech-and-power", group_id, "ai_gen")
        if not image_url:
            continue
            
        product_slug = slugify(f"{item['name']} {item['code']}")
        features_html = "<ul>" + "".join([f"<li>{f}</li>" for f in item.get('features', [])]) + "</ul>"
        
        payload = {
            "id": str(uuid.uuid4()),
            "category_id": category_id,
            "name": item['name'],
            "slug": product_slug,
            "short_desc": item['description'],
            "description": f"<p>{item['description']}</p>{features_html}",
            "base_price": item['price'],
            "min_order_qty": 20,
            "lead_time_days": 10,
            "is_active": True,
            "is_featured": True,
            "is_customizable": True,
            "primary_image_url": image_url,
            "image_gallery": [{"url": image_url}],
            "color_variants": [{"name": c, "hex": "#1a1a1a"} for c in item.get('colors', [])]
        }
        
        # Upsert
        check = supabase.table("products").select("id").eq("slug", product_slug).execute()
        if check.data:
            supabase.table("products").update(payload).eq("id", check.data[0]['id']).execute()
            print(f"Updated DB record for {item['name']}")
        else:
            supabase.table("products").insert(payload).execute()
            print(f"Inserted DB record for {item['name']}")

if __name__ == "__main__":
    process_products()
