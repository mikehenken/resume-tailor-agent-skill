# ATS Resume Parsing & PDF Compatibility: Comprehensive Research Document

**Purpose**: Expert-level reference for the resume-tailor agent. Feeds PDF export scripts, layout rules, and validation logic.

**Sources**: TalentTuner whitepaper, Jobscan, Rejectless, Resumegeni, HireFlow, Resumly, academic citations (Zhang et al., Chadda et al.), platform vendor documentation.

**Last Updated**: March 2026

---

## 1. ATS PARSING MECHANISMS

### 1.1 Three-Step Parsing Process (Universal)

All major ATS platforms follow a common pipeline:

1. **File Ingestion** — Accept PDF, DOCX, or plain text. Some convert immediately to plain text; others preserve visual layout alongside parsed data.
2. **Field Extraction** — Identify sections (Work Experience, Education, Skills) and extract structured data: job titles, company names, dates, degrees, keywords.
3. **Indexing and Matching** — Store extracted data in searchable fields. Recruiter queries hit indexed data, not the raw document.

**Critical insight**: If extraction fails at any step, downstream parsing fails. A parser that drops "Python" from a text box makes the candidate invisible to searches for "Python AND 5 years experience."

### 1.2 OCR vs. NLP Approaches

| Approach | Mechanism | Strengths | Weaknesses |
|----------|-----------|-----------|------------|
| **OCR** | Pattern matching, regex on extracted pixels | Works on scans, low compute, fast on simple layouts | Error-prone with decorative fonts; cannot distinguish skills vs. company names; fails on multi-column |
| **NLP** | NER, context, LLMs (GPT-4, BERT) | Understands context, handles unstructured text | Higher compute; depends on clean text input |
| **Hybrid** | OCR for extraction + NLP for classification | Best accuracy across diverse layouts | Industry standard for modern ATS |

**Data extraction targets**: Name, email, phone, address; work history (title, company, dates, bullets); education (degree, school, dates); skills; certifications.

### 1.3 Platform-Specific Parsing Behavior

#### Workday (39%+ Fortune 500)

- **Engine**: Proprietary parser; improved since 2024 but stricter than Greenhouse/Lever.
- **Extracts**: Name, email, phone, work history (title + company + dates), education (degree + school + dates), skills.
- **Expectations**: Standard section headings, chronological structure, MM/YYYY or Month YYYY dates.
- **Failures**: Icons (📞, ✉️) → garbage; creative headers ("My Journey") → section skipped; headers/footers → contact info lost.
- **Tables**: Reads cells out of sequence. Avoid.
- **Columns**: Single-column safest; two columns only if native Word Layout → Columns (not text boxes).

#### Greenhouse (Tech/startup heavy)

- **Engine**: Human-first; no algorithmic auto-rejection. Every application reaches a human.
- **Extracts**: Parsed data for search; hiring managers see the actual uploaded document.
- **Tolerance**: More formatting-tolerant; scorecard evaluation, not keyword gating.
- **File limits**: Accepts up to 100 MB; parsing fails above ~2.5 MB.
- **Best format**: PDF recommended; standard headers for parsing, but less strict than Workday.

#### Oracle Taleo (Legacy, government/healthcare)

- **Engine**: Older parser; strictest formatting requirements.
- **Extracts**: Profile, Education, Experience, Skills (4-component ML scoring, 0–3 stars each).
- **Known limitation**: "Perfect" resumes score ~43% relevancy due to parsing failures (e.g., dates before employer names cause work experience loss).
- **Failures**: Smart quotes, em dashes → encoding artifacts; text boxes → ignored; multi-column → garbled; PDF → less reliable than DOCX.
- **Best format**: DOCX preferred over PDF.

#### iCIMS (10.7% market share, largest single vendor)

- **Engine**: Maintains parsed fields + original visual document.
- **Extracts**: Skills from full text, not just Skills section. Keywords in bullets are indexed.
- **Advantage**: "Built ETL pipeline in Python" indexes "Python" even without a Skills section.
- **File size**: Under 5 MB recommended.

#### Lever (Employ)

