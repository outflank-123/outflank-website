import os
import fitz # PyMuPDF
from pathlib import Path

PDF_PATH = Path("pdf/gift-sets.pdf")
OUT_DIR = Path("scratch_gift_sets")
OUT_DIR.mkdir(exist_ok=True)

doc = fitz.open(PDF_PATH)
for i in range(min(5, len(doc))): # Just get first 5 pages
    page = doc[i]
    pix = page.get_pixmap(dpi=150)
    out_path = OUT_DIR / f"page_{i+1:02d}.jpg"
    pix.save(str(out_path))
    print(f"Saved {out_path}")
