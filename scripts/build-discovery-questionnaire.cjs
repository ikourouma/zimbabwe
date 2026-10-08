// Builds the NDAP Pre-Implementation Discovery Questionnaire (.docx).
// Reusable template: for a new platform, edit the cover details, the Strategic
// Alignment tables, the sections list and the ALIGN lines, then run:
//   npm install --no-save docx
//   node scripts/build-discovery-questionnaire.cjs docs/pre-implementation/<Platform>-Pre-Implementation-Discovery-Questionnaire.docx

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, AlignmentType, HeadingLevel, BorderStyle, Footer, Header, PageNumber,
  LevelFormat, PageBreak, TableLayoutType,
} = require('docx');

const GREEN = '14532D', GOLD = 'B8860B', GREY = '5F6B66', LIGHT = 'EEF3EF', LINE = 'C9D3CD';
const FONT = 'Calibri';
const W = 9638; // A4 text width at 1" margins (11906 - 2*1134)

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: 21, ...o });
const p = (children, o = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, ...o, children: Array.isArray(children) ? children : [t(children)] });
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 }, keepNext: true,
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } },
  children: [new TextRun({ text, font: FONT, size: 28, bold: true, color: GREEN })] });
const intro = (text) => p([t(text, { italics: true, color: GREY })], { keepNext: true });
const bullet = (children) => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 80 }, children: Array.isArray(children) ? children : [t(children)] });
const numbered = (children) => new Paragraph({ numbering: { reference: 'n', level: 0 }, spacing: { after: 80 }, children: Array.isArray(children) ? children : [t(children)] });

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (content, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders,
  margins: { top: 80, bottom: 80, left: 110, right: 110 },
  shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
  children: (Array.isArray(content) ? content : [content]).map(c => typeof c === 'string'
    ? new Paragraph({ spacing: { after: 0 }, children: [t(c, o.run || {})] }) : c),
});
const table = (widths, header, rows) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
  rows: [
    new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { fill: GREEN, run: { bold: true, color: 'FFFFFF', size: 19 } })) }),
    ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? 'FFFFFF' : 'FAFBFA', run: { size: 20 } })) })),
  ],
});