- **Engine**: Modern; ATS + CRM hybrid.
- **Tolerance**: Higher than Taleo/Workday; handles moderate design complexity.
- **Multi-column**: Engineering team notes multi-column detection as a persistent challenge; single-column recommended.

#### SmartRecruiters

- **Engine**: AI-assisted parsing; more tolerant of formatting variation.
- **Scoring**: SmartAssistant AI provides advisory relevance score; recruiters make final decision.
- **Skills**: Extracted from both dedicated sections and contextual mentions.

### 1.4 Headings: Recognized vs. Ignored

**Recognized (use these)**:
- Work Experience / Professional Experience / Experience
- Education
- Skills / Technical Skills / Soft Skills (when split)
- Certifications
- Summary / Professional Summary / Profile / About Me
- Awards / Honors and Awards
- Volunteer Experience
- Contact Information

**Avoid (cause misclassification or section skip)**:
- "My Journey," "My Story," "Bucket of Cool Projects"
- "Where I've Made Impact"
- Creative or non-standard section names

**Rule**: Non-standard headers reduce parsing accuracy by 23–45% (TalentTuner).

### 1.5 Parsing Accuracy by Layout (Cited Percentages)

| Layout Type | Parsing Accuracy | Source |
|-------------|------------------|--------|
| Single-column | **95%** | TalentTuner, Zhang et al. |
| Multi-column | **42%** | TalentTuner, Zhang et al. |
| Table-based layout | **38%** | TalentTuner |
| Text-based PDF | 90–95% | Resumly, JobMentis |
| Image-based PDF | 70–85% or lower | JobMentis |
| Design tool exports (Canva, Figma) | <5% success | JobMentis |
| DOCX with tables | 69% | JobMentis |
| Plain text DOCX | 96–100% | JobMentis |
| PDF with embedded fonts | **18%** | JobMentis |

### 1.6 Known Parsing Failures and Edge Cases

- **Two-column layouts**: 43% higher rate of critical parsing errors vs. single-column (Jobscan, 1M+ submissions).
- **Job title/company extraction**: 21% of two-column resumes had at least one work experience entry incorrectly extracted.
- **Skills sidebar**: 67% of skills sidebar content merged with adjacent sections or dropped (Taleo, older iCIMS).
- **Contact info in headers/footers**: 25% loss across major platforms.
- **Date formatting**: #1 cause of parsing failure; Workday expects MM/YYYY; Taleo handles full month names; inconsistent formats break at least one system.
- **Icons/emojis**: Rendered as unreadable symbols; use "Phone:" and "Email:" text labels.
- **Tables**: Cells read in unpredictable order; content interleaved.
- **Text boxes**: Content frequently ignored entirely.

### 1.7 Table and Text-Box Handling

- **Tables**: Parsers read table cells sequentially (left→right, row by row). Skills in left column + experience in right column → interleaved as "Python, JavaScript, React Senior Engineer at Google, 2020–2023."
- **Text boxes**: Most parsers skip content in text boxes; Taleo ignores them entirely.
- **Floating elements**: Same as text boxes; not in main content stream.
- **DOCX columns (Layout → Columns)**: Create different XML structure; parser sees one continuous stream with no reliable column-boundary signal.

---

## 2. PDF TECHNICAL REQUIREMENTS

### 2.1 Text-Based vs. Image-Based PDFs

| Type | Creation | ATS Parse Rate | Use Case |
|------|----------|----------------|----------|
| **Text-based** | Word, Google Docs, clean HTML→PDF | 90–95% | Submit |
| **Image-based** | Scanned docs, Canva/Figma exports | 70–85% or lower | Avoid |
| **Design tool exports** | Canva, InDesign, Figma | <5% success | Never submit |

**Rule**: Always use text-based PDFs. Image-based PDFs require OCR and introduce extraction errors.

### 2.2 Font Embedding and Character Encoding

