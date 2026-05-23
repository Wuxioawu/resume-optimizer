import fitz
from models.schemas import Suggestion


def _get_font_size(page: fitz.Page, original: str) -> float:
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
    doc = fitz.open(f"/tmp/{temp_file_id}.pdf")

    total_replacements = 0

    for page_num, page in enumerate(doc):
        # 打印页面所有文字，方便调试
        page_text = page.get_text()
        print(f"\n=== Page {page_num + 1} text (first 200 chars) ===")
        print(page_text[:200])

        replacements: list[tuple[fitz.Rect, str, float]] = []

        for suggestion in accepted_suggestions:
            print(f"\n🔍 Searching for: '{suggestion.original[:50]}'")

            # 方法1：直接搜索
            instances = page.search_for(suggestion.original)
            print(f"   Direct search found: {len(instances)} instances")

            # 方法2：搜索前20个字符
            if not instances:
                short = suggestion.original[:30]
                instances = page.search_for(short)
                print(f"   Short search (30 chars) found: {len(instances)} instances")

            if not instances:
                print(f"   ❌ NOT FOUND on this page")
                continue

            font_size = _get_font_size(page, suggestion.original)
            print(f"   ✅ Found {len(instances)} instances, font size: {font_size}")

            for rect in instances:
                replacements.append((rect, suggestion.suggested, font_size))
                page.add_redact_annot(rect, fill=(1, 1, 1))
                total_replacements += 1

        page.apply_redactions()

        for rect, suggested_text, font_size in replacements:
            page.insert_text(
                (rect.x0, rect.y1),
                suggested_text,
                fontsize=font_size,
                color=(0, 0, 0),
            )

    print(f"\n✅ Total replacements made: {total_replacements}")
    return doc.tobytes()