// Question sections: [id, title, why, [questions]]
const QW = [700, 5438, 3500];
let sections = [
  ['', 'Strategic Alignment and Digital Government',
    'These answers ensure the platform is implemented as part of Government\u2019s digital transformation agenda, reported against national priorities, and positioned as the first visible layer of a wider programme rather than a standalone system.', [
    'Which national strategies, frameworks or standards must the platform formally align with (for example, Vision 2030, NDS2, the Smart Zimbabwe 2030 Master Plan, or any e-government, interoperability or data-governance framework)?',
    'Must the Ministry of ICT, Postal and Courier Services, or GISP, review or endorse the platform as part of Government\u2019s digitalisation of its systems? If so, which unit or official should we engage?',
    'Is there a national digital-government programme, office or committee the platform should be registered with or report progress to?',
    'Which NDS2 priorities or Vision 2030 targets should the platform\u2019s performance indicators report against?',
    'Are other government digital initiatives under way (for example, e-services portals, digital identity or data-exchange projects) with which the platform should align or share infrastructure?',
    'Beyond investment promotion, which National Digital Acceleration Program workstreams would Government like considered in the roadmap: digital government services, interoperability and secure data exchange, e-payments and e-tax, secure documents and records, tourism, embassy and diaspora systems, or data and AI decision support?',
  ]],
  ['', 'Executive Sponsorship and Governance',
    'Clear ownership and decision rights determine the governance model, the approval path and the timeline we plan against.', [
    'Who is the executive sponsor for the platform, and who will be the accountable business owner once it is in production?',
    'Beyond ZIDA, which institutions must approve or be consulted before go-live (for example, the Office of the President and Cabinet, the Ministry of ICT, Postal and Courier Services, the Ministry of Finance)?',
    'Is a steering committee envisaged? If so, who would sit on it and how often would it meet?',
    'Which position in Government should hold the national Government Reviewer role?',
    'Who should hold the Platform Manager (owner) tier in production: ZIDA, Afronovation under a written arrangement, or both?',
    'Which ministries should be onboarded in the first phase, and which in later phases?',
    'Is there a target go-live date, or a national event, investment conference or reporting deadline driving the timeline?',
    'Who has authority to sign off user acceptance testing and declare the platform ready for launch?',
  ]],
  ['', 'Procurement and Commercial Framework',
    'These answers allow us to structure acquisition options that fit your procurement rules and budget cycle rather than requiring them to adapt.', [
    'Which procurement route applies to this engagement (for example, a competitive tender under PRAZ regulations, direct procurement, or a development-partner-funded process)?',
    'Has a budget been allocated or requested for this initiative? Which fiscal year and budget line would it fall under?',
    'Is any development partner, donor or financing institution expected to fund or co-fund the platform?',
    'Which acquisition model does Government prefer: a one-time implementation with annual support, an annual subscription, or a fully managed service?',
    'Which operating model is of interest: (a) Afronovation Managed Service, (b) Hybrid, with Afronovation operating first and transferring operations to ZIDA over an agreed period, or (c) Government-Operated, with ZIDA’s team running the platform with Afronovation support? More than one may be selected for costing.',
    'In which currency must contracts be priced and paid, and are there foreign-exchange or payment-timing constraints we should plan for?',
    'Are there mandatory contract terms, local-partner or local-content requirements, performance guarantees or insurance levels we must meet?',
    'Is software escrow or a similar continuity arrangement required, given that Afronovation retains the platform intellectual property?',
  ]],
  ['', 'Hosting, Infrastructure and Data Residency',
    'Hosting location is the single largest driver of cost, security posture and time to production. The pilot currently runs on commercial cloud services located largely outside Zimbabwe; the production location will follow Government’s answers below.', [
    'Does Government have a policy on where official data must be stored? Must platform data remain within Zimbabwe, or are regional or international locations acceptable?',
    'What is Government’s preferred hosting approach: a government-owned data centre, a national or shared government cloud, a local commercial provider, or an international public cloud (for example, Microsoft Azure, AWS or Google Cloud)?',
    'Is hosting through the Government Internet Service Provider (GISP) required or preferred for government platforms? What hosting, connectivity and service levels can GISP provide?',
    'Does ZIDA or Government already hold subscriptions or agreements with any cloud provider that the platform could use?',
    'If on-premises hosting is preferred: where is the facility, who operates it, and what is its power backup, cooling, physical security and internet redundancy?',
    'What availability does Government expect (for example, 99.5% or 99.9%), and are there preferred maintenance windows?',
    'In a serious outage, how much data could Government accept losing, and how quickly must service be restored?',
    'Will separate environments be required for testing, training and production?',
    'Should the production platform operate under a .gov.zw address? Who administers ZIDA’s domain names and DNS today?',
    'What internet connectivity is typical at ZIDA and ministry offices, and do officials mainly work on desktop computers, laptops or mobile devices?',
  ]],
  ['', 'Email Infrastructure and Official Domains',
    'For security, access to government roles on the platform will be restricted to verified official government email addresses. Generic addresses (Gmail, Yahoo and similar) will not be accepted for government users. Annex A records the position for each ministry.', [
    'Which email platform does ZIDA use today: Microsoft 365, Google Workspace, an on-premises server such as Exchange, or another service? Which domain(s) does ZIDA send email from?',
    'Do all ministries and their officials have official .gov.zw email addresses? Please complete Annex A for each ministry expected to use the platform.',
    'Are some officials currently using personal or generic email accounts for official business?',
    'Where a ministry has no registered .gov.zw domain, who can instruct it to obtain one through GISP, the designated government domain registration and hosting provider, and what turnaround should we expect?',
    'Does GISP provide official email services to ministries? If so, on which platform, and must any new government email service be delivered through or approved by GISP?',
    'Is a government-wide email or collaboration initiative already planned or under way? Where a ministry does not yet have official email in place, Afronovation can support ZIDA, GISP and the relevant authorities in establishing it, for example on Microsoft 365.',
    'Should platform notifications (approvals, alerts, investor correspondence) be sent from a .gov.zw address? Who can authorise the DNS records needed to send securely from that domain?',
    'Does Government accept the policy that government accounts on the platform are issued only to verified official email addresses?',
  ]],
  ['', 'Identity, Access and User Volumes',
    'Access design and user numbers drive licensing, capacity planning and the onboarding effort for each ministry.', [
    'Does Government use a central user directory (for example, Microsoft Entra ID or Active Directory)? Would single sign-on with it be desired?',
    'Is multi-factor authentication mandated for government systems? Are officials issued government-managed devices?',
    'How are officials joining, changing roles or leaving handled today, and who in each ministry should approve platform accounts?',
    'Approximately how many government users are expected in the first year (by ministry and ZIDA), and in three years?',
    'Approximately how many investors are expected to register in the first year, and how many to seek accreditation as qualified investors?',
    'What due-diligence evidence does ZIDA require to accredit an investor, and should the platform check it against any national registry?',
  ]],
  ['', 'Security, Privacy and Regulatory Compliance',
    'The platform will hold confidential project and investor information. These answers define the security controls, approvals and assurance activities we must include.', [
    'Which laws, regulations and policies must the platform comply with (for example, the Cyber and Data Protection Act [Chapter 12:07] and any ICT or cybersecurity policy issued by Government)?',
    'Is ZIDA registered with POTRAZ as a data controller, and has a Data Protection Officer been appointed?',
    'Which information security standards does Government require or follow (for example, ISO/IEC 27001 or national standards)?',
    'Is a formal security review, accreditation or independent penetration test required before go-live? Who performs it?',
    'How long must audit records, project documents and investor data be retained, and are National Archives or records-management rules applicable?',
    'Does GISP or another government body provide centralised security monitoring the platform should connect to? ZidaProject includes built-in security monitoring, audit trail and compliance controls, which can operate on their own or feed into government monitoring.',
    'Is there a national cyber incident response team or security operations function we should integrate with? Who must be notified of a security incident, and within what time?',
    'What vetting, clearance or confidentiality undertakings are required for vendor personnel with access to the platform or its data?',
    'Please confirm the data ownership position set out in the Platform Document: Zimbabwe owns its data and content; Afronovation retains the platform intellectual property.',
  ]],
  ['', 'Data, Content and Integrations',
    'Content readiness and integrations are often underestimated. These answers size the migration, onboarding and integration work.', [
    'Where does the current project pipeline information sit (documents, spreadsheets, other systems), and approximately how many projects and documents will be loaded at launch?',
    'Who will be responsible for preparing and validating project content before it is published?',
    'Which existing ZIDA or government systems should the platform connect to (for example, the ZIDA website, investment licensing, company registration or CRM systems)?',
    'Are electronic signatures legally acceptable for memoranda of understanding? Is there a preferred or mandated e-signature provider?',
    'Beyond English and French, are other languages required for investors or officials?',
    'Are there reporting needs for Cabinet, the Board or development partners that the platform must produce or feed into?',
  ]],
  ['', 'Team Capability, Support and Operating Model',
    'The right operating model depends on the capacity Government already has. These answers determine the support, training and knowledge-transfer components of each option.', [
    'How large is ZIDA’s ICT team, and what skills does it hold today (cloud or server administration, web applications, databases, cybersecurity, service desk)?',
    'Does ZIDA have a service desk or IT service management tool that platform support should integrate with?',
    'What support coverage is expected: business hours (Central Africa Time), extended hours, or 24/7? What response times are expected for critical issues?',
    'Who within ZIDA will perform day-to-day platform administration (publishing, investor accreditation, account management)?',
    'How many people require training, in which roles, and in what format (on-site in Harare, virtual, or train-the-trainer)?',
    'If the Hybrid model is preferred, over what period should operations transfer to ZIDA, and what should ZIDA’s team be able to do independently at the end of it?',
    'How will the platform be introduced to ministries and investors, and who will lead that communication?',
  ]],
  ['', 'Success Measures and Assurance',
    'Agreeing how success is measured at the outset allows each option to be priced against outcomes Government values.', [
    'Which outcomes would make this platform a success in its first year (for example, projects published, investor registrations, engagements opened, time from enquiry to response)?',
    'How often, and to whom, should performance of the platform and the service be reported?',
    'Will the platform be subject to independent audit or evaluation (for example, by the Auditor-General or a development partner)?',
  ]],
];

