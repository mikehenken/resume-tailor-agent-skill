/**
 * ATS PDF export without a browser (pdfkit). Works in Cowork VM, cloud, sandboxes.
 */

import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import PDFDocument from 'pdfkit';

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} resume
 * @returns {string}
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {PDFDocument} doc
 * @param {string} title
 */
function sectionHeading(doc, title) {
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text(title);
  doc.moveDown(0.2);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#cccccc')
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.35);
}

/**
 * @param {Record<string, unknown>} resume
 * @param {string} outputPath
 */
export async function exportAtsPdfWithPdfkit(resume, outputPath) {
  const basics = isObject(resume.basics) ? resume.basics : {};
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 54, bottom: 54, left: 54, right: 54 },
    bufferPages: true,
  });
  const stream = createWriteStream(outputPath);
  doc.pipe(stream);

  const name = text(basics.name) || 'Resume';
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(name);
  if (text(basics.label)) {
    doc.font('Helvetica').fontSize(11).fillColor('#333333').text(text(basics.label));
  }

  const contactParts = [];
  const loc = isObject(basics.location) ? basics.location : null;
  if (loc) {
    const cityRegion = [text(loc.city), text(loc.region)].filter(Boolean).join(', ');
    if (cityRegion) contactParts.push(cityRegion);
  }
  if (text(basics.email)) contactParts.push(text(basics.email));
  if (text(basics.phone)) contactParts.push(text(basics.phone));
  if (text(basics.url)) contactParts.push(text(basics.url));
  const profiles = Array.isArray(basics.profiles) ? basics.profiles : [];
  for (const p of profiles) {
    if (isObject(p) && text(p.url)) {
      contactParts.push(text(p.url));
    }
  }
  if (contactParts.length > 0) {
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(9).fillColor('#444444').text(contactParts.join(' · '));
  }

  if (text(basics.summary)) {
    sectionHeading(doc, 'Summary');
    doc.font('Helvetica').fontSize(10).fillColor('#000000').text(text(basics.summary), {
      align: 'left',
    });
  }

  const work = Array.isArray(resume.work) ? resume.work : [];
  if (work.length > 0) {
    sectionHeading(doc, 'Experience');
    for (const item of work) {
      if (!isObject(item)) continue;
      const position = text(item.position) || 'Role';
      const company = text(item.name);
      const dates = [text(item.startDate), text(item.endDate) || 'Present']
        .filter(Boolean)
        .join(' – ');
      doc.font('Helvetica-Bold').fontSize(10).text(position);
      const meta = [company, text(item.location), dates].filter(Boolean).join(' · ');
      if (meta) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#444444').text(meta);
      }
      doc.fillColor('#000000');
      const highlights = Array.isArray(item.highlights) ? item.highlights : [];
      for (const h of highlights) {
        if (text(h)) {
          doc.font('Helvetica').fontSize(10).text(`• ${text(h)}`, { indent: 12 });
        }
      }
      doc.moveDown(0.35);
    }
  }

  const education = Array.isArray(resume.education) ? resume.education : [];
  if (education.length > 0) {
    sectionHeading(doc, 'Education');
    for (const ed of education) {
      if (!isObject(ed)) continue;
      const line = [text(ed.studyType), text(ed.area)].filter(Boolean).join(', ');
      const school = text(ed.institution);
      doc.font('Helvetica-Bold').fontSize(10).text(line || school || 'Education');
      const meta = [school && line ? school : '', text(ed.startDate), text(ed.endDate)]
        .filter(Boolean)
        .join(' · ');
      if (meta) {
        doc.font('Helvetica').fontSize(9).fillColor('#444444').text(meta);
      }
      doc.fillColor('#000000').moveDown(0.25);
    }
  }

  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  if (skills.length > 0) {
    sectionHeading(doc, 'Relevant Skills');
    for (const sk of skills) {
      if (!isObject(sk)) continue;
      const name = text(sk.name);
      const keywords = Array.isArray(sk.keywords)
        ? sk.keywords.map((k) => text(k)).filter(Boolean)
        : [];
      if (name && keywords.length > 0) {
        doc.font('Helvetica-Bold').fontSize(10).text(`${name}: `, { continued: true });
        doc.font('Helvetica').text(keywords.join(', '));
      } else if (name) {
        doc.font('Helvetica').fontSize(10).text(`• ${name}`);
      }
    }
  }

  doc.end();
  await finished(stream);
}
