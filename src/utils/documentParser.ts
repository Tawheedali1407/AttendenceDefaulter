export const REG_NO_REGEX = /\b\d{5}[A-Z][A-Z0-9]{4}\b/i;

export interface ParsedPercentageRow {
  rowId: string;
  registerNumber: string;
  name: string;
  percentageStr: string;
}

export interface ParsedDailySheetResult {
  dates: string[]; // YYYY-MM-DD
  rows: Array<{
    rowId: string;
    registerNumber: string;
    name: string;
    statuses: ('P' | 'A')[];
  }>;
}

/**
 * Extracts raw text lines from .csv, .xlsx, .pdf, .docx, or image files
 * 100% in the browser using pinned cdnjs libraries.
 */
export async function extractLinesFromFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'csv' || ext === 'txt') {
    onProgress?.('Reading CSV/text file...');
    const text = await file.text();
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    onProgress?.('Parsing Excel workbook with SheetJS...');
    if (!window.XLSX) {
      throw new Error('SheetJS library not loaded. Check internet connection.');
    }
    const buf = await file.arrayBuffer();
    const wb = window.XLSX.read(buf, { type: 'array' });
    const allLines: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const matrix = window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      });
      for (const row of matrix) {
        const joined = row
          .map((cell) => String(cell ?? '').trim())
          .filter((c) => c.length > 0)
          .join('  ');
        if (joined.length > 0) {
          allLines.push(joined);
        }
      }
    }
    return allLines;
  }

  if (ext === 'pdf') {
    onProgress?.('Extracting text from PDF with pdf.js...');
    if (!window.pdfjsLib) {
      throw new Error('pdf.js library not loaded. Check internet connection.');
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const allLines: string[] = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      onProgress?.(`Reading PDF page ${p} of ${pdf.numPages}...`);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();

      // Group text items by approximate Y coordinate
      const yBuckets = new Map<number, Array<{ x: number; str: string }>>();
      for (const item of content.items) {
        const str = (item.str || '').trim();
        if (!str) continue;
        const x = item.transform ? item.transform[4] : 0;
        const y = item.transform ? Math.round(item.transform[5] / 4) * 4 : 0;
        const bucket = yBuckets.get(y) || [];
        bucket.push({ x, str });
        yBuckets.set(y, bucket);
      }

      const sortedYs = Array.from(yBuckets.keys()).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const items = (yBuckets.get(y) || []).sort((a, b) => a.x - b.x);
        const line = items.map((i) => i.str).join(' ');
        if (line.trim().length > 0) {
          allLines.push(line.trim());
        }
      }
    }
    return allLines;
  }

  if (ext === 'docx') {
    onProgress?.('Extracting tables & text from DOCX with mammoth.js...');
    if (!window.mammoth) {
      throw new Error('mammoth.js library not loaded. Check internet connection.');
    }
    const buf = await file.arrayBuffer();
    const htmlRes = await window.mammoth.convertToHtml({ arrayBuffer: buf });
    const doc = new DOMParser().parseFromString(htmlRes.value, 'text/html');
    const lines: string[] = [];

    // Extract all tables first
    const tables = Array.from(doc.querySelectorAll('table'));
    for (const table of tables) {
      const trs = Array.from(table.querySelectorAll('tr'));
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('th, td'))
          .map((c) => (c.textContent || '').trim())
          .filter((t) => t.length > 0);
        if (cells.length > 0) {
          lines.push(cells.join('  '));
        }
      }
    }

    // Also extract non-table paragraphs
    const paras = Array.from(doc.querySelectorAll('p, li'));
    for (const p of paras) {
      if (p.closest('table')) continue;
      const txt = (p.textContent || '').trim();
      if (txt.length > 0) {
        lines.push(txt);
      }
    }

    return lines;
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext)) {
    onProgress?.('Running OCR on image with Tesseract.js...');
    if (!window.Tesseract) {
      throw new Error(
        'Tesseract.js library not loaded. Check internet connection.'
      );
    }
    const res = await window.Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.(`OCR Recognizing Text: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    return res.data.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  throw new Error(
    `Unsupported file format ".${ext}". Use .csv, .xlsx, .pdf, .docx, or an image.`
  );
}

/**
 * Parses lines into Percentage List rows:
 * Register number matches /\b\d{5}[A-Z][A-Z0-9]{4}\b/i
 * Name = text after it; % = last decimal number on the line.
 */
export function parsePercentageLines(lines: string[]): ParsedPercentageRow[] {
  const results: ParsedPercentageRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(REG_NO_REGEX);
    if (!match || match.index === undefined) continue; // Skip headers & non-student lines

    const registerNumber = match[0].toUpperCase();
    const afterReg = line.slice(match.index + match[0].length).trim();

    // Find last decimal/numeric number on the line
    const numMatches = Array.from(afterReg.matchAll(/(\d+(?:\.\d+)?)\s*%?/g));
    let percentageStr = '';
    let namePart = afterReg;

    if (numMatches.length > 0) {
      const lastNum = numMatches[numMatches.length - 1];
      percentageStr = lastNum[1];
      if (lastNum.index !== undefined) {
        namePart = afterReg.slice(0, lastNum.index).trim();
      }
    }

    // Clean punctuation/separators from name
    const cleanedName = namePart
      .replace(/^[\s,|\-–:]+/, '')
      .replace(/[\s,|\-–:]+$/, '')
      .replace(/\s{2,}/g, ' ');

    results.push({
      rowId: `imp-pct-${i}-${registerNumber}`,
      registerNumber,
      name: cleanedName,
      percentageStr,
    });
  }

  return results;
}

/**
 * Parses lines into a Daily Attendance Sheet for a chosen month (YYYY-MM).
 */
export function parseDailySheetLines(
  lines: string[],
  month: string // YYYY-MM
): ParsedDailySheetResult {
  let detectedDates: string[] = [];
  const rows: ParsedDailySheetResult['rows'] = [];

  // Look for header line with dates before student rows
  for (const line of lines) {
    if (REG_NO_REGEX.test(line)) break;
    // Match YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, or day numbers 01..31
    const fullDates = Array.from(
      line.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)
    ).map((m) => `${m[1]}-${m[2]}-${m[3]}`);
    if (fullDates.length > 0) {
      detectedDates = fullDates;
      break;
    }

    const dmyDates = Array.from(
      line.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g)
    ).map((m) => {
      const day = m[1].padStart(2, '0');
      const mon = m[2].padStart(2, '0');
      const yr = m[3]
        ? m[3].length === 2
          ? `20${m[3]}`
          : m[3]
        : month.slice(0, 4);
      return `${yr}-${mon}-${day}`;
    });
    if (dmyDates.length > 0) {
      detectedDates = dmyDates;
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(REG_NO_REGEX);
    if (!match || match.index === undefined) continue;

    const registerNumber = match[0].toUpperCase();
    const afterReg = line.slice(match.index + match[0].length).trim();

    // Extract P / A tokens from the end of the line
    const tokens = afterReg.split(/[\s,|]+/).filter((t) => t.length > 0);
    const statuses: ('P' | 'A')[] = [];
    let nameEndTokenIdx = tokens.length;

    for (let t = tokens.length - 1; t >= 0; t--) {
      const upper = tokens[t].toUpperCase();
      if (upper === 'P' || upper === 'PRESENT') {
        statuses.unshift('P');
        nameEndTokenIdx = t;
      } else if (upper === 'A' || upper === 'ABSENT') {
        statuses.unshift('A');
        nameEndTokenIdx = t;
      } else {
        break;
      }
    }

    const name = tokens
      .slice(0, nameEndTokenIdx)
      .join(' ')
      .replace(/^[\s,|\-–:]+/, '')
      .replace(/[\s,|\-–:]+$/, '');

    rows.push({
      rowId: `imp-daily-${i}-${registerNumber}`,
      registerNumber,
      name,
      statuses,
    });
  }

  const maxCols = Math.max(0, ...rows.map((r) => r.statuses.length));
  const finalDates: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    if (detectedDates[c]) {
      finalDates.push(detectedDates[c]);
    } else {
      const day = String(c + 1).padStart(2, '0');
      finalDates.push(`${month}-${day}`);
    }
  }

  // Normalize all rows to maxCols
  for (const r of rows) {
    while (r.statuses.length < maxCols) {
      r.statuses.push('A');
    }
  }

  return { dates: finalDates, rows };
}