let qn = 0;
sections = sections.map((sec, i) => [String.fromCharCode(65 + i), ...sec.slice(1)]);
const ALIGN = {
  'Strategic Alignment and Digital Government': ['Vision 2030 / Smart Zimbabwe 2030', 'anchors the platform in Government\u2019s digital transformation agenda, so every NDAP workstream builds on shared direction, standards and oversight.'],
  'Executive Sponsorship and Governance': ['NDS2 / ZIDA mandate', 'clear institutional ownership keeps delivery coordinated across ministries and accountable to national priorities.'],
  'Procurement and Commercial Framework': ['NDS2', 'a transparent, well-structured acquisition supports accountable, value-for-money delivery of national digital infrastructure.'],
  'Hosting, Infrastructure and Data Residency': ['Smart Zimbabwe 2030 / Government digitalisation', 'keeps national data under Government\u2019s authority on designated infrastructure, the foundation that later NDAP services will share.'],
  'Email Infrastructure and Official Domains': ['Government digitalisation', 'a trusted .gov.zw identity for every official is a prerequisite for secure digital government, and is reused by every future system.'],
  'Identity, Access and User Volumes': ['Smart Zimbabwe 2030 / ZIDA mandate', 'secure, verified access for officials and investors builds trust in government digital services and strengthens investor facilitation.'],
  'Security, Privacy and Regulatory Compliance': ['Government digitalisation', 'protecting official and investor information under national law is what allows Government to digitise its systems with confidence.'],
  'Data, Content and Integrations': ['Smart Zimbabwe 2030 / NDAP Interoperability', 'connected, well-governed data avoids new silos and prepares for secure data exchange across institutions.'],
  'Team Capability, Support and Operating Model': ['Vision 2030 / NDAP Capacity Transfer', 'builds local skills so Zimbabwe can sustain and grow its own digital systems.'],
  'Success Measures and Assurance': ['NDS2 / ZIDA mandate', 'ties platform results to measurable investment outcomes that advance Vision 2030.'],
};
const alignLine = (title) => {
  const [tag, text] = ALIGN[title];
  return new Paragraph({ keepNext: true, spacing: { before: 60, after: 160 }, indent: { left: 120 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: LIGHT },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 8 } },
    children: [t('NDAP alignment \u2014 ', { bold: true, color: GREEN, size: 20 }), t(tag + ': ', { bold: true, color: GOLD, size: 20 }), t(text, { size: 20 })] });
};
const sectionBlocks = sections.flatMap(([id, title, why, qs]) => [
  h1(`${id}.  ${title}`),
  intro(why),
  alignLine(title),
  table(QW, ['No.', 'Question', 'Response'], qs.map((q, i) => { qn++; return [`${id}${i + 1}`, q, '']; })),
]);

