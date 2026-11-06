import {
  AttendanceSession,
  ErpDatabase,
  FacultyUser,
  StudentUser,
  SubjectItem,
} from '../types/erp';
import { generateSalt, hashPassword } from './crypto';
import { exportToCsv } from './exportUtils';

export function exportAllDataAsCsv(db: ErpDatabase): void {
  const headers = ['RECORD_TYPE', 'COL1', 'COL2', 'COL3', 'COL4', 'COL5', 'COL6'];
  const rows: (string | number)[][] = [];

  for (const f of db.faculty) {
    rows.push(['FACULTY', f.id, f.name, f.department, '', '', '']);
  }

  for (const s of db.students) {
    rows.push([
      'STUDENT',
      s.id,
      s.registerNumber,
      s.name,
      s.branch,
      s.year,
      s.section,
    ]);
  }

  for (const sub of db.subjects) {
    rows.push([
      'SUBJECT',
      sub.id,
      sub.name,
      sub.facultyId,
      sub.semester,
      sub.section,
      sub.plannedClasses,
    ]);
  }

  for (const sess of db.sessions) {
    rows.push([
      'SESSION',
      sess.id,
      sess.subjectId,
      sess.section,
      sess.date,
      sess.presentStudentIds.join('|'),
      '',
    ]);
  }

  exportToCsv('RGMCET_Attendance_Full_Backup.csv', headers, rows);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export async function importAllDataFromCsv(
  csvText: string,
  currentDb: ErpDatabase
): Promise<ErpDatabase> {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing data rows.');
  }

  const faculty: FacultyUser[] = [];
  const students: StudentUser[] = [];
  const subjects: SubjectItem[] = [];
  const sessions: AttendanceSession[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const type = cols[0]?.toUpperCase();

    if (type === 'FACULTY' && cols[1] && cols[2]) {
      const existing = currentDb.faculty.find((f) => f.id === cols[1]);
      const salt = existing ? existing.passwordSalt : generateSalt();
      const hash = existing
        ? existing.passwordHash
        : await hashPassword(cols[2], salt);
      faculty.push({
        id: cols[1],
        name: cols[2],
        department: cols[3] || 'CSE',
        passwordSalt: salt,
        passwordHash: hash,
      });
    } else if (type === 'STUDENT' && cols[1] && cols[2] && cols[3]) {
      const existing = currentDb.students.find((s) => s.id === cols[1]);
      const salt = existing ? existing.passwordSalt : generateSalt();
      const hash = existing
        ? existing.passwordHash
        : await hashPassword(cols[2], salt);
      students.push({
        id: cols[1],
        registerNumber: cols[2],
        name: cols[3],
        branch: cols[4] || 'CSE',
        year: cols[5] || '2nd Year',
        section: cols[6] || 'B',
        passwordSalt: salt,
        passwordHash: hash,
      });
    } else if (type === 'SUBJECT' && cols[1] && cols[2]) {
      subjects.push({
        id: cols[1],
        name: cols[2],
        facultyId: cols[3] || '',
        semester: cols[4] || 'Sem III',
        section: cols[5] || 'B',
        plannedClasses: Math.max(1, Number(cols[6]) || 40),
      });
    } else if (type === 'SESSION' && cols[1] && cols[2] && cols[4]) {
      sessions.push({
        id: cols[1],
        subjectId: cols[2],
        section: cols[3] || 'B',
        date: cols[4],
        presentStudentIds: cols[5]
          ? cols[5].split('|').filter((id) => id.trim().length > 0)
          : [],
      });
    }
  }

  if (
    faculty.length === 0 &&
    students.length === 0 &&
    subjects.length === 0 &&
    sessions.length === 0
  ) {
    throw new Error('No valid FACULTY, STUDENT, SUBJECT, or SESSION rows found in CSV.');
  }

  return {
    ...currentDb,
    faculty: faculty.length > 0 ? faculty : currentDb.faculty,
    students: students.length > 0 ? students : currentDb.students,
    subjects: subjects.length > 0 ? subjects : currentDb.subjects,
    sessions: sessions.length > 0 ? sessions : currentDb.sessions,
  };
}
