import fitz

from models.schemas import Suggestion


def _get_font_size(page: fitz.Page, original: str) -> float:
    """Return the font size of the span that contains the start of original text."""
    prefix = original[:20]
    for block in page.get_text("dict")["blocks"]:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if prefix in span["text"]:
                    return float(span["size"])
    return 10.0


def generate_pdf(temp_file_id: str, accepted_suggestions: list[Suggestion]) -> bytes:
    """Edit the original PDF in-place using PyMuPDF to apply accepted suggestions."""
    doc = fitz.open(f"/tmp/{temp_file_id}.pdf")

    for page in doc:
        # Collect replacements before mutating the page so rects stay valid.
        replacements: list[tuple[fitz.Rect, str, float]] = []
        for suggestion in accepted_suggestions:
            instances = page.search_for(suggestion.original)
            if not instances:
                continue
            font_size = _get_font_size(page, suggestion.original)
            for rect in instances:
                replacements.append((rect, suggestion.suggested, font_size))
                page.add_redact_annot(rect, fill=(1, 1, 1))

        page.apply_redactions()

        for rect, suggested_text, font_size in replacements:
            # Insert at the bottom-left of the redacted rect (approximates the baseline).
            page.insert_text(
                (rect.x0, rect.y1),
                suggested_text,
                fontsize=font_size,
                color=(0, 0, 0),
            )

    return doc.tobytes()