// Annex A: blank ministry register (ZIDA pre-filled as the only known row)
const AW = [2400, 1700, 1500, 1100, 1738, 1200];
const annexA = table(AW,
  ['Ministry / Institution', 'Official domain', 'Email platform', 'Registered with GISP (Y/N)', 'ICT focal point (name, email)', 'Expected platform users'],
  [['Zimbabwe Investment and Development Agency (ZIDA)', '', '', '', '', ''], ...Array.from({ length: 21 }, () => ['', '', '', '', '', ''])]);

const CW = [2600, 2200, 2200, 2638];
const annexB = table(CW, ['Area of responsibility', 'Name', 'Title', 'Email and phone'],
  ['Executive sponsor', 'Accountable business owner', 'ICT lead', 'Information security / Data Protection Officer',
    'Procurement', 'Legal', 'Finance', 'Communications'].map(a => [a, '', '', '']));

const metaRows = [
  ['To', 'Chief Executive Officer, Zimbabwe Investment and Development Agency (ZIDA)'],
  ['Copy', 'Ambassador of the Republic of Zimbabwe to the United States of America; other Government executives as designated by ZIDA'],
  ['From', 'Afronovation'],
  ['Date', '8 October 2026'],
  ['Responses due to Afronovation by', '15 October 2026'],
  ['Classification', 'Confidential — for Government of Zimbabwe and Afronovation use only'],
];
const metaTable = new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [2600, 7038], layout: TableLayoutType.FIXED,
  rows: metaRows.map(([k, v]) => new TableRow({ children: [
    cell(k, 2600, { fill: LIGHT, run: { bold: true, color: GREEN } }), cell(v, 7038)] })),
});

