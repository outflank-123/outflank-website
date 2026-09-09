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
    res = supabase.table("categories").select("id").eq("slug", "home-kitchen").execute()
    category_id = res.data[0]['id']
    
    # 1. Delete the bad mocked ones
    bad_slugs = [
        "kitchen-brush-with-detergent-holder-z-03",
        "premium-ceramic-coffee-mug-k-05",
        "stainless-steel-bento-lunch-box-l-12"
    ]
    for slug in bad_slugs:
        supabase.table("products").delete().eq("slug", slug).execute()
        
    # 2. Re-insert the correct ones using our generated images
    # Brain path: /Users/faqrealam149/.gemini/antigravity-ide/brain/06edc2ac-f668-4683-a5dc-321b1672bc57/
    brain_dir = Path("/Users/faqrealam149/.gemini/antigravity-ide/brain/06edc2ac-f668-4683-a5dc-321b1672bc57/")
    
    # Find the images
    img1 = list(brain_dir.glob("kitchen_brush_blue_*.jpg"))[0]
    img2 = list(brain_dir.glob("zippy_lunch_bag_2_containers_*.jpg"))[0]
    img3 = list(brain_dir.glob("zippy_lunch_bag_3_containers_*.jpg"))[0]
    
    correct_products = [
        {
            "code": "Z 03",
            "name": "Kitchen Brush WITH DETERGENT HOLDER",
            "description": "Palm-sized, handheld kitchen cleaning tool featuring an integrated clear liquid detergent reservoir and a push-button dispenser on top. Easy, one-handed operation to clean dishes, cookware, and sinks without wasting soap.",
            "features": [
              "Time & Soap Saving: Smooth dispensing minimizes soap usage",
              "Easy Refill Design: Top cap easily opens for refill",
              "Gentle Nylon Bristles: Safe for non-stick cookware",
              "Ergonomic Non-Slip Grip: Comfortable to hold"
            ],
            "colors": ["Blue", "Red"],
            "image_source": str(img1)
        },
        {
            "code": "H 363",
            "name": "Zippy Lunch Bag with 2 SS ROUND CONTAINERS",
            "description": "Premium brown insulated lunch bag with plaid detailing. Includes 2 round stainless steel containers. Perfect for keeping meals fresh and organized.",
            "features": [
                "2 SS round containers ideal for quick, on-the-go meals",
                "Compact & lightweight, Fits easily in any bag",
                "BPA-free, safe and healthy",
                "Great for festive, home, or office gifting"
            ],
            "colors": ["Brown"],
            "image_source": str(img2)
        },
        {
            "code": "H 364",
            "name": "Zippy Lunch Bag with 2 SS ROUND & 1 LONG CONTAINERS",
            "description": "Spacious brown insulated lunch bag with plaid detailing. Includes 2 round and 1 long rectangular stainless steel containers.",
            "features": [
                "2 SS round containers & 1 SS long container ideal for quick meals",
                "Compact & lightweight, Fits easily in any bag",
                "BPA-free, safe and healthy",
                "Great for festive, home, or office gifting"
            ],
            "colors": ["Brown"],
            "image_source": str(img3)
        }
    ]
    
    for item in correct_products:
        group_id = slugify(item['code'])
        img_path = item['image_source']
        
        print(f"Uploading AI image for {item['name']}...")
        image_url = upload_image(img_path, "home-kitchen", group_id, "ai_gen")
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
            "base_price": 599 if "LONG" in item['name'] else 499,
            "min_order_qty": 50,
            "lead_time_days": 10,
            "is_active": True,
            "is_featured": False,
            "is_customizable": True,
            "primary_image_url": image_url,
            "image_gallery": [{"url": image_url}],
            "color_variants": [{"name": c, "hex": "#8B4513" if c == "Brown" else "#cccccc"} for c in item.get('colors', [])]
        }
        
        supabase.table("products").insert(payload).execute()
        print(f"Inserted Correct DB record for {item['name']}")

if __name__ == "__main__":
    process_products()
