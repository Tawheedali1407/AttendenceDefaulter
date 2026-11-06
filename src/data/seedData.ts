import {
  AdminUser,
  AttendanceSession,
  ErpDatabase,
  FacultyUser,
  StudentUser,
  SubjectItem,
} from '../types/erp';
import { generateSalt, hashPassword } from '../utils/crypto';

export const STORAGE_KEY = 'rgmcet_attendance_erp_v3';

interface RawDemoJson {
  faculty: Array<{ id: string; name: string; department: string }>;
  students: Array<{
    id: string;
    registerNumber: string;
    name: string;
    branch: string;
    year: string;
    section: string;
  }>;
  subjects: SubjectItem[];
  sessions: Array<{
    id: string;
    subjectId: string;
    section: string;
    date: string;
    absentees: string[];
  }>;
}

export async function loadDemoDatabaseFromJson(
  existingAdmin?: AdminUser
): Promise<ErpDatabase> {
  const res = await fetch('./demo-data.json');
  if (!res.ok) {
    throw new Error('Failed to fetch demo-data.json');
  }
  const raw = (await res.json()) as RawDemoJson;

  let admin: AdminUser;
  if (existingAdmin) {
    admin = existingAdmin;
  } else {
    const adminSalt = generateSalt();
    const adminHash = await hashPassword('rgmcet', adminSalt);
    admin = {
      username: 'admin',
      displayName: 'RGMCET Academic Admin',
      passwordSalt: adminSalt,
      passwordHash: adminHash,
    };
  }

  const faculty: FacultyUser[] = await Promise.all(
    raw.faculty.map(async (f) => {
      const salt = generateSalt();
      const hash = await hashPassword(f.name, salt);
      return {
        id: f.id,
        name: f.name,
        department: f.department,
        passwordSalt: salt,
        passwordHash: hash,
      };
    })
  );

  const students: StudentUser[] = await Promise.all(
    raw.students.map(async (s) => {
      const regUpper = s.registerNumber.toUpperCase();
      const salt = generateSalt();
      const hash = await hashPassword(regUpper, salt);
      return {
        ...s,
        registerNumber: regUpper,
        passwordSalt: salt,
        passwordHash: hash,
        isDefaultPassword: true,
      };
    })
  );

  // Convert absentees list (registerNumber or id) into presentStudentIds
  const sessions: AttendanceSession[] = raw.sessions.map((sess) => {
    const absenteeSet = new Set(
      (sess.absentees || []).map((a) => a.toUpperCase())
    );
    const secStudents = students.filter((st) => st.section === sess.section);
    const presentStudentIds = secStudents
      .filter(
        (st) =>
          !absenteeSet.has(st.registerNumber.toUpperCase()) &&
          !absenteeSet.has(st.id.toUpperCase())
      )
      .map((st) => st.id);

    return {
      id: sess.id,
      subjectId: sess.subjectId,
      section: sess.section,
      date: sess.date,
      presentStudentIds,
    };
  });

  return {
    admin,
    faculty,
    students,
    subjects: raw.subjects,
    sessions,
    isDemoData: true,
  };
}

export async function createEmptyDatabase(
  existingAdmin?: AdminUser
): Promise<ErpDatabase> {
  let admin: AdminUser;
  if (existingAdmin) {
    admin = existingAdmin;
  } else {
    const adminSalt = generateSalt();
    const adminHash = await hashPassword('rgmcet', adminSalt);
    admin = {
      username: 'admin',
      displayName: 'RGMCET Academic Admin',
      passwordSalt: adminSalt,
      passwordHash: adminHash,
    };
  }

  return {
    admin,
    faculty: [],
    students: [],
    subjects: [],
    sessions: [],
    isDemoData: false,
  };
}

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra',
  'Pari', 'Navya', 'Riya', 'Kavya', 'Rohan', 'Karthik', 'Nikhil', 'Siddharth',
  'Pranav', 'Harsha', 'Varun', 'Teja', 'Sneha', 'Pooja', 'Divya', 'Meghana',
  'Shreya', 'Nandini', 'Lakshmi', 'Swathi', 'Manoj', 'Kiran', 'Suresh', 'Mahesh',
];

const LAST_NAMES = [
  'Reddy', 'Rao', 'Sharma', 'Naidu', 'Varma', 'Prasad', 'Kumar', 'Murthy',
  'Choudary', 'Goud', 'Babu', 'Sastry', 'Patel', 'Nair', 'Iyer', 'Menon',
];

