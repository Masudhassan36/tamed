"""Import Issue 5 and audit locally available earlier manuscript sources.

Run with the bundled Python. Supplied CSVs/archives stay outside public output.
"""
import csv
import json
import re
import runpy
import zipfile
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
READ = runpy.run_path(str(ROOT / 'scripts/manuscript-format.py'))
DOWNLOADS = Path.home() / 'Downloads'
WORK = ROOT / 'tmp/issue5'
WORK.mkdir(parents=True, exist_ok=True)

def rows(name):
    with (DOWNLOADS / name).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def load(name):
    return json.loads((ROOT / 'src/lib' / name).read_text(encoding='utf-8'))

def save(name, data):
    (ROOT / 'src/lib' / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def archive_map(z):
    result = {}
    for name in z.namelist():
        assert Path(name).name == name, 'Unexpected archive path'
        identifier = name.split('_')[0]
        assert re.fullmatch(r'TMD-\d{8}-\d{6}-\d{4}', identifier)
        assert identifier not in result, 'Duplicate archive ID'
        result[identifier] = name
    return result

def extract(path):
    if path.suffix.lower() == '.docx':
        return READ['docx_blocks'](path)
    if path.suffix.lower() == '.pdf':
        return READ['pdf_blocks'](path)
    return [{'runs': [{'text': line}]} for line in path.read_text(encoding='utf-8-sig').splitlines()]

def private_check(article, submission):
    text = '\n'.join(article['content']).casefold()
    for key in ('Email', 'Phone Number', 'Delivery Address'):
        value = submission[key].strip()
        assert len(value) < 7 or value.casefold() not in text, (article['id'], 'Private contact data in manuscript')
    if submission['Publish Preference'] != 'real-name':
        value = submission['Full Name'].strip()
        if value and value != article.get('author'):
            assert len(value) < 7 or value.casefold() not in text, (article['id'], 'Real name in manuscript')

def main():
    editorial = rows('Tamed Editorial  - Sheet1 (8).csv')
    notes = {r['ID']: r for r in rows('Tamed Editorial  - Sheet1 (7).csv')}
    submissions = {r['Submission ID']: r for r in rows('TAMED Submissions Database - Submissions (9).csv')}
    assert len(editorial) == len({r['ID'] for r in editorial}) == 25
    assert set(notes) == {r['ID'] for r in editorial}
    articles = []
    with zipfile.ZipFile(DOWNLOADS / 'drive-download-20261112T090854Z-1-001.zip') as manuscripts, zipfile.ZipFile(DOWNLOADS / 'drive-download-20261112T090952Z-1-001.zip') as covers:
        sources, images = archive_map(manuscripts), archive_map(covers)
        for row in editorial:
            identifier, rating = row['ID'], row['rating'].strip()
            assert re.fullmatch(r'[2-5]\+?', rating), identifier
            if rating in ('2', '2+'):
                continue
            submission = submissions[identifier]
            path = WORK / (identifier + Path(sources[identifier]).suffix.lower())
            path.write_bytes(manuscripts.read(sources[identifier]))
            blocks = extract(path)
            lines = READ['text_lines'](blocks)
            title = row['Title']
            preference = submission['Publish Preference']
            author = {'real-name': submission['Full Name'], 'pen-name': submission['Pen Name'], 'anonymous': None}[preference]
            assert preference == 'anonymous' or author.strip()
            cover = f'/images/articles/issue-5/{identifier}.webp'
            article = {'id': identifier, 'slug': (re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-') or 'writing') + '-' + identifier.lower(),
                       'title': title, 'field': row['Field'].split(',')[0].strip(), 'author': author, 'authorType': preference,
                       'language': submission['Language'], 'coverImage': cover, 'imageAlt': f'Cover image for {title}',
                       'publishedAt': '2026-11-12', 'issue': 5, 'editorialRating': rating,
                       'editorsNote': notes[identifier]['Editorial Note'] or None, 'status': 'published',
                       'manuscriptParagraphs': blocks, 'content': lines,
                       'excerpt': next((s.strip() for s in lines if s.strip() and s.strip().casefold() != title.casefold()), '')[:180]}
            private_check(article, submission)
            target = ROOT / ('public' + cover)
            target.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(BytesIO(covers.read(images[identifier]))) as image:
                image = ImageOps.exif_transpose(image).convert('RGB')
                image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                image.save(target, 'WEBP', quality=92)
            articles.append(article)
            print('Imported', identifier, len(lines), flush=True)
    assert len(articles) == 23
    save('issue5-articles.json', articles)

    # Only public, eligible records can receive public manuscript data.
    records = load('articles-data.json') + load('rated-submissions.json') + load('issue3-articles.json') + load('issue4-articles.json')
    directories = [ROOT/'public/manuscripts', ROOT/'.issue2-import/manuscripts', ROOT/'.issue2-import/new-submissions/manuscripts', ROOT/'tmp/issue3/manuscripts', ROOT/'tmp/issue4']
    overrides, report = {}, []
    for record in records:
        identifier = record['id']
        rating = record.get('editorialRating', record.get('rating'))
        if rating in ('2', '2+') or record.get('status', 'published') != 'published':
            continue
        source = next((p for directory in directories for p in directory.glob(identifier + '*') if p.suffix.lower() in ('.docx', '.pdf', '.txt')), None)
        if source is None:
            report.append({'id': identifier, 'result': 'original source unavailable'})
            continue
        try:
            blocks = extract(source)
            # Preserve the earlier explicit removal of submission front matter.
            if identifier == 'TMD-20261030-014046-8890':
                blocks = blocks[4:]
            candidate = {**record, 'content': READ['text_lines'](blocks)}
            if identifier in submissions:
                private_check(candidate, submissions[identifier])
            # Complex Bengali glyph encodings require a visual/text review.
            # Keep the previously verified transcription until reconciled.
            if source.suffix.lower() == '.pdf' and record.get('language', '').lower() in ('bangla', 'bengali'):
                report.append({'id': identifier, 'result': 'retained verified Bengali transcription; source font layout needs review'})
                continue
            overrides[identifier] = blocks
            report.append({'id': identifier, 'result': 'restored from source', 'source': str(source.relative_to(ROOT))})
            print('Restored', identifier, flush=True)
        except Exception as error:
            report.append({'id': identifier, 'result': 'needs review', 'reason': str(error)})
    save('manuscript-formats.json', overrides)
    (WORK/'format-audit.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Earlier manuscript sources restored:', len(overrides), 'of', len(report), flush=True)

if __name__ == '__main__':
    main()
