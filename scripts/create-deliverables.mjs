import fs from "node:fs";
import path from "node:path";
import {
  BorderStyle,
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import pptxgen from "pptxgenjs";

const outputDir = path.resolve("public/downloads");
fs.mkdirSync(outputDir, { recursive: true });

const colors = {
  navy: "17324D",
  blue: "2563A6",
  cyan: "DFF4F5",
  paleBlue: "EFF6FF",
  green: "147D64",
  paleGreen: "E7F6EF",
  amber: "A76700",
  paleAmber: "FFF4D6",
  red: "B43A3A",
  paleRed: "FDECEC",
  slate: "526579",
  line: "CBD8E5",
  white: "FFFFFF",
};

const cell = (text, options = {}) =>
  new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text, bold: options.bold, color: options.color || colors.navy, size: options.size || 18 })],
      }),
    ],
  });

const table = (headers, rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 5, color: colors.line }, bottom: { style: BorderStyle.SINGLE, size: 5, color: colors.line }, left: { style: BorderStyle.SINGLE, size: 5, color: colors.line }, right: { style: BorderStyle.SINGLE, size: 5, color: colors.line }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: colors.line }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: colors.line } },
    rows: [
      new TableRow({ children: headers.map((header) => cell(header, { bold: true, fill: colors.navy, color: colors.white })) }),
      ...rows.map((row) => new TableRow({ children: row.map((value) => cell(value)) })),
    ],
  });

const heading = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({ heading: level, spacing: { before: 80, after: 100 }, children: [new TextRun({ text, color: colors.navy, bold: true })] });

const bullet = (text, color = colors.slate) =>
  new Paragraph({ bullet: { level: 0 }, spacing: { after: 55 }, children: [new TextRun({ text, color, size: 18 })] });

const body = (text) => new Paragraph({ spacing: { after: 75 }, children: [new TextRun({ text, color: colors.slate, size: 18 })] });

const statusTag = (label, fill, color) =>
  new Paragraph({ spacing: { after: 55 }, shading: { fill, type: ShadingType.CLEAR }, children: [new TextRun({ text: `  ${label}  `, bold: true, color, size: 17 })] });

