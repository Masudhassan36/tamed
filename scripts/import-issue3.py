"""Import approved Issue 3 manuscripts and cache their supplied covers.

Run with the Codex bundled Python (python-docx, pdfplumber and Pillow).
Private submission CSVs and excluded manuscripts never enter public output.
"""
import argparse
import csv
import json
import re
import sys
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from io import BytesIO
from pathlib import Path

import pdfplumber
from docx import Document
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def inherited(obj, attr):
    """Resolve run/paragraph formatting through Word's style hierarchy."""
    direct = getattr(obj, attr, None)
    if direct is not None:
        return direct
    style = getattr(obj, "style", None)
    seen = set()
    while style is not None and style.style_id not in seen:
        seen.add(style.style_id)
        value = getattr(style.font, attr, None)
        if value is not None:
            return value
        style = style.base_style
    return None


def docx_paragraphs(path):
    document = Document(path)
    result = []
    for paragraph in document.paragraphs:
        runs = []
        for run in paragraph.runs:
            if not run.text:
                continue
            runs.append({
                "text": run.text,
                "bold": bool(inherited(run, "bold") if inherited(run, "bold") is not None else inherited(paragraph, "bold")),
                "italic": bool(inherited(run, "italic") if inherited(run, "italic") is not None else inherited(paragraph, "italic")),
                "underline": bool(inherited(run, "underline") if inherited(run, "underline") is not None else inherited(paragraph, "underline")),
                "strike": bool(inherited(run, "strike")),
                **({"verticalAlign": "super"} if run.font.superscript else {}),
                **({"verticalAlign": "sub"} if run.font.subscript else {}),
            })
        # Detect unsupported content rather than silently losing it.
        if "".join(run["text"] for run in runs) != paragraph.text:
            raise ValueError(f"Unextracted paragraph content: {path.name}")
        formatting = paragraph.paragraph_format
        def paragraph_value(name):
            value = getattr(formatting, name)
            style = paragraph.style
            while value is None and style is not None:
                value = getattr(style.paragraph_format, name)
                style = style.base_style
            return value
        block = {"runs": runs}
        alignment = paragraph_value("alignment")
        if alignment is not None:
            block["alignment"] = {0: "left", 1: "center", 2: "right", 3: "justify"}.get(int(alignment), "left")
        for source, target in [("space_before", "spaceBefore"), ("space_after", "spaceAfter"), ("left_indent", "indentLeft"), ("right_indent", "indentRight"), ("first_line_indent", "indentFirst")]:
            value = paragraph_value(source)
            if value is not None:
                block[target] = round(value.pt, 3)
        result.append(block)
    if document.tables or document.inline_shapes:
        raise ValueError(f"Manuscript needs table/image support: {path.name}")
    return result


def pdf_paragraphs(path, verse=False):
    """Recover real text with PDF font emphasis and source line/paragraph breaks.

    All supplied PDFs have a text layer. Bengali combining marks are separated
    from base letters in that layer; reattach those marks and check against the
    rendered source rather than publishing the broken extracted spelling.
    """
    result = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            previous_bottom = None
            for line in page.extract_text_lines():
                text = line["text"]
                text = re.sub(r"\s+([\u09bc-\u09cd\u09d7\u09e2-\u09e3])", r"\1", text)
                characters = line["chars"]
                raw = "".join(character["text"] for character in characters)
                # Character mappings also preserve emphasis across ligatures
                # and the synthetic spaces inserted by PDF word extraction.
                styles = []
                for character in characters:
                    font = character["fontname"].lower()
                    style = {"bold": bool(re.search(r"bold|black|heavy|semibold|demi", font)),
                             "italic": bool(re.search(r"italic|oblique", font)),
                             "underline": any(rule["height"] < 3 and character["bottom"] - 1 <= rule["top"] <= character["bottom"] + 3 and rule["x0"] <= character["x0"] + 1 and rule["x1"] >= character["x1"] - 1 for rule in page.lines)}
                    styles.extend([style] * len(character["text"]))
                mapped = [None] * len(text)
                for match in SequenceMatcher(None, raw, text, autojunk=False).get_matching_blocks():
                    for offset in range(match.size):
                        mapped[match.b + offset] = styles[match.a + offset]
                current = {"bold": False, "italic": False, "underline": False}
                for index in range(len(mapped)):
                    if mapped[index] is not None:
                        current = mapped[index]
                    else:
                        mapped[index] = current
                runs = []
                for character, style in zip(text, mapped):
                    if runs and all(runs[-1].get(key) == value for key, value in style.items()):
                        runs[-1]["text"] += character
                    else:
                        runs.append({"text": character, **style})
                # Keep each source line and the extra space between stanzas /
                # paragraphs; do not infer headings or italicize quoted speech.
                size = max((character["size"] for character in characters), default=12)
                gap = max(0, line["top"] - previous_bottom) if previous_bottom is not None else 0
                separator = previous_bottom is not None and any(rule["width"] > page.width * 0.5 and previous_bottom + 4 < rule["top"] < line["top"] - 4 for rule in page.lines)
                if separator:
                    result.append({"runs": [], "separator": True})
                # PDF prose lines wrap at the paper edge. Rejoin only those
                # continuations so responsive article pages don't acquire
                # ragged, arbitrary breaks. Keep paragraph and verse breaks.
                if not verse and previous_bottom is not None and gap <= size * 0.8 and not separator:
                    result[-1]["runs"].append({"text": " "})
                    result[-1]["runs"].extend(runs)
                else:
                    result.append({"runs": runs, "spaceBefore": 12 if gap > size * 0.8 else 0, "spaceAfter": 0})
                previous_bottom = line["bottom"]
            if not page.chars:
                raise ValueError(f"Scanned page requires OCR: {path.name}, page {page.page_number}")
    return result


