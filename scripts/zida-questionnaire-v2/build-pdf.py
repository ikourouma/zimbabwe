"""Build the fillable, locked PDF of the ZIDA Implementation Readiness Questionnaire (v2).

Usage: pip install reportlab pypdf
  python3 scripts/zida-questionnaire-v2/build-pdf.py <content.json> <output.pdf> <logo.png>
Prints a newly generated owner password (needed only to edit the PDF itself); keep it out of the repo.
"""
import sys, json, html, secrets, os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                Flowable, Image, KeepTogether, CondPageBreak)
from pypdf import PdfWriter, PdfReader
from pypdf.constants import UserAccessPermissions as P

SRC, OUT, LOGO = sys.argv[1:4]
C = json.load(open(SRC))
GREEN = colors.HexColor('#14532D'); GOLD = colors.HexColor('#B8860B'); GREY = colors.HexColor('#5F6B66')
LIGHT = colors.HexColor('#EEF3EF'); LINE = colors.HexColor('#C9D3CD'); FILL = colors.HexColor('#F4F8FC'); FB = colors.HexColor('#9DB4CC')
W = A4[0] - 40 * mm
esc = html.escape

body = ParagraphStyle('b', fontName='Helvetica', fontSize=10, leading=13.5, spaceAfter=6)
small = ParagraphStyle('s', parent=body, fontSize=9.4, leading=12, spaceAfter=0)
qS = ParagraphStyle('q', parent=body, fontName='Helvetica-Bold', fontSize=10.2, leading=13.5, spaceAfter=3)
whyS = ParagraphStyle('w', parent=body, fontName='Helvetica-Oblique', textColor=GREY, spaceAfter=8)
noteS = ParagraphStyle('n', parent=small, fontName='Helvetica-Oblique', textColor=GREEN)
h1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=GREEN, spaceBefore=14, spaceAfter=2)
headS = ParagraphStyle('hd', parent=small, fontName='Helvetica-Bold', textColor=colors.white)
bulletS = ParagraphStyle('bl', parent=body, leftIndent=16, bulletIndent=4, spaceAfter=3)
nfields = 0

class TextBox(Flowable):
    def __init__(self, name, w, h, tip):
        super().__init__(); self.name, self.w, self.h, self.tip = name, w, h, tip
    def wrap(self, aw, ah): return self.w, self.h
    def draw(self):
        global nfields
        x, y = self.canv.absolutePosition(0, 0)
        self.canv.acroForm.textfield(name=self.name, tooltip=self.tip, x=x, y=y, width=self.w, height=self.h,
            fieldFlags='multiline' if self.h > 22 else '', fontName='Helvetica', fontSize=9.5 if self.h <= 22 else 9,
            borderWidth=0.6, borderColor=FB, fillColor=FILL, textColor=colors.black, forceBorder=True)

class Tick(Flowable):
    def __init__(self, name, tip, size=10):
        super().__init__(); self.name, self.tip, self.s = name, tip, size
    def wrap(self, aw, ah): return self.s, self.s
    def draw(self):
        x, y = self.canv.absolutePosition(0, 0)
        self.canv.acroForm.checkbox(name=self.name, tooltip=self.tip, x=x, y=y, size=self.s, buttonStyle='check',
            borderWidth=0.8, borderColor=FB, fillColor=FILL, textColor=GREEN, forceBorder=True)

def rule(c=GOLD, t=0.8):
    return Table([['']], colWidths=[W], rowHeights=[1], style=[('LINEABOVE', (0, 0), (-1, -1), t, c)])

def options_grid(qid, opts, width):
    global nfields
    cols = 2 if max(len(o) for o in opts) < 42 else 1
    cw = width / cols
    cells = []
    for i, o in enumerate(opts):
        cells.append(Table([[Tick(f'{qid}.opt{i+1}', f'{qid}: {o}'), Paragraph(esc(o), small)]],
                           colWidths=[16, cw - 22], style=[('VALIGN', (0, 0), (-1, -1), 'TOP'),
                           ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 2),
                           ('TOPPADDING', (0, 0), (-1, -1), 1), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
        nfields += 1
    rows = [cells[i:i + cols] + [''] * (cols - len(cells[i:i + cols])) for i in range(0, len(cells), cols)]
    return Table(rows, colWidths=[cw] * cols, style=[('LEFTPADDING', (0, 0), (-1, -1), 0), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                                    ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)])

def fields_block(qid, labels, width):
    global nfields
    rows = []
    for j, lab in enumerate(labels):
        short = len(lab) < 22
        lw = 34 * mm if short else width
        if short:
            rows.append([Paragraph(esc(lab), small), TextBox(f'{qid}.f{j+1}', 55 * mm, 17, f'{qid}: {lab}')])
        else:
            rows.append([Paragraph(esc(lab), small), ''])
            rows.append([TextBox(f'{qid}.f{j+1}', width - 4, 30, f'{qid}: {lab}'), ''])
        nfields += 1
    st = [('LEFTPADDING', (0, 0), (-1, -1), 0), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('TOPPADDING', (0, 0), (-1, -1), 2),
          ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]
    for i, r in enumerate(rows):
        if r[1] == '': st.append(('SPAN', (0, i), (1, i)))
    return Table(rows, colWidths=[36 * mm, width - 36 * mm], style=st)

story = [Spacer(1, 24), Image(LOGO, width=62 * mm, height=12.4 * mm, hAlign='LEFT'), Spacer(1, 10),
         Paragraph(esc(C['title']), ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=26, leading=32, textColor=GREEN)),
         Paragraph(esc(C['subtitle']), ParagraphStyle('st', fontName='Helvetica', fontSize=17, leading=22, textColor=GREEN, spaceAfter=4)),
         Paragraph(esc(C['tagline']), ParagraphStyle('tg', parent=body, textColor=GREY)), rule(GOLD, 1.5), Spacer(1, 10)]
