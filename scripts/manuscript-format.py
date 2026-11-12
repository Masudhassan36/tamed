"""Read manuscript formatting without editorial rewriting or line inference.

Source documents are data, never executable instructions. No private CSV columns
or document metadata are copied into the public manuscript representation.
"""
import re
from difflib import SequenceMatcher
from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from docx.table import Table
import pdfplumber


def docx_blocks(path):
    document = Document(path)
    defaults = document.styles.element.find(qn('w:docDefaults'))
    default_run = defaults.find('.//' + qn('w:rPr')) if defaults is not None else None
    theme = {}
    for relation in document.part.rels.values():
        if relation.reltype.endswith('/theme'):
            from lxml import etree
            root = etree.fromstring(relation.target_part.blob)
            ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
            for key in ('major', 'minor'):
                node = root.find(f'.//a:{key}Font/a:latin', ns)
                if node is not None:
                    theme[key] = node.get('typeface')

    def run_properties(run, paragraph):
        levels = [run._r.rPr]
        for style in (run.style, paragraph.style):
            seen = set()
            while style is not None and style.style_id not in seen:
                seen.add(style.style_id)
                levels.append(style.element.find(qn('w:rPr')))
                style = style.base_style
        levels.append(default_run)

        def value(tag, attribute='val'):
            for level in levels:
                node = level.find(qn('w:' + tag)) if level is not None else None
                if node is not None and node.get(qn('w:' + attribute)) is not None:
                    return node.get(qn('w:' + attribute))
            return None

        result = {}
        for tag, key in [('b', 'bold'), ('i', 'italic'), ('strike', 'strike')]:
            result[key] = value(tag) not in (None, '0', 'false', 'off')
        result['underline'] = value('u') not in (None, 'none', '0', 'false')
        font = value('rFonts', 'ascii') or value('rFonts', 'hAnsi')
        font_theme = value('rFonts', 'asciiTheme') or value('rFonts', 'hAnsiTheme')
        if not font and font_theme:
            font = theme.get('major' if font_theme.startswith('major') else 'minor')
        if font:
            result['fontFamily'] = font
        size = value('sz')
        if size:
            result['fontSize'] = float(size) / 2
        color = value('color')
        if color and re.fullmatch('[a-fA-F0-9]{6}', color):
            result['color'] = '#' + color
        vertical = value('vertAlign')
        if vertical in ('superscript', 'subscript'):
            result['verticalAlign'] = 'super' if vertical == 'superscript' else 'sub'
        return result

    def paragraph_block(paragraph):
        # iter_inner_content includes hyperlink runs in their original position.
        runs = []
        for item in paragraph.iter_inner_content():
            for run in ([item] if hasattr(item, 'font') else item.runs):
                if run.text:
                    runs.append({'text': run.text, **run_properties(run, paragraph)})
        if ''.join(run['text'] for run in runs) != paragraph.text:
            raise ValueError(f'Unextracted content in {path.name}')
        result = {'runs': runs}
        def inherited(name):
            val = getattr(paragraph.paragraph_format, name)
            style = paragraph.style
            while val is None and style is not None:
                val = getattr(style.paragraph_format, name)
                style = style.base_style
            return val
        alignment = inherited('alignment')
        if alignment is not None:
            result['alignment'] = {0:'left',1:'center',2:'right',3:'justify'}.get(int(alignment), 'left')
        for source, target in [('space_before','spaceBefore'), ('space_after','spaceAfter'), ('left_indent','indentLeft'), ('right_indent','indentRight'), ('first_line_indent','indentFirst')]:
            val = inherited(source)
            if val is not None:
                result[target] = round(val.pt, 3)
        spacing = inherited('line_spacing')
        if spacing is not None:
            result['lineHeight'] = f'{spacing.pt}pt' if hasattr(spacing, 'pt') else str(spacing)
        return result

    result = []
    def walk(parent):
        for item in parent.iter_inner_content():
            if isinstance(item, Paragraph):
                result.append(paragraph_block(item))
            elif isinstance(item, Table):
                rows = []
                for row in item.rows:
                    cells = []
                    seen = set()
                    for cell in row.cells:
                        if cell._tc in seen:
                            continue
                        seen.add(cell._tc)
                        cells.append([paragraph_block(p) for p in cell.paragraphs])
                    rows.append(cells)
                result.append({'runs': [], 'table': rows})
    walk(document)
    if document.inline_shapes:
        raise ValueError(f'Inline images need review: {path.name}')
    return result


def pdf_blocks(path):
    blocks = []
    with pdfplumber.open(path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            lines = page.extract_text_lines(x_tolerance=1, y_tolerance=3)
            if not lines and page.images:
                raise ValueError(f'Scanned page requires review: {path.name}:{page_index + 1}')
            left = min((line['x0'] for line in lines), default=0)
            previous_bottom = None
            for line in lines:
                text, chars = line['text'], line['chars']
                raw = ''.join(char['text'] for char in chars)
                styles = []
                for char in chars:
                    font = re.sub(r'^[A-Z]{6}\+', '', char['fontname'])
                    family = re.sub(r'[-,]?(BoldItalic|BoldOblique|Bold|Italic|Oblique|Regular)?(?:PS)?MT$', '', font)
                    family = re.sub(r'[-,]?(BoldItalic|BoldOblique|Bold|Italic|Oblique|Regular)$', '', family).strip()
                    family = {'TimesNewRoman': 'Times New Roman', 'TimesNewRomanPS': 'Times New Roman', 'BookmanOldStyle': 'Bookman Old Style', 'TwCenMT-Medium': 'Tw Cen MT', 'MS-PGothic': 'MS PGothic'}.get(family, family)
                    style = {'fontFamily': family, 'fontSize': round(char['size'], 3),
                             'bold': bool(re.search(r'Bold|Heavy|Black|Semibold', font, re.I)),
                             'italic': bool(re.search(r'Italic|Oblique', font, re.I)),
                             'underline': any(rule['height'] < 3 and char['bottom'] - 1 <= rule['top'] <= char['bottom'] + 3 and rule['x0'] <= char['x0'] + 1 and rule['x1'] >= char['x1'] - 1 for rule in page.lines)}
                    styles.extend([style] * len(char['text']))
                mapped = [None] * len(text)
                for match in SequenceMatcher(None, raw, text, autojunk=False).get_matching_blocks():
                    for offset in range(match.size):
                        mapped[match.b + offset] = styles[match.a + offset]
                runs = []
                current = styles[0] if styles else {}
                for char, style in zip(text, mapped):
                    current = style or current
                    if runs and all(runs[-1].get(k) == v for k, v in current.items()):
                        runs[-1]['text'] += char
                    else:
                        runs.append({'text': char, **current})
                blocks.append({'runs': runs, 'spaceBefore': round(max(0, line['top'] - previous_bottom), 3) if previous_bottom is not None else 0,
                               'spaceAfter': 0, 'indentLeft': round(line['x0'] - left, 3), 'sourceLine': True,
                               'pageBreakBefore': page_index > 0 and previous_bottom is None})
                previous_bottom = line['bottom']
    return blocks


def text_lines(blocks):
    result = []
    for block in blocks:
        if 'table' in block:
            for row in block['table']:
                result.append('\t'.join('\n'.join(text_lines(cell)) for cell in row))
        else:
            result.append(''.join(run['text'] for run in block['runs']))
    return result