- **Embedded non-standard fonts**: Encoding mismatches → names, contact info appear as symbols or gibberish. PDFs with embedded fonts: **18% success rate**.
- **Standard fonts (no embedding issues)**: Arial, Calibri, Times New Roman, Helvetica, Georgia. Universally supported; render identically.
- **Character encoding**: Custom glyphs, variable fonts, non-standard Unicode → 37% of "design-forward" resumes had critical parsing errors (HireVue 2023).
- **Ligatures**: Chrome/Chromium encode "fi," "fl" incorrectly; "office" can extract as "oce✕." Use `font-feature-settings: "liga" 0` or avoid ligature-heavy fonts when using Chromium for PDF generation.

### 2.3 Chromium/Skia vs. Other PDF Generators

- **Chromium/Skia**: Uses Skia PDF backend (SkPDF). Ligature encoding incompatibility causes OCR/text extraction to fail. Words like "office," "efficient," "profile" can lose letters.
- **Firefox**: Properly encodes ligatures; recommended for browser-based PDF export when ATS compatibility matters.
- **Puppeteer/Playwright**: Chromium-based; inherit ligature issues. Consider `font-feature-settings: "liga" 0` in CSS or use Firefox for PDF generation.
- **Word/Google Docs native export**: Produces clean, parseable PDFs; preferred over Print to PDF from browsers.

### 2.4 PDF/A Compliance

- **PDF/A**: Archival format; some regions/portals require it.
- **Use when**: Portal rejects standard PDF; compliance mandates.
- **Note**: Standard PDF 1.4+ is sufficient for most ATS; PDF/A adds compatibility for edge cases.

### 2.5 File Size and Page Limits

| Limit | Value | Source |
|-------|-------|--------|
| Glassdoor, Indeed | 2 MB max | Resumly, PDF Merger Splitter |
| LinkedIn | 5 MB max; <2 MB recommended | Resumly |
| Greenhouse | Parsing fails >~2.5 MB | Resumegeni |
| iCIMS | <5 MB recommended | Resumegeni |
| Best practice | <200 KB | Resumly, HireFlow |

**Oversized files**: Silent upload/parse failures; recruiters may never receive the application.

### 2.6 Why Certain PDFs Fail Parsing

1. **Image-based**: No extractable text layer.
2. **Embedded fonts**: Encoding mismatches.
3. **Ligatures (Chromium)**: Characters lost or corrupted.
4. **Tables/columns/text boxes**: Wrong extraction order.
5. **Headers/footers**: Contact info skipped.
6. **Design tool exports**: Embedded styling, complex layouts.
7. **Password-protected**: Some ATS cannot parse.
8. **PDF form fields**: Entered text may not be recognized.
9. **Non-standard PDF versions**: Use PDF 1.4+ or PDF/A.

### 2.7 Copy-Paste Test Methodology

**Principle**: If text doesn't copy cleanly into plain text, the ATS likely won't parse it cleanly.

**Procedure**:
1. Open PDF in a standard reader (Adobe Reader, not design software).
2. Select all (Ctrl+A / Cmd+A).
3. Copy.
4. Paste into Notepad or plain text editor.

**"Clean copy" means**:
- All text appears in correct reading order (contact → summary → experience → education → skills).
- No scrambled lines, merged sections, or missing content.
- Bullets render as hyphens/asterisks, not symbols.
- Dates, names, and URLs intact.

**If copy-paste fails**: Revise layout (remove tables, columns, text boxes); retest.

---

## 3. LAYOUT RULES

### 3.1 Single-Column Requirement

- **Mandatory** for Taleo, older iCIMS, strict Workday configurations.
- **Recommended** for all ATS; 95% vs. 42% parsing accuracy.
- **Exception**: Greenhouse/Lever handle two-column when created with native Word columns—but tables, text boxes, floating frames still break parsing. Single-column remains safest.

### 3.2 Margin Recommendations

- **0.5"–1"** (0.75"–1" typical).
- Avoid extreme margins that cause awkward wrapping or truncation.

### 3.3 Font Choices

| Font | ATS Support | Notes |
|------|-------------|-------|
| Arial | Universal | Safe, neutral |
| Calibri | Universal | Default in Word; clean |
| Times New Roman | Universal | Traditional, readable |
| Helvetica | Universal | Clean, professional |
| Georgia | Universal | Serif alternative |
| Garamond | Often cited | Use with caution; verify parsing |
| Decorative/custom | Avoid | Encoding failures |