const doc = new Document({
  creator: 'Afronovation', title: 'ZidaProject Pre-Implementation Discovery Questionnaire',
  styles: { default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [{ id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: FONT, size: 28, bold: true, color: GREEN }, paragraph: { outlineLevel: 0 } }] },
  numbering: { config: [
    { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
      new TextRun({ text: 'ZidaProject  |  Pre-Implementation Discovery Questionnaire', font: FONT, size: 16, color: GREY })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'Confidential  |  Afronovation  |  Page ', font: FONT, size: 16, color: GREY }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY })] })] }) },
    children: [
      new Paragraph({ spacing: { before: 600, after: 60 }, children: [new TextRun({ text: 'AFRONOVATION', font: FONT, size: 20, bold: true, color: GOLD, characterSpacing: 60 })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'ZidaProject', font: FONT, size: 52, bold: true, color: GREEN })] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Pre-Implementation Discovery Questionnaire', font: FONT, size: 34, color: GREEN })] }),
      new Paragraph({ spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } },
        children: [t('Zimbabwe Digital Investment and Economic Intelligence Platform — moving from pilot to production', { color: GREY, size: 22 })] }),
      metaTable,

      h1('Purpose'),
      p('We thank ZIDA and the Government delegation for the constructive demonstration session and the encouraging response to the platform. Government has asked what it will cost to implement the platform in production. A responsible answer depends on the environment in which the platform will be hosted, secured, operated and supported, and on the capacity Government wishes to build in-house.'),
      p('This questionnaire gathers that information. Your responses will allow Afronovation to present costed acquisition options, each aligned with international best practice for government platforms:'),
      bullet([t('Afronovation Managed Service', { bold: true }), t(' — Afronovation hosts, operates, secures and supports the platform under agreed service levels.')]),
      bullet([t('Hybrid', { bold: true }), t(' — Afronovation operates the platform initially and transfers operations to ZIDA’s team over an agreed period.')]),
      bullet([t('Government-Operated', { bold: true }), t(' — ZIDA or Government ICT operates the platform, with Afronovation providing engineering, updates and specialist support.')]),

      h1('Strategic Alignment'),
      p('ZidaProject is the first visible layer of Afronovation\u2019s National Digital Acceleration Program (NDAP): a structured pathway that helps Government move from digital ambition to governed, measurable execution. This questionnaire is the first step of NDAP implementation, aligning the platform with national priorities before production begins.'),
      table([2600, 3719, 3319], ['National priority', 'What it requires', 'How ZidaProject contributes'], [
        ['Vision 2030', 'Sustained investment into productive sectors toward upper-middle-income status', 'A credible, current, investor-facing view of the national project pipeline'],
        ['National Development Strategy 2 (2026\u20132030)', 'Coordinated delivery across ministries against measurable priorities', 'Every project classified against a strategic pillar and a beneficiary ministry, visible as data'],
        ['Smart Zimbabwe 2030', 'Digitally enabled public institutions and services', 'A working government platform with role-based access, governed workflows and a full audit trail'],
        ['Digitalisation of government systems', 'Official government identity, shared infrastructure and secure, interoperable systems', 'Access restricted to official .gov.zw identities; designed to use Government\u2019s designated domain, hosting and security services'],
        ['ZIDA\u2019s statutory mandate', 'Investment promotion, facilitation and aftercare in one agency', 'The operational console to publish opportunities, accredit investors and carry agreements to signature'],
      ]),
      p(''),
      table([2000, 2800, 4838], ['NDAP 365-day pathway', 'Focus', 'Indicative outputs'], [
        ['Days 1\u201330 (current step)', 'Assess and Align', 'Stakeholder map, priority use cases, platform scope, governance model, success measures'],
        ['Days 31\u201390', 'Build First Visible Layer', 'Investment platform, project registry, investor workflow, admin controls, approval gate. Delivered as a pilot and demonstrated; production deployment follows this assessment'],
        ['Days 91\u2013180', 'Expand Government Enablement', 'Ministry workflows, project intelligence, document vault, analytics, investor lead management'],
        ['Days 181\u2013270', 'Activate Priority Digital Services', 'Selected service portals, e-payment and e-tax concepts, tourism or diaspora modules, interoperability design'],
        ['Days 271\u2013365', 'Institutionalise and Scale', 'Training, adoption support, operating model, partnership-readiness package, scale roadmap'],
      ]),

      h1('How to Respond'),
      bullet('Please enter responses in the Response column. Short answers are welcome; supporting documents may be attached.'),
      bullet('“Not yet decided” or “Unknown” is a useful answer. Where another person or institution holds the answer, please name them.'),
      bullet('Annex A records the official domain and email position of each ministry. Annex B identifies the key contacts for the engagement.'),
      bullet('Afronovation proposes a 90-minute technical workshop with ZIDA’s ICT and security leads to review the responses together.'),

      ...sectionBlocks,

      h1('Next Steps'),
      numbered('ZIDA returns the completed questionnaire, Annex A and Annex B by the date shown on the cover page.'),
      numbered('Afronovation and ZIDA hold a 90-minute technical workshop to clarify responses.'),
      numbered('Afronovation presents costed acquisition options (Managed Service, Hybrid and Government-Operated), with implementation timeline and service levels.'),
      numbered('Government selects its preferred option and procurement proceeds under the applicable route.'),

      new Paragraph({ children: [new PageBreak()] }),
      h1('Annex A — Ministry Domain and Email Register'),
      intro('One row per ministry or institution expected to use the platform. Where a ministry has no official .gov.zw domain, please indicate “None”.'),
      annexA,

      h1('Annex B — Key Contacts'),
      annexB,
    ],
  }],
});

Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2], b); console.log('questions:', qn); });
