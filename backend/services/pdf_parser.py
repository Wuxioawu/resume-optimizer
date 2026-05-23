import pdfplumber
from pathlib import Path


def extract_text(file_path: str) -> str:
    """Extract and join all page text from a PDF file."""
    parts: list[str] = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
    return "\n\n".join(parts)
