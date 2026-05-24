import copy
import re
from html import escape as esc

from weasyprint import HTML


def _fix_spacing(text: str) -> str:
    """Fix PDF extraction spacing without breaking technical terms."""
    if not text:
        return text
    # Only fix obvious joined words - lowercase followed by uppercase
    # But NOT in known technical terms
    KEEP_TOGETHER = [
        'JavaScript', 'TypeScript', 'MySQL', 'PostgreSQL',
        'MongoDB', 'GitHub', 'GitLab', 'DevOps', 'CI/CD',
        'RESTful', 'SpringBoot', 'RabbitMQ', 'XXL-JOB',
        'HyperOS', 'OkHttp', 'LinkedIn'
    ]
    # Replace known terms with placeholders
    placeholders = {}
    for i, term in enumerate(KEEP_TOGETHER):
        placeholder = f"__TERM{i}__"
        placeholders[placeholder] = term
        text = text.replace(term, placeholder)

    # Now safe to fix spacing
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)

    # Restore placeholders
    for placeholder, term in placeholders.items():
        text = text.replace(placeholder, term)

    # Fix numbers joined to words
    text = re.sub(r'(\d)([A-Z][a-z])', r'\1 \2', text)
    # Clean multiple spaces
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


def _apply_spacing_fixes(data: dict) -> dict:
    """Apply _fix_spacing to all text fields in the resume data dict."""
    data = copy.deepcopy(data)
    data['name'] = _fix_spacing(data.get('name', ''))
    data['contact'] = _fix_spacing(data.get('contact', ''))
    data['summary'] = _fix_spacing(data.get('summary', ''))
    data['skills'] = _fix_spacing(data.get('skills', ''))

    for exp in data.get('experience', []):
        exp['company'] = _fix_spacing(exp.get('company', ''))
        exp['title'] = _fix_spacing(exp.get('title', ''))
        exp['location'] = _fix_spacing(exp.get('location', ''))
        exp['date'] = _fix_spacing(exp.get('date', ''))
        exp['bullets'] = [_fix_spacing(b) for b in exp.get('bullets', []) if b.strip()]

    for proj in data.get('projects', []):
        proj['name'] = _fix_spacing(proj.get('name', ''))
        proj['role'] = _fix_spacing(proj.get('role', ''))
        proj['bullets'] = [_fix_spacing(b) for b in proj.get('bullets', []) if b.strip()]

    for edu in data.get('education', []):
        edu['school'] = _fix_spacing(edu.get('school', ''))
        edu['degree'] = _fix_spacing(edu.get('degree', ''))
        edu['date'] = _fix_spacing(edu.get('date', ''))
        edu['location'] = _fix_spacing(edu.get('location', ''))

    return data


def _apply_suggestions(data: dict, suggestions: list) -> dict:
    """Apply accepted suggestion texts to resume data fields."""
    data = copy.deepcopy(data)
    for s in suggestions:
        orig = s.original if hasattr(s, 'original') else s.get('original', '')
        sugg = s.suggested if hasattr(s, 'suggested') else s.get('suggested', '')
        section = s.section if hasattr(s, 'section') else s.get('section', '')
        if not orig:
            continue

        def sub(text: str) -> str:
            return text.replace(orig, sugg) if orig in text else text

        if section == 'Summary':
            data['summary'] = sub(data.get('summary', ''))
        elif section == 'Skills':
            data['skills'] = sub(data.get('skills', ''))
        elif section == 'Experience':
            for exp in data.get('experience', []):
                exp['title'] = sub(exp.get('title', ''))
                exp['company'] = sub(exp.get('company', ''))
                exp['bullets'] = [sub(b) for b in exp.get('bullets', [])]
        elif section == 'Education':
            for edu in data.get('education', []):
                edu['school'] = sub(edu.get('school', ''))
                edu['degree'] = sub(edu.get('degree', ''))

    return data


