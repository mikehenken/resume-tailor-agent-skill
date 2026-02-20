/**
 * Injected into the PDF HTML shell by export-pdf.mjs.
 * Expects window.__RESUME__ (JSON Resume) and window.__RESUME_DESIGN__ (canonical design id).
 */
(function () {
  const design = typeof window.__RESUME_DESIGN__ === 'string' ? window.__RESUME_DESIGN__ : 'ats';
  const r = window.__RESUME__;
  if (!r) {
    return;
  }
  const b = r.basics || {};
  const root = document.getElementById('resume');
  if (!root) {
    return;
  }

  function esc(s) {
    return (s || '')
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function url(u) {
    if (!u) {
      return '';
    }
    if (/^https?:\/\//i.test(u)) {
      return u;
    }
    return 'https://' + u.replace(/^\/+/, '');
  }

  function summaryHeading() {
    if (design === 'amin-ariana') {
      return 'Executive Summary';
    }
    return 'Summary';
  }
  function experienceHeading() {
    if (design === 'findmyprofession') {
      return 'Professional Experience';
    }
    return 'Experience';
  }
  function skillsHeading() {
    if (design === 'alex-gervais') {
      return 'Skills & Technologies';
    }
    if (design === 'amin-ariana') {
      return 'Technical Skills';
    }
    return 'Relevant Skills';
  }

  let html = '';
  html += '<div class="header-block">';
  html += '<h1>' + esc(b.name) + '</h1>';
  if (b.label) {
    html += '<div class="label">' + esc(b.label) + '</div>';
  }
  const parts = [];
  if (b.location && (b.location.city || b.location.region)) {
    parts.push(esc([b.location.city, b.location.region].filter(Boolean).join(', ')));
  }
  let siteUrl = b.url;
  if (!siteUrl && b.profiles) {
    for (let j = 0; j < b.profiles.length; j += 1) {
      const pr = b.profiles[j];
      if (pr && pr.network === 'Personal Website' && pr.url) {
        siteUrl = pr.url;
        break;
      }
    }
  }
  if (siteUrl) {
    const fullUrl = url(siteUrl);
    const displayUrl = fullUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    parts.push('<a href="' + esc(fullUrl) + '">' + esc(displayUrl) + '</a>');
  }
  let li = null;
  if (b.profiles) {
    for (let i = 0; i < b.profiles.length; i += 1) {
      const p = b.profiles[i];
      if (p && /linkedin/i.test(p.network || '')) {
        li = p;
        break;
      }
    }
  }
  if (li && li.url) {
    const fullLi = url(li.url);
    const displayLi = fullLi.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    parts.push('<a href="' + esc(fullLi) + '">' + esc(displayLi) + '</a>');
  }
  if (b.email) {
    parts.push('<a href="mailto:' + esc(b.email) + '">' + esc(b.email) + '</a>');
  }
  if (b.phone) {
    parts.push(esc(b.phone));
  }
  html += '<div class="contact">' + parts.join('<span class="sep"> · </span>') + '</div>';
  html += '</div>';

  if (b.summary) {
    html += '<h2>' + esc(summaryHeading()) + '</h2><div class="summary">' + esc(b.summary) + '</div>';
  }

  if (r.work && r.work.length) {
    html += '<h2>' + esc(experienceHeading()) + '</h2>';
    r.work.forEach((w) => {
      html += '<div class="work-item">';
      html += '<div class="work-title">' + esc(w.position) + '</div>';
      html += '<div class="work-meta">' + esc(w.name);
      if (w.location) {
        html += ' · ' + esc(w.location);
      }
      if (w.startDate || w.endDate) {
        html += ' · ' + esc((w.startDate || '') + ' – ' + (w.endDate || 'Present'));
      }
      html += '</div>';
      if (w.summary) {
        html += '<div class="work-summary">' + esc(w.summary) + '</div>';
      }
      if (w.highlights && w.highlights.length) {
        html += '<ul class="highlights">';
        w.highlights.forEach((h) => {
          html += '<li>' + esc(h) + '</li>';
        });
        html += '</ul>';
      }
      html += '</div>';
    });
  }

  if (r.education && r.education.length) {
    html += '<h2>Education</h2>';
    r.education.forEach((e) => {
      html += '<div class="edu-item">';
      html += '<div class="edu-title">' + esc(e.studyType) + ' ' + esc(e.area) + '</div>';
      html += '<div class="edu-meta">' + esc(e.institution) + (e.endDate ? ' · ' + esc(e.endDate) : '') + '</div>';
      if (e.summary) {
        html += '<div class="edu-summary">' + esc(e.summary) + '</div>';
      }
      html += '</div>';
    });
  }

  if (r.skills && r.skills.length) {
    html += '<h2>' + esc(skillsHeading()) + '</h2>';
    if (design === 'alex-gervais') {
      html += '<div class="skills-grid-wrap">';
    }
    r.skills.forEach((s) => {
      html += '<div class="skills-section">';
      html += '<div class="skills-name">' + esc(s.name) + '</div>';
      if (s.keywords && s.keywords.length) {
        html += '<div class="skills-keywords">';
        s.keywords.forEach((k) => {
          html += '<span>' + esc(k) + '</span>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    if (design === 'alex-gervais') {
      html += '</div>';
    }
  }

  if (r.certificates && r.certificates.length) {
    html += '<h2>Certifications</h2>';
    r.certificates.forEach((c) => {
      html += '<div class="work-item"><div class="work-title">' + esc(c.name) + '</div>';
      if (c.issuer) {
        html += '<div class="work-meta">' + esc(c.issuer) + (c.date ? ' · ' + esc(c.date) : '') + '</div>';
      }
      html += '</div>';
    });
  }

  if (r.references && r.references.length) {
    html += '<h2>References</h2>';
    r.references.forEach((ref) => {
      if (!ref) {
        return;
      }
      html += '<div class="work-item">';
      const refName = ref.name ? esc(ref.name) : '';
      const refTitle = ref.title ? esc(ref.title) : '';
      html +=
        '<div class="work-title">' +
        refName +
        (refName && refTitle ? ' — ' : '') +
        refTitle +
        '</div>';
      if (ref.reference) {
        html += '<div class="summary">' + esc(ref.reference) + '</div>';
      }
      html += '</div>';
    });
  }

  root.innerHTML = html;
})();
