from typing import List, Dict, Any
from .pdf_parser import parse_pdf_to_elements
from .ollama_ocr import get_ollama_ocr, is_ollama_ocr_available
from onyx.utils.logger import setup_logger

logger = setup_logger()

def extract_pdf_elements_with_fallback(pdf_path: str) -> List[Dict[str, Any]]:
    # 1) Try Unstructured first
    try:
        els = parse_pdf_to_elements(pdf_path)
        if els:
            return els
        logger.warning("Unstructured returned no elements; falling back to OCR.")
    except Exception as e:
        logger.warning(f"Unstructured parse failed ({e}); falling back to OCR.")

    # 2) Fallback to Ollama OCR -> wrap as NarrativeText element list
    if not is_ollama_ocr_available():
        logger.error("Ollama OCR not available.")
        return []

    ocr = get_ollama_ocr()
    try:
        with open(pdf_path, "rb") as f:
            text = ocr.extract_text_from_pdf(f)
        if text:
            return [{"type": "NarrativeText", "text": text}]
        logger.warning("Ollama OCR produced empty text.")
        return []
    except Exception as e:
        logger.error(f"OCR fallback failed: {e}")
        return []