**Size**: Body 10–12 pt; headings 14–16 pt.

### 3.4 Heading Hierarchy

- Use consistent heading levels.
- Headings on own lines; no special characters or graphics.
- Standard names only (see §1.4).

### 3.5 Section Order

Recommended order:
1. Contact information (in body, not header/footer)
2. Summary / Professional Summary
3. Work Experience / Experience
4. Education
5. Skills
6. Certifications (if applicable)
7. Awards / Volunteer (if applicable)

**Reverse-chronological** within each section.

### 3.6 Contact Info Placement

- **Place**: Main document body, top of first page.
- **Avoid**: Headers, footers—25% contact info loss when placed there.
- **Format**: Plain text labels ("Phone:", "Email:")—no icons.

### 3.7 Header/Footer Handling

- **Do not** put name, phone, email, or LinkedIn in headers/footers.
- Parsers frequently skip header/footer content.
- Taleo ignores them entirely.

### 3.8 Why Tables, Columns, Text Boxes Cause Problems

- **Tables**: XML/cell order ≠ visual order; interleaved extraction.
- **Columns**: Parser reads content stream order, not spatial layout; column boundary detection fails.
- **Text boxes**: Often outside main content stream; skipped.
- **Physics**: Text extraction is linear; multi-column/table layouts create non-linear reading order.

---

## 4. VALIDATION CHECKLISTS

### 4.1 Pre-Submission Checks

- [ ] Single-column layout
- [ ] Standard section headers (Work Experience, Education, Skills, etc.)
- [ ] Contact info in body, not header/footer
- [ ] No tables, text boxes, or columns for layout
- [ ] No images, icons, or graphics
- [ ] Standard fonts (Arial, Calibri, Times New Roman)
- [ ] Consistent date format (MM/YYYY or Month YYYY)
- [ ] File size <2 MB (ideally <200 KB)
- [ ] Copy-paste test passes
- [ ] PDF is text-based (not scanned/image)

### 4.2 Tools for Testing ATS Compatibility

| Tool | Function |
|------|----------|
| Jobscan | Resume vs. job description match; formatting checks; ATS detection |
| TalentTuner | Multi-component scoring; platform-specific analysis |
| Resumegeni Analyzer | Formatting, keywords, parsing across platforms |
| PassTheScan | ATS technology report; format validation |
| Manual copy-paste | Free; validates extraction order |

### 4.3 Common Mistakes That Cause Rejection

1. Multi-column or table-based layout
2. Contact info in headers/footers
3. Icons instead of text labels
4. Creative/non-standard section names
5. Inconsistent date formats
6. Image-based or design-tool PDFs
7. Embedded non-standard fonts
8. File size >2 MB
9. Password-protected PDF
10. Hyperlinks as sole representation of URLs (use plain text)

### 4.4 Industry Benchmarks for Parse Success Rates

| Metric | Value | Source |
|--------|-------|--------|
| Resumes filtered before human review | 75% | Greenhouse, TalentTuner |
| Average resume score vs. job description | 57.6% | TalentTuner (n=944) |
| Threshold to pass screening | 70%+ | TalentTuner |
| Excellent (85%+) | 1.9% of resumes | TalentTuner |
| Optimized vs. unoptimized parse success | 78% vs. 64% | Resufit 2025 |
| Fortune 500 ATS usage | 97.8%+ | Jobscan 2025 |

---

## 5. ACTIONABLE RULES FOR RESUME GENERATION

### 5.1 PDF Export Script Rules (Numbered)