mt = Table([[Paragraph(f'<b>{esc(k)}</b>', small), Paragraph(esc(v), small)] for k, v in C['meta']], colWidths=[58 * mm, W - 58 * mm])
mt.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.5, LINE), ('BACKGROUND', (0, 0), (0, -1), LIGHT), ('TEXTCOLOR', (0, 0), (0, -1), GREEN),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
story += [mt, Paragraph('Purpose', h1), rule()] + [Paragraph(esc(x), body) for x in C['purpose']]
story += [Paragraph('How to Respond', h1), rule()] + [Paragraph(esc(x), bulletS, bulletText='•') for x in C['howTo']]

n = 0
for si, s in enumerate(C['sections']):
    story += [CondPageBreak(70 * mm), Paragraph(f'{si+1}.  {esc(s["title"])}', h1), rule(), Paragraph(esc(s['why']), whyS)]
    for q in s['questions']:
        n += 1; qid = f'Q{n}'; inner = W - 26
        parts = [Paragraph(esc(q['q']) + (' <font size="8.5" color="#5F6B66">(tick all that apply)</font>' if q.get('multi') else ''), qS)]
        if q.get('options'): parts.append(options_grid(qid, q['options'], inner))
        if q.get('fields'): parts.append(fields_block(qid, q['fields'], inner))
        if q.get('note'): parts.append(Paragraph(esc(q['note']), noteS))
        blk = Table([[Paragraph(f'<b>{n}</b>', ParagraphStyle('num', parent=qS, textColor=GREEN)), parts]], colWidths=[26, inner])
        blk.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                                 ('LINEBELOW', (0, 0), (-1, -1), 0.4, LINE), ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 6)]))
        story.append(KeepTogether([blk]))

A = C['attachments']
story += [CondPageBreak(80 * mm), Paragraph(esc(A['title']), h1), rule(), Paragraph(esc(A['intro']), whyS),
          options_grid('Attach', A['items'], W), fields_block('Attach', [A['field']], W)]
K = C['contacts']; cw = [W * x for x in (0.3, 0.22, 0.2, 0.28)]
rows = [[Paragraph(esc(h), headS) for h in K['columns']]]
for r in K['roles']:
    rows.append([Paragraph(esc(r), small)] + [TextBox(f'Contact.{r}.{c}', cw[j + 1] - 10, 26, f'{r}: {c}') for j, c in enumerate(K['columns'][1:])])
    nfields += 3
ct = Table(rows, colWidths=cw); ct.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.5, LINE), ('BACKGROUND', (0, 0), (-1, 0), GREEN),
                                                       ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
story += [CondPageBreak(60 * mm), Paragraph(esc(K['title']), h1), rule(), Spacer(1, 4), ct]
story += [Paragraph('Next Steps', h1), rule()] + [Paragraph(esc(x), bulletS, bulletText=f'{i+1}.') for i, x in enumerate(C['nextSteps'])]

def deco(c, doc):
    c.saveState(); c.setFont('Helvetica', 7.5); c.setFillColor(GREY)
    if doc.page > 1: c.drawRightString(A4[0] - 20 * mm, A4[1] - 12 * mm, f'{C["title"]}  |  {C["subtitle"]}')
    c.drawCentredString(A4[0] / 2, 10 * mm, f'Confidential  |  Afronovation  |  Page {doc.page}'); c.restoreState()

tmp = OUT + '.tmp.pdf'
doc = BaseDocTemplate(tmp, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=17 * mm,
                      title=f'{C["title"]} {C["subtitle"]}', author='Afronovation, Inc.')
doc.addPageTemplates([PageTemplate('p', [Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height)], onPage=deco)])
doc.build(story)
owner = secrets.token_urlsafe(18)
w = PdfWriter(clone_from=tmp)
w.encrypt(user_password='', owner_password=owner, algorithm='AES-256',
          permissions_flag=P.PRINT | P.FILL_FORM_FIELDS | P.EXTRACT_TEXT_AND_GRAPHICS | P.PRINT_TO_REPRESENTATION | P.EXTRACT)
with open(OUT, 'wb') as f: w.write(f)
os.remove(tmp)
print('questions:', n, 'fields:', len(PdfReader(OUT).get_fields() or {}), 'pages:', len(PdfReader(OUT).pages))
print('OWNER_PASSWORD', owner)