const doc = new Document({
  sections: [{
    properties: { page: { margin: { top: 620, bottom: 620, left: 720, right: 720 } } },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "SUPPLIER VALIDATION FRAMEWORK", bold: true, color: colors.blue, size: 24 })] }),
      new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: "Assignment proposal | Registration, collection and validation experience", bold: true, color: colors.navy, size: 30 })] }),
      new Paragraph({ spacing: { after: 130 }, children: [new TextRun({ text: "A simple operating model for onboarding suppliers with configurable forms, conditional documents and explainable validation results.", color: colors.slate, size: 19 })] }),

      heading("1. Supplier registration flow"),
      table(["Step", "Admin / supplier action", "System behavior"], [
        ["1. Configure", "Admin creates a registration and selects category, dates, fields and documents.", "Creates a versioned registration policy and registration link."],
        ["2. Start", "Supplier opens the link or uses an invitation.", "Checks access mode, date window and invitation token."],
        ["3. Register", "Supplier enters company details and saves progress.", "Validates required fields inline and keeps a draft."],
        ["4. Submit", "Supplier uploads documents and submits the application.", "Locks the submission snapshot and starts validation."],
      ]),
      new Paragraph({ spacing: { before: 100, after: 45 }, children: [new TextRun({ text: "Registration modes", bold: true, color: colors.navy, size: 19 })] }),
      bullet("Open: anyone with the active link can start. Useful for broad supplier discovery."),
      bullet("Closed: only invited suppliers can start. The invitation token identifies the intended supplier."),
      bullet("Hybrid: anyone can express interest, but an admin approval gate is required before full onboarding."),

      heading("2. Supplier form"),
      body("The admin chooses a reusable field set for each registration. Fields are grouped into sections and can be marked required, optional, or conditionally required by category, country or purchase value."),
      table(["Section", "Example fields", "Configuration"], [
        ["Company", "Legal name, trade name, address, country, size, turnover", "Required / optional; country-specific variants"],
        ["Contacts", "Primary contact, email, phone, finance contact", "Email and phone format validation"],
        ["Business", "Supplier category, products/services, operating regions", "Category drives document rules"],
        ["Banking", "Account name, bank, account number, IFSC / SWIFT", "Sensitive field access and masking"],
        ["Tax & registration", "GST, PAN, registration number, incorporation date", "Format checks and external verification adapter"],
      ]),

      heading("3. Documents"),
      body("Document requirements are configured as a policy, not hard-coded into the supplier screen. Each requirement has a document type, accepted formats, maximum size, expiry behavior and conditional trigger."),
      table(["Document", "When required", "Checks"], [
        ["GST certificate / PAN", "India-based suppliers or tax-enabled registration", "Format, extraction, name and status"],
        ["Company registration", "All legal entities", "Registration number, legal name, validity"],
        ["Bank document", "All suppliers receiving payment", "Account name, bank details, match to company"],
        ["Insurance / safety certificate", "Construction or high-risk categories", "Expiry, coverage and category fit"],
        ["ISO / certifications", "IT or regulated categories", "Certificate scope, issuer and expiry"],
        ["Financial documents", "Purchase value above threshold or risk tier", "Period, completeness and review flag"],
      ]),

      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "SUPPLIER VALIDATION FRAMEWORK", bold: true, color: colors.blue, size: 24 })] }),
      new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: "Validation process and decision model", bold: true, color: colors.navy, size: 30 })] }),

      heading("4. Validation process"),
      table(["Stage", "What happens", "Output"], [
        ["Submitted data", "Freeze the supplier's submitted values and document set.", "Auditable submission snapshot"],
        ["Document extraction", "Read text, dates, identifiers and document type from each file.", "Structured evidence with confidence"],
        ["Basic validation", "Check required fields, formats, duplicate records and file integrity.", "Pass / fail checks"],
        ["Data matching", "Compare names, identifiers, bank account and address across sources.", "Match score and mismatch reasons"],
        ["External verification", "Call an authoritative provider through an adapter when available.", "Existence, active status and name match"],
        ["Decision", "Apply rules, calculate score and route exceptions to a reviewer.", "Approved, Review Required or Rejected"],
      ]),
      new Paragraph({ spacing: { before: 90, after: 50 }, children: [new TextRun({ text: "External verification design", bold: true, color: colors.navy, size: 19 })] }),
      body("Keep external checks behind a provider adapter. Store request time, provider, response status, normalized result and evidence reference. If a provider is unavailable, do not silently pass the check; mark it as Pending or Review Required."),

      heading("5. Sample validation rules"),
      table(["Rule", "Condition", "Action"], [
        ["R1", "GST number has invalid format or checksum", "Fail basic validation"],
        ["R2", "Required field is blank or document is missing", "Block submission or mark incomplete"],
        ["R3", "Supplier category = IT", "Require ISO 27001 certificate"],
        ["R4", "Expected purchase value > INR 50 lakh", "Require financial statements and bank letter"],
        ["R5", "Any required document is expired", "Do not auto-approve; route to review"],
        ["R6", "GST, bank and registration names differ materially", "Create mismatch exception"],
        ["R7", "External GST status is inactive or not found", "Reject or require compliance review"],
        ["R8", "Duplicate tax ID or bank account exists", "Block approval and alert admin"],
        ["R9", "Document extraction confidence < 85%", "Request re-upload or manual review"],
      ]),

      heading("6. Final supplier result"),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [
        cell("ABC Technologies Pvt Ltd\nValidation score: 92 / 100", { fill: colors.paleGreen, bold: true, size: 21, width: 48 }),
        cell("APPROVED\nAll critical checks passed", { fill: colors.green, color: colors.white, bold: true, size: 21, width: 52 }),
      ] })] }),
      new Paragraph({ spacing: { before: 100, after: 35 }, children: [new TextRun({ text: "Score model", bold: true, color: colors.navy, size: 19 })] }),
      bullet("Basic data: 25 points | Documents: 25 points | Matching: 25 points | External verification: 25 points."),
      bullet("Critical failures override the numeric score. An expired mandatory document cannot produce an automatic approval."),
      statusTag("PASSED  GST format and status | PAN verified | Bank name matched | Required documents present", colors.paleGreen, colors.green),
      statusTag("REVIEW  Insurance expires in 30 days", colors.paleAmber, colors.amber),
      statusTag("FAILED  None", colors.paleGreen, colors.green),
      new Paragraph({ spacing: { before: 75 }, children: [new TextRun({ text: "Recommended status mapping: 85-100 = Approved when no critical exceptions; 60-84 = Review Required; below 60 or a critical failure = Rejected.", color: colors.slate, italics: true, size: 17 })] }),
    ],
  }],
});

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Supplier Validation Framework";
pptx.subject = "Optional wireframes for supplier onboarding and validation";
pptx.title = "Supplier Validation Framework Wireframes";
pptx.company = "Supplier Validation";
pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos", lang: "en-US" };