1. **Layout**: Single-column only. No CSS columns, no tables for layout, no flex/grid that produces multi-column visual output.
2. **Fonts**: Use only Arial, Calibri, Times New Roman, Helvetica, or Georgia. No custom or decorative fonts.
3. **Font features**: Disable ligatures when using Chromium/Skia (`font-feature-settings: "liga" 0`) to prevent "fi"/"fl" extraction errors.
4. **Contact info**: Place in main body, top of first page. Never in `header` or `footer` elements.
5. **Section headers**: Use exact strings—"Work Experience," "Education," "Skills," "Certifications." No creative alternatives.
6. **Dates**: Consistent format throughout; prefer MM/YYYY or "Month YYYY."
7. **No images**: No logos, icons, charts, or graphics. Use plain text only.
8. **No tables**: Use `ul`/`ol` and `p` for structure, not `table`.
9. **No text boxes**: No absolutely positioned divs or floating elements for critical content.
10. **File size**: Target <200 KB; hard cap 2 MB.
11. **PDF generator**: Prefer Word/Google Docs export, or Firefox over Chromium for browser-based export. If Chromium: disable ligatures.
12. **Save as**: "PDF (Standard)" not "PDF (Optimized for Print)."
13. **Copy-paste test**: Run post-export; verify order and completeness.

### 5.2 HTML/CSS Constraints (When Generating from HTML)

**Allowed**:
- `h1`, `h2`, `h3` for headings
- `p`, `ul`, `li`, `ol` for content
- `strong`, `em` for emphasis
- `a` for URLs (but also include plain text URL)
- Single-column flex or block layout
- `@media print` for print-specific styling

**Disallowed**:
- `table` for layout
- `columns` or `column-count` in CSS
- `position: absolute` or `fixed` for main content
- `float` for multi-column layout
- `header`, `footer` for contact info
- `img`, `svg` for icons or graphics
- Custom `@font-face` (use system fonts only)
- `font-feature-settings` with ligatures enabled (when using Chromium)

**Page setup**:
```css
@page { size: letter; margin: 0.75in; }
@media print {
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; }
  h2 { font-size: 14pt; }
}
```

### 5.3 Section Order (Enforcement)

Enforce this order in the DOM and visual output:
1. Contact (name, email, phone, URL)
2. Summary
3. Work Experience
4. Education
5. Skills
6. Certifications
7. Awards / Volunteer (optional)

### 5.4 Date Format Enforcement

- Accept: `YYYY-MM`, `MM/YYYY`, `Month YYYY`
- Normalize to one format before render
- Never mix formats within the document

### 5.5 URL Handling

- Include LinkedIn and portfolio URLs as plain text
- Format: `linkedin.com/in/username` or full URL
- Hyperlinks optional but must not be sole representation

---

## APPENDIX A: ATS URL Patterns (Identification)

| Pattern | ATS |
|---------|-----|
| `*.wd5.myworkdayjobs.com` | Workday |
| `boards.greenhouse.io/*` | Greenhouse |
| `*.icims.com` | iCIMS |
| `*.taleo.net` | Taleo |
| `jobs.lever.co/*` | Lever |
| `jobs.smartrecruiters.com/*` | SmartRecruiters |

---

## APPENDIX B: Platform Comparison Matrix

| Feature | Workday | Greenhouse | iCIMS | Taleo | Lever |
|---------|---------|------------|-------|-------|-------|
| Best format | PDF/DOCX | PDF | PDF/DOCX | DOCX | PDF/DOCX |
| Two-column | Limited | Good | Fair | None | Good |
| Table support | Poor | Fair | Fair | None | Fair |
| Header/footer | Unreliable | Fair | Fair | None | Fair |
| Formatting strictness | High | Low | Medium | Very High | Low |
| Human review | Medium | Very High | Medium | Low | High |

---

## APPENDIX C: References

- TalentTuner. "Decoding the ATS Black Box." 2026.
- Zhang, Y. et al. "Machine Learning Approaches to Resume Screening." Stanford AI Lab, 2023.
- Chadda, A. et al. "Semantic Resume Parsing with LSTM." IEEE Access, 2018.
- Jobscan. "Fortune 500 ATS Usage Report." 2024–2025.
- Resumegeni. "Pass Every ATS: Workday, iCIMS & Greenhouse Rules." 2026.
- Rejectless. "Why Single-Column Resumes Outperform Two-Column for ATS." 2024.
- HireFlow. "PDF Resume Issues That Cause Automatic Rejection."
- Resumly. "Formatting Resume PDFs: Best Practices to Avoid ATS Errors."
- Greenhouse. Interview with Jon Stross, BriefCase Coach, 2024.

---

*Document generated for resume-tailor agent. Apply these rules in PDF export, layout generation, and validation pipelines.*