def build_resume_html(data: dict) -> str:
    """Build a professional HTML resume from structured resume data."""

    # Deduplicate: remove summary text from experience bullets if it appears there
    summary_text = data.get('summary', '').strip()
    if summary_text:
        for exp in data.get('experience', []):
            exp['bullets'] = [
                b for b in exp.get('bullets', [])
                if b.strip() and b.strip() != summary_text
            ]

    def bullets_html(items: list) -> str:
        filtered = [b.strip() for b in items if b.strip()]
        if not filtered:
            return ''
        return '<ul>' + ''.join(f'<li>{esc(b)}</li>' for b in filtered) + '</ul>'

    # ── Experience ──
    experience_html = ''
    for job in data.get('experience', []):
        experience_html += f"""
<div class="entry">
  <div class="row-header">
    <span class="bold">{esc(job.get('company', ''))}</span>
    <span class="right-text">{esc(job.get('date', ''))}</span>
  </div>
  <div class="row-sub">
    <span class="italic">{esc(job.get('title', ''))}</span>
    <span class="right-text">{esc(job.get('location', ''))}</span>
  </div>
  {bullets_html(job.get('bullets', []))}
</div>"""

    # ── Projects ──
    projects_html = ''
    for proj in data.get('projects', []):
        role_cell = f'<span class="right-text">{esc(proj.get("role", ""))}</span>' if proj.get('role') else ''
        projects_html += f"""
<div class="entry">
  <div class="row-header">
    <span class="bold">{esc(proj.get('name', ''))}</span>
    {role_cell}
  </div>
  {bullets_html(proj.get('bullets', []))}
</div>"""

    # ── Education ──
    education_html = ''
    for edu in data.get('education', []):
        education_html += f"""
<div class="entry">
  <div class="row-header">
    <span class="bold">{esc(edu.get('school', ''))}</span>
    <span class="right-text">{esc(edu.get('date', ''))}</span>
  </div>
  <div class="row-sub">
    <span class="italic">{esc(edu.get('degree', ''))}</span>
    <span class="right-text">{esc(edu.get('location', ''))}</span>
  </div>
</div>"""

    # ── Optional sections ──
    def section_block(heading: str, body: str) -> str:
        if not body.strip():
            return ''
        return f'<div class="section"><h2>{heading}</h2>{body}</div>'

    summary_body = f'<p class="body-text">{esc(data.get("summary", ""))}</p>' if data.get('summary') else ''
    skills_body = f'<p class="skills-text">{esc(data.get("skills", ""))}</p>' if data.get('skills') else ''

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {{
    size: A4;
    margin: 0.5in 0.6in;
  }}

  * {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }}

  body {{
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #000;
  }}

  /* ── Header ── */
  .header {{
    text-align: center;
    margin-bottom: 10px;
  }}
  .header h1 {{
    font-size: 18pt;
    font-weight: bold;
    letter-spacing: 0.5px;
    margin-bottom: 3px;
  }}
  .header .contact {{
    font-size: 9pt;
    color: #444;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
  }}

  /* ── Sections ── */
  .section {{
    margin-top: 8px;
  }}
  .section h2 {{
    font-size: 10.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 1px solid #000;
    padding-bottom: 1px;
    margin-bottom: 5px;
  }}

  /* ── Entries ── */
  .entry {{
    margin-bottom: 6px;
  }}

  .row-header,
  .row-sub {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    white-space: normal;
  }}

  .bold {{
    font-size: 10.5pt;
    font-weight: bold;
    flex: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }}

  .italic {{
    font-size: 10pt;
    font-style: italic;
    flex: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }}

  .right-text {{
    font-size: 10pt;
    color: #222;
    white-space: nowrap;
    text-align: right;
    flex-shrink: 0;
  }}

  /* ── Bullets ── */
  ul {{
    margin-top: 3px;
    margin-left: 12px;
    padding-left: 8px;
    list-style-type: disc;
  }}
  li {{
    font-size: 9.5pt;
    margin-bottom: 2px;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
  }}

  /* ── Body text ── */
  .body-text {{
    font-size: 10pt;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
  }}

  /* ── Skills ── */
  .skills-text {{
    font-size: 9.5pt;
    line-height: 1.6;
    white-space: pre-line;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }}
</style>
</head>
<body>

<div class="header">
  <h1>{esc(data.get('name', ''))}</h1>
  <div class="contact">{esc(data.get('contact', ''))}</div>
</div>

{section_block('Summary', summary_body)}
{section_block('Work Experience', experience_html)}
{section_block('Projects', projects_html)}
{section_block('Education', education_html)}
{section_block('Technical Skills', skills_body)}

</body>
</html>"""


def generate_pdf(resume_data: dict, accepted_suggestions: list) -> bytes:
    """Generate PDF from structured resume data using WeasyPrint."""
    data = _apply_suggestions(resume_data, accepted_suggestions)
    data = _apply_spacing_fixes(data)
    html_str = build_resume_html(data)
    return HTML(string=html_str).write_pdf()