function addHeader(slide, eyebrow, title, subtitle = "") {
  slide.background = { color: "F6F9FC" };
  slide.addText(eyebrow.toUpperCase(), { x: 0.55, y: 0.35, w: 11.9, h: 0.25, fontSize: 9, bold: true, color: colors.blue, charSpacing: 1.4, margin: 0 });
  slide.addText(title, { x: 0.55, y: 0.68, w: 11.4, h: 0.48, fontSize: 24, bold: true, color: colors.navy, margin: 0 });
  if (subtitle) slide.addText(subtitle, { x: 0.55, y: 1.22, w: 11.4, h: 0.3, fontSize: 10, color: colors.slate, margin: 0 });
  slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 1.68, w: 11.9, h: 0, line: { color: colors.line, width: 1 } });
}
function box(slide, x, y, w, h, title, lines = [], fill = colors.white, accent = colors.blue) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: colors.line, width: 1 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.08, h, fill: { color: accent }, line: { color: accent } });
  slide.addText(title, { x: x + 0.2, y: y + 0.16, w: w - 0.35, h: 0.25, fontSize: 12, bold: true, color: colors.navy, margin: 0 });
  if (lines.length) slide.addText(lines.map((line) => ({ text: line, options: { bullet: { indent: 12 }, hanging: 3 } })), { x: x + 0.2, y: y + 0.52, w: w - 0.35, h: h - 0.65, fontSize: 9.5, color: colors.slate, breakLine: true, margin: 0.02, valign: "top", paraSpaceAfterPt: 6 });
}
function footer(slide, number) {
  slide.addText(`SUPPLIER VALIDATION  /  WIREFRAMES  /  ${number}`, { x: 0.55, y: 7.08, w: 11.8, h: 0.18, fontSize: 7, color: "7890A5", margin: 0, charSpacing: 1 });
}

{
  const slide = pptx.addSlide();
  addHeader(slide, "Wireframe 01", "Admin creates a supplier registration", "Choose an access mode, define the window and configure the policy that drives the supplier experience.");
  box(slide, 0.7, 2.05, 2.3, 3.95, "Registration setup", ["Registration name", "Supplier category", "Start date", "End date", "Registration mode"], colors.white, colors.blue);
  box(slide, 3.25, 2.05, 3.05, 3.95, "Access mode", ["Open - active link", "Closed - invitation only", "Hybrid - admin approval"], colors.paleBlue, colors.cyan);
  box(slide, 6.55, 2.05, 2.55, 3.95, "Form builder", ["Company information", "Contacts", "Business profile", "Banking", "Tax details"], colors.white, colors.blue);
  box(slide, 9.35, 2.05, 2.55, 3.95, "Document policy", ["Document type", "Required / optional", "Category trigger", "Expiry handling", "Accepted formats"], colors.white, colors.green);
  slide.addText("CREATE REGISTRATION", { x: 9.4, y: 6.25, w: 2.45, h: 0.36, align: "center", fontSize: 10, bold: true, color: colors.white, fill: { color: colors.blue }, margin: 0.1, radius: 0.06 });
  footer(slide, "01");
}

{
  const slide = pptx.addSlide();
  addHeader(slide, "Wireframe 02", "Supplier registration and document upload", "A guided stepper keeps the supplier focused while the system validates each section before submission.");
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 2.02, w: 11.45, h: 4.65, rectRadius: 0.06, fill: { color: colors.white }, line: { color: colors.line, width: 1 } });
  const steps = ["Company", "Contacts", "Business", "Bank & tax", "Documents"];
  steps.forEach((step, i) => {
    slide.addShape(pptx.ShapeType.ellipse, { x: 1.1 + i * 1.9, y: 2.35, w: 0.35, h: 0.35, fill: { color: i < 2 ? colors.green : i === 2 ? colors.blue : "D8E2EC" }, line: { color: "FFFFFF", width: 1 } });
    slide.addText(step, { x: 0.78 + i * 1.9, y: 2.8, w: 1.05, h: 0.2, fontSize: 8, align: "center", color: colors.slate, margin: 0 });
    if (i < 4) slide.addShape(pptx.ShapeType.line, { x: 1.45 + i * 1.9, y: 2.52, w: 1.55, h: 0, line: { color: i < 2 ? colors.green : colors.line, width: 1.5 } });
  });
  box(slide, 1.1, 3.35, 4.8, 2.55, "Company information", ["Legal company name  *", "Country  *", "Address  *", "Supplier category  *"], colors.paleBlue, colors.blue);
  box(slide, 6.25, 3.35, 4.9, 2.55, "Upload documents", ["GST certificate       Uploaded", "PAN                    Uploaded", "Bank letter             Required", "ISO 27001              Required for IT"], colors.paleGreen, colors.green);
  slide.addText("SAVE DRAFT", { x: 8.55, y: 6.18, w: 1.15, h: 0.32, align: "center", fontSize: 9, bold: true, color: colors.blue, line: { color: colors.blue, width: 1 }, margin: 0.08 });
  slide.addText("SUBMIT APPLICATION", { x: 9.85, y: 6.18, w: 1.35, h: 0.32, align: "center", fontSize: 9, bold: true, color: colors.white, fill: { color: colors.blue }, margin: 0.08 });
  footer(slide, "02");
}

