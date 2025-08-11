from typing import List, Dict, Any
from .unstructured_client import process_file_with_unstructured

def parse_pdf_to_elements(pdf_path: str) -> List[Dict[str, Any]]:
    """Primary path: Unstructured (local HTTP API), returns element dicts."""
    return process_file_with_unstructured(
        pdf_path,
        strategy="auto",
        languages=["eng"],
        coordinates=False,
    )