def cache_cover(row):
    directory = ROOT / "public/images/articles/issue-3"
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / f"{row['ID']}.webp"
    if not target.exists():
        match = re.search(r"/d/([^/]+)", row["Cover Image"])
        if not match:
            raise ValueError(f"Missing cover: {row['ID']}")
        url = f"https://lh3.googleusercontent.com/d/{match[1]}=w1200-rw"
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
        with Image.open(BytesIO(data)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.save(target, "WEBP", quality=92)
    with Image.open(target) as image:
        image.verify()
    return "/" + target.relative_to(ROOT / "public").as_posix()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--editorial", required=True)
    parser.add_argument("--submissions", required=True)
    parser.add_argument("--manuscripts", required=True)
    parser.add_argument("--skip-cover-download", action="store_true", help="Prepare manuscripts while covers download separately; run verification before release")
    args = parser.parse_args()
    editorial = read_csv(args.editorial)
    submissions = {row["Submission ID"]: row for row in read_csv(args.submissions)}
    eligible = [row for row in editorial if re.fullmatch(r"[3-5]\+?", (row.get("Final") or row.get("Onu") or "").strip())]
    if len({row["ID"] for row in editorial}) != len(editorial):
        raise ValueError("Duplicate editorial IDs")
    work = ROOT / "tmp/issue3/manuscripts"
    work.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.manuscripts) as archive:
        for name in archive.namelist():
            if Path(name).name != name:
                raise ValueError(f"Unexpected archive path: {name}")
        archive.extractall(work)
    if args.skip_cover_download:
        covers = {row["ID"]: f"/images/articles/issue-3/{row['ID']}.webp" for row in eligible}
    else:
        with ThreadPoolExecutor(max_workers=5) as executor:
            covers = dict(zip((row["ID"] for row in eligible), executor.map(cache_cover, eligible)))
    articles = []
    for row in eligible:
        identifier = row["ID"]
        submission = submissions[identifier]
        paths = list(work.glob(identifier + "*"))
        if len(paths) != 1:
            raise ValueError(f"Expected one manuscript for {identifier}, found {len(paths)}")
        path = paths[0]
        preference = submission["Publish Preference"]
        author = {"real-name": submission["Full Name"], "pen-name": submission["Pen Name"], "anonymous": None}[preference]
        article = {
            "id": identifier,
            "slug": (re.sub(r"[^a-z0-9]+", "-", row["Title"].lower()).strip("-") or "writing") + "-" + identifier.lower(),
            "title": row["Title"], "field": row["Field"].split(",")[0].strip(),
            "author": author, "authorType": preference,
            "coverImage": covers[identifier], "imageAlt": f"Cover image for {row['Title']}",
            "language": submission["Language"], "publishedAt": "2026-10-29", "issue": 3,
            "editorialRating": (row.get("Final") or row["Onu"]).strip(),
            "editorsNote": row["Editorial Note"] or None, "status": "published",
        }
        paragraphs = docx_paragraphs(path) if path.suffix.lower() == ".docx" else pdf_paragraphs(path, article["field"] == "poetry")
        article["manuscriptParagraphs"] = paragraphs
        lines = ["".join(run["text"] for run in block["runs"]) for block in paragraphs]
        article["content"] = lines
        article["excerpt"] = next((line.strip() for line in lines if line.strip() and line.strip().lower() != row["Title"].strip().lower()), "")[:180]
        articles.append(article)
        print(f"Imported {identifier}: {row['Title']}", flush=True)
    destination = ROOT / "src/lib/issue3-articles.json"
    destination.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"published": len(articles), "excluded": len(editorial) - len(articles), "textParagraphs": sum(len(article["manuscriptParagraphs"]) for article in articles)}, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
