export type Role = 'ADMIN' | 'FACULTY' | 'STUDENT';

export type AttendanceCategory = 'REGULAR' | 'CONDONATION' | 'DETAINED';

export interface AdminUser {
  username: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
}

export interface FacultyUser {
  id: string;
  name: string;
  department: string;
  passwordSalt: string;
  passwordHash: string;
}

export interface StudentUser {
  id: string;
  registerNumber: string;
  name: string;
  branch: string;
  year: string;
  section: string;
  passwordSalt: string;
  passwordHash: string;
  isDefaultPassword?: boolean;
  importedOverallPercent?: number;
  isImported?: boolean;
}

export interface SubjectItem {
  id: string;
  name: string;
  facultyId: string;
  semester: string;
  section: string;
  plannedClasses: number;
}

export interface AttendanceSession {
  id: string;
  subjectId: string;
  section: string;
  date: string; // YYYY-MM-DD
  presentStudentIds: string[];
  isImported?: boolean;
}

export interface PublishedNotice {
  publishedAt: string;
  publishedBy: string;
  academicTerm: string;
}

export interface ErpDatabase {
  admin: AdminUser;
  faculty: FacultyUser[];
  students: StudentUser[];
  subjects: SubjectItem[];
  sessions: AttendanceSession[];
  isDemoData?: boolean;
  publishedNotice?: PublishedNotice | null;
}

export interface AuthSession {
  role: Role;
  userId: string;
  displayName: string;
  subtitle: string;
}

export interface AttendanceMetrics {
  planned: number;
  conducted: number;
  attended: number;
  percentage: number;
  category: AttendanceCategory;
  isDefaulter: boolean;
  shortagePercent: number;
  classesNeeded: number;
  remainingClasses: number;
  isRecoveryFeasible: boolean;
  bestReachablePercent: number;
}
