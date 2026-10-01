/**
 * Genera PDFs simples en el navegador para los archivos de ejemplo,
 * así "Abrir" y "Descargar" funcionan sin tener archivos reales todavía.
 */

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;

// Los PDFs usan la codificación WinAnsi (Latin-1): reemplazamos lo que no entra.
const REPLACEMENTS = { '—': '-', '–': '-', '→': '->', '≈': '~','Σ': 'S', 'Δ': 'D', '₀': '0', '½': '1/2', '√': 'raiz', 'α': 'alfa', 'μ': 'mu' };

function toLatin1(text) {
  return [...text].map((char) => REPLACEMENTS[char] ?? (char.charCodeAt(0) < 256 ? char : '?')).join('');
}

const escapePdf = (text) => toLatin1(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function wrap(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    if ((current + ' ' + word).trim().length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  });
  if (current) lines.push(current);
  return lines;
}

export function createSamplePdf({ title, sections = [] }) {
  const pages = [];
  let ops = [];
  let y = PAGE_H - 140;

  const header = () => {
    ops.push('0.06 0.16 0.29 rg', `0 ${PAGE_H - 96} ${PAGE_W} 96 re f`);
    ops.push('1 1 1 rg', `BT /F2 22 Tf ${MARGIN} ${PAGE_H - 58} Td (${escapePdf(title)}) Tj ET`);
    ops.push('0.66 0.79 1 rg', `BT /F1 10 Tf ${MARGIN} ${PAGE_H - 80} Td (${escapePdf('Física · Profesor Martín')}) Tj ET`);
    ops.push('0.07 0.09 0.13 rg');
  };
  const newPage = () => {
    pages.push(ops);
    ops = [];
    y = PAGE_H - MARGIN;
  };
  const line = (text, font, size, color = '0.07 0.09 0.13') => {
    if (y < MARGIN + size) newPage();
    ops.push(`${color} rg`, `BT /${font} ${size} Tf ${MARGIN} ${y.toFixed(1)} Td (${escapePdf(text)}) Tj ET`);
    y -= size * 1.55;
  };

  header();
  sections.forEach((section) => {
    line(section.heading, 'F2', 15, '0.11 0.31 0.85');
    section.lines.forEach((text) => wrap(text, 82).forEach((part) => line(part, 'F1', 12)));
    y -= 14;
  });
  pages.push(ops);

  // Objetos: 1 catálogo, 2 árbol de páginas, 3-4 fuentes, luego página + contenido por cada hoja.
  const objects = [];
  const pageIds = pages.map((_, index) => 5 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((pageOps, index) => {
    const pageId = pageIds[index];
    const stream = pageOps.join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let output = '%PDF-1.4\n';
  const offsets = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = output.length;
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefStart = output.length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  // Cada carácter Latin-1 ocupa exactamente un byte, así los offsets coinciden.
  const bytes = Uint8Array.from(output, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: 'application/pdf' });
}
