# PARSING_STATUS.md

Date: 2026-02-03

## Supported Formats (Content Extraction)
- Plain text: txt, md, log, csv, json, yaml/yml, toml, xml, html/htm, rtf
- PDF: pdf-extract
- DOCX: zip + quick-xml (word/document.xml)
- XLSX/XLS: calamine
- PPTX: zip + quick-xml (ppt/slides/*.xml)

## Pipeline Integration
- Ripgrep funnel routes heavy formats (pdf/docx/xlsx/xls/pptx) through the parser before content search.
- Candidate generator include lists now cover pdf/docx/xlsx/xls/pptx/ppt/rtf.

## Caps & Safety
- MAX_BYTES_READ_PER_FILE = 64KB (hard cap for hot path extraction)
- MAX_TEXT_CHARS_PER_FILE = 20,000 (post-extract cap)
- Heavy formats are skipped if file size exceeds max_bytes.

## Fallback Behavior
- If extraction fails, content search skips the file (path/metadata still contribute).
- Non-heavy formats fall back to a capped UTF-8 read.

## Known Limitations
- PPT (binary) is not supported.
- Large PDFs/DOCX/PPTX/XLSX over the byte cap are skipped.