{
  const slide = pptx.addSlide();
  addHeader(slide, "Wireframe 03", "Admin validation result", "Explainable checks help an operations user decide quickly and understand exactly what needs attention.");
  slide.addText("ABC Technologies Pvt Ltd", { x: 0.8, y: 2.03, w: 5, h: 0.3, fontSize: 17, bold: true, color: colors.navy, margin: 0 });
  slide.addText("IT supplier  /  Submitted 08 Oct 2026", { x: 0.8, y: 2.42, w: 5, h: 0.2, fontSize: 9, color: colors.slate, margin: 0 });
  slide.addShape(pptx.ShapeType.roundRect, { x: 9.5, y: 1.95, w: 2.35, h: 1.05, rectRadius: 0.05, fill: { color: colors.paleGreen }, line: { color: colors.green, width: 1 } });
  slide.addText("92 / 100", { x: 9.65, y: 2.12, w: 2.05, h: 0.3, fontSize: 22, bold: true, align: "center", color: colors.green, margin: 0 });
  slide.addText("APPROVED", { x: 9.65, y: 2.48, w: 2.05, h: 0.18, fontSize: 9, bold: true, align: "center", color: colors.green, margin: 0 });
  box(slide, 0.8, 3.0, 3.55, 2.65, "Company information", ["GST number        Passed", "PAN                Verified", "Email              Passed", "Required fields     Passed"], colors.white, colors.green);
  box(slide, 4.55, 3.0, 3.55, 2.65, "Documents", ["GST certificate    Passed", "Bank document      Passed", "ISO 27001          Passed", "Insurance          Expires in 30 days"], colors.paleAmber, colors.amber);
  box(slide, 8.3, 3.0, 3.55, 2.65, "Data matching", ["Company name       Match", "Bank account       Match", "Address            Match", "External GST       Active"], colors.white, colors.green);
  slide.addText("REVIEW ITEM", { x: 9.65, y: 6.03, w: 1.05, h: 0.3, align: "center", fontSize: 8, bold: true, color: colors.amber, fill: { color: colors.paleAmber }, margin: 0.08 });
  slide.addText("VIEW EVIDENCE", { x: 10.85, y: 6.03, w: 1.0, h: 0.3, align: "center", fontSize: 8, bold: true, color: colors.blue, line: { color: colors.blue, width: 1 }, margin: 0.08 });
  footer(slide, "03");
}

{
  const slide = pptx.addSlide();
  addHeader(slide, "Wireframe 04", "Validation workflow and exception handling", "The decision engine combines deterministic checks, evidence and human review without hiding uncertainty.");
  const stages = [
    ["Submitted", "Freeze fields + files", colors.blue],
    ["Extracted", "Text, dates, IDs", colors.cyan],
    ["Validated", "Format + completeness", colors.paleBlue],
    ["Verified", "Provider + matching", colors.paleGreen],
    ["Decided", "Score + status", colors.paleAmber],
  ];
  stages.forEach(([title, detail, fill], i) => {
    const x = 0.75 + i * 2.35;
    slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.3, w: 1.75, h: 1.25, rectRadius: 0.05, fill: { color: fill }, line: { color: colors.line, width: 1 } });
    slide.addText(title, { x: x + 0.1, y: 2.62, w: 1.55, h: 0.25, fontSize: 12, bold: true, align: "center", color: colors.navy, margin: 0 });
    slide.addText(detail, { x: x + 0.1, y: 2.98, w: 1.55, h: 0.28, fontSize: 8, align: "center", color: colors.slate, margin: 0 });
    if (i < 4) slide.addText("→", { x: x + 1.83, y: 2.67, w: 0.42, h: 0.25, fontSize: 18, bold: true, color: colors.blue, margin: 0, align: "center" });
  });
  box(slide, 1.05, 4.25, 3.25, 1.6, "Evidence panel", ["Source document", "Extracted value", "Confidence", "Timestamp"], colors.white, colors.blue);
  box(slide, 4.55, 4.25, 3.25, 1.6, "Exception queue", ["Mismatch reason", "Owner", "Due date", "Request re-upload"], colors.paleAmber, colors.amber);
  box(slide, 8.05, 4.25, 3.25, 1.6, "Audit trail", ["Rule evaluated", "Provider response", "Reviewer action", "Final decision"], colors.white, colors.green);
  footer(slide, "04");
}

await Packer.toBuffer(doc).then((buffer) => fs.writeFileSync(path.join(outputDir, "supplier-validation-framework.docx"), buffer));
await pptx.writeFile({ fileName: path.join(outputDir, "supplier-validation-wireframes.pptx") });
console.log(`Created files in ${outputDir}`);
