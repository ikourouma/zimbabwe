// Builds the Word version of the ZIDA Implementation Readiness Questionnaire (v2) from content.json.
// Usage: npm install --no-save docx
//   node scripts/zida-questionnaire-v2/build-docx.cjs <content.json> <output.docx> <logo.png>
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  BorderStyle, Header, Footer, PageNumber, LevelFormat, ImageRun, TableLayoutType } = require('docx');
const [src, out, logo] = process.argv.slice(2);
const C = JSON.parse(fs.readFileSync(src, 'utf8'));
const GREEN = '14532D', GOLD = 'B8860B', GREY = '5F6B66', LIGHT = 'EEF3EF', LINE = 'C9D3CD', FILL = 'F4F8FC';
const W = 9638, F = 'Calibri';
const t = (text, o = {}) => new TextRun({ text, font: F, size: 21, ...o });
const p = (c, o = {}) => new Paragraph({ spacing: { after: 100 }, ...o, children: Array.isArray(c) ? c : [t(c)] });
const h1 = (s) => new Paragraph({ spacing: { before: 300, after: 60 }, keepNext: true, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } },
  children: [t(s, { size: 28, bold: true, color: GREEN })] });
const b = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: b, bottom: b, left: b, right: b };
const cell = (kids, w, fill) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders, margins: { top: 60, bottom: 60, left: 100, right: 100 },
  shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined, children: Array.isArray(kids) ? kids : [kids] });
const box = (h = 400) => new Table({ width: { size: W - 500, type: WidthType.DXA }, columnWidths: [W - 500], layout: TableLayoutType.FIXED,
  rows: [new TableRow({ height: { value: h, rule: 'atLeast' }, children: [cell(p(''), W - 500, FILL)] })], indent: { size: 500, type: WidthType.DXA } });
const kids = [];
kids.push(new Paragraph({ spacing: { before: 400, after: 160 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(logo), transformation: { width: 230, height: 46 } })] }));
kids.push(p([t(C.title, { size: 52, bold: true, color: GREEN })], { spacing: { after: 40 } }));
kids.push(p([t(C.subtitle, { size: 34, color: GREEN })], { spacing: { after: 60 } }));
kids.push(p([t(C.tagline, { color: GREY })], { spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } } }));
kids.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [3200, W - 3200], layout: TableLayoutType.FIXED,
  rows: C.meta.map(([k, v]) => new TableRow({ children: [cell(p([t(k, { bold: true, color: GREEN })], { spacing: { after: 0 } }), 3200, LIGHT), cell(p(v, { spacing: { after: 0 } }), W - 3200)] })) }));
kids.push(h1('Purpose')); C.purpose.forEach(x => kids.push(p(x)));
kids.push(h1('How to Respond')); C.howTo.forEach(x => kids.push(new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 60 }, children: [t(x)] })));
let n = 0;
C.sections.forEach((s, si) => {
  kids.push(h1(`${si + 1}.  ${s.title}`));
  kids.push(p([t(s.why, { italics: true, color: GREY })]));
  s.questions.forEach(q => {
    n++;
    kids.push(p([t(`${n}.  `, { bold: true, color: GREEN }), t(q.q, { bold: true }), ...(q.multi ? [t('  (tick all that apply)', { size: 18, color: GREY })] : [])], { spacing: { before: 160, after: 60 }, keepNext: true }));
    (q.options || []).forEach(o => kids.push(p([t('☐  ', { size: 24 }), t(o)], { indent: { left: 500 }, spacing: { after: 30 }, keepNext: true })));
    (q.fields || []).forEach(f => { kids.push(p([t(f, { size: 19, color: GREY })], { indent: { left: 500 }, spacing: { before: 60, after: 30 }, keepNext: true })); kids.push(box(f.length < 22 ? 340 : 600)); });
    if (q.note) kids.push(p([t(q.note, { italics: true, color: GREEN, size: 19 })], { indent: { left: 500 }, spacing: { before: 60 } }));
  });
});
const A = C.attachments;
kids.push(h1(A.title)); kids.push(p([t(A.intro, { italics: true, color: GREY })]));
A.items.forEach(o => kids.push(p([t('☐  ', { size: 24 }), t(o)], { indent: { left: 200 }, spacing: { after: 30 } })));
kids.push(p([t(A.field, { size: 19, color: GREY })], { spacing: { before: 80, after: 30 } })); kids.push(box(600));
const K = C.contacts, cw = [2900, 2100, 1900, W - 6900];
kids.push(h1(K.title));
kids.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cw, layout: TableLayoutType.FIXED, rows: [
  new TableRow({ tableHeader: true, children: K.columns.map((h, i) => cell(p([t(h, { bold: true, color: 'FFFFFF', size: 19 })], { spacing: { after: 0 } }), cw[i], GREEN)) }),
  ...K.roles.map(r => new TableRow({ height: { value: 480, rule: 'atLeast' }, children: [cell(p(r, { spacing: { after: 0 } }), cw[0]), ...cw.slice(1).map(w => cell(p(''), w, FILL))] }))] }));
kids.push(h1('Next Steps'));
C.nextSteps.forEach(x => kids.push(new Paragraph({ numbering: { reference: 'n', level: 0 }, spacing: { after: 60 }, children: [t(x)] })));
const doc = new Document({ creator: 'Afronovation, Inc.', title: `${C.title} ${C.subtitle}`,
  numbering: { config: [
    { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [p([t(`${C.title}  |  ${C.subtitle}`, { size: 16, color: GREY })], { alignment: AlignmentType.RIGHT })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t('Confidential  |  Afronovation  |  Page ', { size: 16, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: F, size: 16, color: GREY })] })] }) },
    children: kids }] });
Packer.toBuffer(doc).then(x => { fs.writeFileSync(out, x); console.log('questions:', n); });
