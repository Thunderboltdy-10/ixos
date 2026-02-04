import os
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"
FIXTURES.mkdir(parents=True, exist_ok=True)


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def write_pdf(path: Path, text: str) -> None:
    header = "%PDF-1.4\n"
    objects = []
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objects.append(
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    )
    stream = f"BT /F1 24 Tf 50 100 Td ({text}) Tj ET"
    objects.append(
        f"4 0 obj\n<< /Length {len(stream)} >>\nstream\n{stream}\nendstream\nendobj\n"
    )
    objects.append(
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    )

    content = header
    offsets = [0]
    for obj in objects:
        offsets.append(len(content))
        content += obj

    xref_offset = len(content)
    count = len(objects) + 1
    content += f"xref\n0 {count}\n"
    content += "0000000000 65535 f \n"
    for off in offsets[1:]:
        content += f"{off:010d} 00000 n \n"
    content += "trailer\n"
    content += f"<< /Size {count} /Root 1 0 R >>\n"
    content += "startxref\n"
    content += f"{xref_offset}\n"
    content += "%%EOF\n"

    path.write_bytes(content.encode("ascii", errors="ignore"))


def write_docx(path: Path, text: str) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">
  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>
  <Default Extension=\"xml\" ContentType=\"application/xml\"/>
  <Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>
</Types>
""",
        )
        zf.writestr(
            "_rels/.rels",
            """<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">
  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>
</Relationships>
""",
        )
        zf.writestr(
            "word/document.xml",
            f"""<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">
  <w:body>
    <w:p><w:r><w:t>{text}</w:t></w:r></w:p>
  </w:body>
</w:document>
""",
        )


def write_pptx(path: Path, text: str) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            """<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">
  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>
  <Default Extension=\"xml\" ContentType=\"application/xml\"/>
  <Override PartName=\"/ppt/slides/slide1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>
</Types>
""",
        )
        zf.writestr(
            "ppt/slides/slide1.xml",
            f"""<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>
<p:sld xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>{text}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>
""",
        )


def main() -> None:
    write_text(FIXTURES / "sample.txt", "Ixos TXT Fixture\n")
    write_text(FIXTURES / "sample.md", "# Ixos MD Fixture\n")
    write_text(FIXTURES / "sample.rtf", "{\\rtf1\\ansi Ixos RTF Fixture}")
    write_pdf(FIXTURES / "sample.pdf", "Ixos PDF Fixture")
    write_docx(FIXTURES / "sample.docx", "Ixos DOCX Fixture")
    write_pptx(FIXTURES / "sample.pptx", "Ixos PPTX Fixture")


if __name__ == "__main__":
    main()
