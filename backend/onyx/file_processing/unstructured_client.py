import os, requests, os.path as op
from typing import Any, Dict, List, Optional

BASE = os.getenv("UNSTRUCTURED_API_URL", "http://unstructured-api:8000").rstrip("/")
ENDPOINT = f"{BASE}/general/v0/general"

def process_file_with_unstructured(
    file_path: str,
    strategy: str = "auto",
    coordinates: bool = False,
    languages: Optional[list[str]] = None,
    ocr_languages: Optional[list[str]] = None,
) -> List[Dict[str, Any]]:
    data = [("strategy", strategy)]
    if coordinates:
        data.append(("coordinates", "true"))
    for lst, key in ((languages, "languages"), (ocr_languages, "ocr_languages")):
        if lst:
            for v in lst:
                data.append((key, v))

    with open(file_path, "rb") as f:
        files = {"files": (op.basename(file_path), f)}
        r = requests.post(ENDPOINT, files=files, data=data, timeout=300)
    r.raise_for_status()
    return r.json()