export async function generateMassiveDatabase(
  existingAdmin?: AdminUser
): Promise<ErpDatabase> {
  let admin: AdminUser;
  if (existingAdmin) {
    admin = existingAdmin;
  } else {
    const adminSalt = generateSalt();
    const adminHash = await hashPassword('rgmcet', adminSalt);
    admin = {
      username: 'admin',
      displayName: 'RGMCET Academic Admin',
      passwordSalt: adminSalt,
      passwordHash: adminHash,
    };
  }

  const rawFaculty = [
    { id: 'fac-1', name: 'G Chandana Swathi', department: 'CSE(AI&ML)' },
    { id: 'fac-2', name: 'Dr. K. Ramesh', department: 'CSE(AI&ML)' },
    { id: 'fac-3', name: 'Prof. S. Lakshmi', department: 'CSE(AI&ML)' },
    { id: 'fac-4', name: 'Dr. M. Venkatesh', department: 'CSE(AI&ML)' },
  ];

  const faculty: FacultyUser[] = await Promise.all(
    rawFaculty.map(async (f) => {
      const salt = generateSalt();
      const hash = await hashPassword(f.name, salt);
      return {
        ...f,
        passwordSalt: salt,
        passwordHash: hash,
      };
    })
  );

  const sections = ['A', 'B', 'C', 'D'];
  const subjectTemplates = [
    { id: 'CS302', name: 'Object Oriented Programming through Java', facultyId: 'fac-1', plannedClasses: 45 },
    { id: 'CS304', name: 'Database Management Systems', facultyId: 'fac-2', plannedClasses: 45 },
    { id: 'CS306', name: 'Design & Analysis of Algorithms', facultyId: 'fac-3', plannedClasses: 45 },
    { id: 'CS308', name: 'Operating Systems', facultyId: 'fac-4', plannedClasses: 45 },
  ];

  const subjects: SubjectItem[] = [];
  for (const sec of sections) {
    for (const tpl of subjectTemplates) {
      subjects.push({
        id: tpl.id,
        name: tpl.name,
        facultyId: tpl.facultyId,
        semester: 'II Year I-Sem',
        section: sec,
        plannedClasses: tpl.plannedClasses,
      });
    }
  }

  // Generate 200 fake students (50 per section A-D)
  const rawStudents: Array<{
    id: string;
    registerNumber: string;
    name: string;
    branch: string;
    year: string;
    section: string;
    targetRate: number;
  }> = [];

  let counter = 1;
  for (const sec of sections) {
    for (let i = 1; i <= 50; i++) {
      const numStr = String(i).padStart(2, '0');
      const reg = `25091A33${sec}${numStr}`;
      const first = FIRST_NAMES[(counter * 7) % FIRST_NAMES.length];
      const last = LAST_NAMES[(counter * 13) % LAST_NAMES.length];
      // Ensure ~68% Regular, ~18% Condonation, ~14% Detained in every section
      const targetRate =
        i <= 34 ? 0.86 : i <= 43 ? 0.70 : 0.54;
      rawStudents.push({
        id: `stu-mass-${sec}-${numStr}`,
        registerNumber: reg,
        name: `${first} ${last}`,
        branch: 'CSE(AI&ML)',
        year: 'II Year',
        section: sec,
        targetRate,
      });
      counter++;
    }
  }

  const students: StudentUser[] = await Promise.all(
    rawStudents.map(async ({ targetRate: _t, ...s }) => {
      const salt = generateSalt();
      const hash = await hashPassword(s.registerNumber, salt);
      return {
        ...s,
        passwordSalt: salt,
        passwordHash: hash,
        isDefaultPassword: true,
      };
    })
  );

  // 12 dates across Jul-Oct 2026 per subject-section = 192 sessions
  const dates = [
    '2026-07-06', '2026-07-14', '2026-07-22',
    '2026-08-03', '2026-08-12', '2026-08-24',
    '2026-09-02', '2026-09-14', '2026-09-25',
    '2026-10-05', '2026-10-15', '2026-10-26',
  ];

  const sessions: AttendanceSession[] = [];
  let sessIdx = 1;
  for (const sub of subjects) {
    const secRawStudents = rawStudents.filter((s) => s.section === sub.section);
    dates.forEach((date, dIdx) => {
      const presentStudentIds = secRawStudents
        .filter((stu, sIdx) => {
          // Deterministic pseudo-random presence matching targetRate
          const hashVal = ((sIdx * 31 + dIdx * 17 + sessIdx * 13) % 100) / 100;
          return hashVal < stu.targetRate;
        })
        .map((stu) => stu.id);

      sessions.push({
        id: `sess-mass-${sessIdx++}`,
        subjectId: sub.id,
        section: sub.section,
        date,
        presentStudentIds,
      });
    });
  }

  return {
    admin,
    faculty,
    students,
    subjects,
    sessions,
    isDemoData: true,
  };
}
