from pathlib import Path
import pytesseract
from pdf2image import convert_from_path
from pypdf import PdfReader
from PIL import ImageOps

pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"

def extract_text_pdf(path: Path, lang="eng", dpi=150) -> str:
    reader = PdfReader(path)
    native = "\n".join((p.extract_text() or "") for p in reader.pages).strip()
    if native:
        return native
    imgs = convert_from_path(path, dpi=dpi)
    ocr_texts = []
    for img in imgs:
        img = ImageOps.grayscale(img)
        img = ImageOps.invert(img)
        ocr_text = pytesseract.image_to_string(img, lang=lang).strip()
        ocr_texts.append(ocr_text)
    ocr = "\n".join(ocr_texts).strip()
    return ocr if ocr else "tidak ada teks"
    
