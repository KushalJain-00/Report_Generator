from rig.render import build_html, render_pdf, render_docx

PROJECT = {"name": "Water Audit", "sector": "Water", "geo": "Gujarat",
           "client": "Corp", "audience": "Board", "desc": "d",
           "standards": "ISO", "price": "10k", "duration": "6w", "lang": "English"}
DOC = {"id": "charter", "name": "Project Charter", "cat": "planning", "icon": "x", "tip": "t"}
BLUEPRINT = {"projectTitle": "Water Audit 2026"}
MD = "# Title\n\nSome **bold** text.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n"


def test_pdf_magic_bytes():
    assert render_pdf(MD, PROJECT, DOC, BLUEPRINT, "groq").startswith(b"%PDF")


def test_docx_is_valid_zip():
    import io, zipfile
    data = render_docx(MD, PROJECT, DOC, BLUEPRINT, "groq")
    assert data[:2] == b"PK"
    names = zipfile.ZipFile(io.BytesIO(data)).namelist()
    assert "word/document.xml" in names


def test_preview_html_no_page_rules():
    html = build_html(MD, PROJECT, DOC, BLUEPRINT, "groq", pdf=False)
    assert "@page" not in html
    assert "<table>" in html
    assert "Water Audit 2026" in html


def test_pdf_html_has_page_rules_and_watermark():
    html = build_html(MD, PROJECT, DOC, BLUEPRINT, "groq",
                      {"text": "ACME", "opacity": 0.15, "fontSize": 48}, pdf=True)
    assert "@page" in html
    assert "ACME" in html
    assert "page-break-before" in html
