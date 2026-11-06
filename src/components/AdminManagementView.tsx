import React, { useRef, useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  ErpDatabase,
  FacultyUser,
  StudentUser,
  SubjectItem,
} from '../types/erp';
import { generateSalt, hashPassword } from '../utils/crypto';
import { exportAllDataAsCsv, importAllDataFromCsv } from '../utils/backupCsv';
import { getStudentOverallStats } from '../utils/attendanceMath';
import { CategoryBadge } from './CategoryBadge';

interface AdminManagementViewProps {
  db: ErpDatabase;
  onUpdateDb: (nextDb: ErpDatabase) => void;
  onReloadDemo: () => Promise<void>;
  onLoadMassiveData: () => Promise<void>;
  onDeleteAllData: () => Promise<void>;
}

const SECTIONS = ['A', 'B', 'C', 'D'];

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  db,
  onUpdateDb,
  onReloadDemo,
  onLoadMassiveData,
  onDeleteAllData,
}) => {
  const [subTab, setSubTab] = useState<'STUDENTS' | 'FACULTY' | 'SUBJECTS'>(
    'STUDENTS'
  );
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Student form state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [stuReg, setStuReg] = useState('');
  const [stuName, setStuName] = useState('');
  const [stuBranch, setStuBranch] = useState('CSE(AI&ML)');
  const [stuYear, setStuYear] = useState('II Year');
  const [stuSection, setStuSection] = useState('B');
  const [stuPassword, setStuPassword] = useState('');
  const [showStuPw, setShowStuPw] = useState(false);

  // Faculty form state
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [facName, setFacName] = useState('');
  const [facDept, setFacDept] = useState('CSE(AI&ML)');
  const [facPassword, setFacPassword] = useState('');
  const [showFacPw, setShowFacPw] = useState(false);

  // Subject form state
  const [editingSubjectKey, setEditingSubjectKey] = useState<string | null>(
    null
  );
  const [subId, setSubId] = useState('');
  const [subName, setSubName] = useState('');
  const [subFacultyId, setSubFacultyId] = useState(db.faculty[0]?.id || '');
  const [subSemester, setSubSemester] = useState('II Year I-Sem');
  const [subSection, setSubSection] = useState('B');
  const [subPlanned, setSubPlanned] = useState('40');

  const clearStudentForm = () => {
    setEditingStudentId(null);
    setStuReg('');
    setStuName('');
    setStuBranch('CSE(AI&ML)');
    setStuYear('II Year');
    setStuSection('B');
    setStuPassword('');
    setShowStuPw(false);
  };

  const clearFacultyForm = () => {
    setEditingFacultyId(null);
    setFacName('');
    setFacDept('CSE(AI&ML)');
    setFacPassword('');
    setShowFacPw(false);
  };

  const clearSubjectForm = () => {
    setEditingSubjectKey(null);
    setSubId('');
    setSubName('');
    setSubFacultyId(db.faculty[0]?.id || '');
    setSubSemester('II Year I-Sem');
    setSubSection('B');
    setSubPlanned('40');
  };

  // Student CRUD
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const reg = stuReg.trim().toUpperCase();
    const name = stuName.trim();
    if (!reg || !name) {
      setFeedback({
        type: 'error',
        text: 'Register number and student name are required.',
      });
      return;
    }

    if (editingStudentId) {
      const existing = db.students.find((s) => s.id === editingStudentId);
      if (!existing) return;
      let salt = existing.passwordSalt;
      let hash = existing.passwordHash;
      let isDefault = existing.isDefaultPassword;
      if (stuPassword.trim().length > 0) {
        salt = generateSalt();
        hash = await hashPassword(stuPassword.trim(), salt);
        isDefault = false;
      }
      const updated: StudentUser = {
        ...existing,
        registerNumber: reg,
        name,
        branch: stuBranch.trim() || 'CSE(AI&ML)',
        year: stuYear.trim() || 'II Year',
        section: stuSection.trim().toUpperCase() || 'B',
        passwordSalt: salt,
        passwordHash: hash,
        isDefaultPassword: isDefault,
      };
      onUpdateDb({
        ...db,
        students: db.students.map((s) =>
          s.id === editingStudentId ? updated : s
        ),
      });
      setFeedback({
        type: 'success',
        text: `Updated student ${reg} (${name}).`,
      });
      clearStudentForm();
    } else {
      if (
        db.students.some(
          (s) => s.registerNumber.toLowerCase() === reg.toLowerCase()
        )
      ) {
        setFeedback({
          type: 'error',
          text: 'A student with this register number already exists.',
        });
        return;
      }
      const hasCustomPw = stuPassword.trim().length > 0;
      const rawPw = hasCustomPw ? stuPassword.trim() : reg;
      const salt = generateSalt();
      const hash = await hashPassword(rawPw, salt);
      const newStudent: StudentUser = {
        id: `stu-${Date.now()}`,
        registerNumber: reg,
        name,
        branch: stuBranch.trim() || 'CSE(AI&ML)',
        year: stuYear.trim() || 'II Year',
        section: stuSection.trim().toUpperCase() || 'B',
        passwordSalt: salt,
        passwordHash: hash,
        isDefaultPassword: !hasCustomPw,
      };
      onUpdateDb({ ...db, students: [...db.students, newStudent] });
      setFeedback({
        type: 'success',
        text: `Added student ${reg} (${name}). Default/assigned password hashed.`,
      });
      clearStudentForm();
    }
  };

  const handleResetStudentPassword = async (stu: StudentUser) => {
    const salt = generateSalt();
    const hash = await hashPassword(stu.registerNumber.toUpperCase(), salt);
    onUpdateDb({
      ...db,
      students: db.students.map((s) =>
        s.id === stu.id
          ? {
              ...s,
              passwordSalt: salt,
              passwordHash: hash,
              isDefaultPassword: true,
            }
          : s
      ),
    });
    setFeedback({
      type: 'success',
      text: `Reset password for ${stu.registerNumber} to default (${stu.registerNumber}).`,
    });
  };

  const handleDeleteStudent = (id: string) => {
    onUpdateDb({
      ...db,
      students: db.students.filter((s) => s.id !== id),
      sessions: db.sessions.map((sess) => ({
        ...sess,
        presentStudentIds: sess.presentStudentIds.filter((pid) => pid !== id),
      })),
    });
    setFeedback({ type: 'success', text: 'Student removed.' });
  };

  // Faculty CRUD
  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const name = facName.trim();
    const dept = facDept.trim();
    if (!name || !dept) {
      setFeedback({
        type: 'error',
        text: 'Faculty name and department are required.',
      });
      return;
    }

    if (editingFacultyId) {
      const existing = db.faculty.find((f) => f.id === editingFacultyId);
      if (!existing) return;
      let salt = existing.passwordSalt;
      let hash = existing.passwordHash;
      if (facPassword.trim().length > 0) {
        salt = generateSalt();
        hash = await hashPassword(facPassword.trim(), salt);
      }
      const updated: FacultyUser = {
        ...existing,
        name,
        department: dept,
        passwordSalt: salt,
        passwordHash: hash,
      };
      onUpdateDb({
        ...db,
        faculty: db.faculty.map((f) =>
          f.id === editingFacultyId ? updated : f
        ),
      });
      setFeedback({ type: 'success', text: `Updated faculty ${name}.` });
      clearFacultyForm();
    } else {
      const rawPw = facPassword.trim().length > 0 ? facPassword.trim() : name;
      const salt = generateSalt();
      const hash = await hashPassword(rawPw, salt);
      const newFac: FacultyUser = {
        id: `fac-${Date.now()}`,
        name,
        department: dept,
        passwordSalt: salt,
        passwordHash: hash,
      };
      onUpdateDb({ ...db, faculty: [...db.faculty, newFac] });
      setFeedback({
        type: 'success',
        text: `Added faculty ${name} (${dept}).`,
      });
      clearFacultyForm();
    }
  };

  const handleResetFacultyPassword = async (fac: FacultyUser) => {
    const salt = generateSalt();
    const hash = await hashPassword(fac.name, salt);
    onUpdateDb({
      ...db,
      faculty: db.faculty.map((f) =>
        f.id === fac.id ? { ...f, passwordSalt: salt, passwordHash: hash } : f
      ),
    });
    setFeedback({
      type: 'success',
      text: `Reset password for ${fac.name} to default (${fac.name}).`,
    });
  };

  const handleDeleteFaculty = (id: string) => {
    onUpdateDb({
      ...db,
      faculty: db.faculty.filter((f) => f.id !== id),
    });
    setFeedback({ type: 'success', text: 'Faculty member removed.' });
  };

  // Subject CRUD
  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const id = subId.trim().toUpperCase();
    const name = subName.trim();
    const sec = subSection.trim().toUpperCase() || 'B';
    const planned = Math.max(1, Number(subPlanned) || 40);

    if (!id || !name) {
      setFeedback({
        type: 'error',
        text: 'Subject ID and Subject Name are required.',
      });
      return;
    }

    const newItem: SubjectItem = {
      id,
      name,
      facultyId: subFacultyId,
      semester: subSemester.trim() || 'II Year I-Sem',
      section: sec,
      plannedClasses: planned,
    };

    if (editingSubjectKey) {
      const [oldId, oldSec] = editingSubjectKey.split('::');
      onUpdateDb({
        ...db,
        subjects: db.subjects.map((s) =>
          s.id === oldId && s.section === oldSec ? newItem : s
        ),
      });
      setFeedback({
        type: 'success',
        text: `Updated subject ${id} (${name}) · Sec ${sec}.`,
      });
      clearSubjectForm();
    } else {
      if (db.subjects.some((s) => s.id === id && s.section === sec)) {
        setFeedback({
          type: 'error',
          text: `Subject ${id} for Section ${sec} already exists.`,
        });
        return;
      }
      onUpdateDb({ ...db, subjects: [...db.subjects, newItem] });
      setFeedback({
        type: 'success',
        text: `Added subject ${id} (${name}) · Sec ${sec} (${planned} planned classes).`,
      });
      clearSubjectForm();
    }
  };

  const handleDeleteSubject = (id: string, section: string) => {
    onUpdateDb({
      ...db,
      subjects: db.subjects.filter(
        (s) => !(s.id === id && s.section === section)
      ),
    });
    setFeedback({
      type: 'success',
      text: `Removed subject ${id} (Sec ${section}).`,
    });
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const nextDb = await importAllDataFromCsv(text, db);
      onUpdateDb({ ...nextDb, isDemoData: false });
      setFeedback({
        type: 'success',
        text: 'Imported CSV backup successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to import CSV.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const q = search.trim().toLowerCase();
  const filteredStudents = db.students.filter(
    (s) =>
      s.registerNumber.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.branch.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q)
  );
  const filteredFaculty = db.faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.department.toLowerCase().includes(q)
  );
  const filteredSubjects = db.subjects.filter(
    (sub) =>
      sub.id.toLowerCase().includes(q) ||
      sub.name.toLowerCase().includes(q) ||
      sub.section.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Sub-tabs + CSV Backup + Reload Demo / Delete All */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 p-1 bg-[#F1F5F9] dark:bg-slate-800 rounded">
          {(
            [
              { id: 'STUDENTS', label: `Students (${db.students.length})` },
              { id: 'FACULTY', label: `Faculty (${db.faculty.length})` },
              { id: 'SUBJECTS', label: `Subjects (${db.subjects.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSubTab(t.id);
                setSearch('');
                setFeedback(null);
                setShowStuPw(false);
                setShowFacPw(false);
              }}
              className={`min-h-[44px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                subTab === t.id
                  ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-[#93C5FD] border border-[#CBD5E1] dark:border-slate-700'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
            aria-label="Import CSV backup"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => exportAllDataAsCsv(db)}
            className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export All CSV
          </button>
          <button
            type="button"
            onClick={onReloadDemo}
            className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload demo data
          </button>
          <button
            type="button"
            onClick={onLoadMassiveData}
            className="min-h-[44px] px-3 py-1.5 rounded border border-[#1E3A8A] dark:border-blue-500 bg-[#EFF6FF] dark:bg-blue-950/40 text-xs font-semibold text-[#1E3A8A] dark:text-blue-300 hover:bg-[#DBEAFE] dark:hover:bg-blue-900/50 inline-flex items-center gap-1.5"
          >
            + Add Massive Data (200)
          </button>
          <button
            type="button"
            onClick={onDeleteAllData}
            className="min-h-[44px] px-3 py-1.5 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete all data
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center gap-2 text-xs ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF5] dark:bg-emerald-950/50 border-[#A7F3D0] dark:border-emerald-800 text-[#047857] dark:text-emerald-300'
              : 'bg-[#FEF2F2] dark:bg-red-950/50 border-[#FECACA] dark:border-red-800 text-[#B91C1C] dark:text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* STUDENTS TAB */}
      {subTab === 'STUDENTS' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveStudent}
            className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              {editingStudentId ? 'Edit Student Record' : 'Add New Student'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="stu-reg"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Register Number *
                </label>
                <input
                  id="stu-reg"
                  type="text"
                  value={stuReg}
                  onChange={(e) => setStuReg(e.target.value)}
                  placeholder="e.g. 25091A33B5"
                  className="w-full h-[44px] px-3 text-sm font-mono rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="stu-name"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="stu-name"
                  type="text"
                  value={stuName}
                  onChange={(e) => setStuName(e.target.value)}
                  placeholder="e.g. Kiran Kumar"
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="stu-branch"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Branch
                </label>
                <input
                  id="stu-branch"
                  type="text"
                  value={stuBranch}
                  onChange={(e) => setStuBranch(e.target.value)}
                  placeholder="e.g. CSE(AI&ML)"
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="stu-year"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Year
                </label>
                <input
                  id="stu-year"
                  type="text"
                  value={stuYear}
                  onChange={(e) => setStuYear(e.target.value)}
                  placeholder="e.g. II Year"
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="stu-section"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Section
                </label>
                <select
                  id="stu-section"
                  value={stuSection}
                  onChange={(e) => setStuSection(e.target.value)}
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="stu-password"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  {editingStudentId
                    ? 'Set New Password (blank to keep)'
                    : 'Password (blank = Register No)'}
                </label>
                <div className="relative flex items-center">
                  <input
                    id="stu-password"
                    type={showStuPw ? 'text' : 'password'}
                    value={stuPassword}
                    onChange={(e) => setStuPassword(e.target.value)}
                    placeholder={
                      editingStudentId
                        ? 'Optional new password'
                        : 'Default: Register No'
                    }
                    className="w-full h-[44px] pl-3 pr-12 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStuPw((p) => !p)}
                    aria-label={showStuPw ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-0 h-[44px] w-[44px] flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                  >
                    {showStuPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {editingStudentId ? 'Update Student' : 'Add Student'}
              </button>
              {editingStudentId && (
                <button
                  type="button"
                  onClick={clearStudentForm}
                  className="min-h-[44px] px-4 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {/* Student List */}
          <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search students"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search register no, name, branch, section..."
                  className="w-full h-[44px] pl-9 pr-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-10 border-b border-[#E2E8F0] dark:border-slate-700">
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Register No
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Name
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Branch · Year · Sec
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Category
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((stu, idx) => {
                    const stats = getStudentOverallStats(
                      stu,
                      db.subjects,
                      db.sessions
                    );
                    return (
                      <tr
                        key={stu.id}
                        className={`h-12 border-b border-[#E2E8F0] dark:border-slate-800 last:border-b-0 ${
                          idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                        }`}
                      >
                        <td className="px-4 font-mono text-xs font-semibold text-[#1E3A8A] dark:text-[#93C5FD]">
                          {stu.registerNumber}
                        </td>
                        <td className="px-4 text-xs font-medium text-[#0F172A] dark:text-white">
                          {stu.name}
                        </td>
                        <td className="px-4 text-xs text-[#475569] dark:text-slate-300">
                          {stu.branch} · {stu.year} · Sec {stu.section}
                        </td>
                        <td className="px-4">
                          <CategoryBadge category={stats.category} />
                        </td>
                        <td className="px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudentId(stu.id);
                              setStuReg(stu.registerNumber);
                              setStuName(stu.name);
                              setStuBranch(stu.branch);
                              setStuYear(stu.year);
                              setStuSection(stu.section);
                              setStuPassword('');
                              setShowStuPw(false);
                            }}
                            className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetStudentPassword(stu)}
                            title="Reset password to Register Number"
                            className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset PW
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(stu.id)}
                            className="min-h-[44px] px-3 py-1.5 rounded border border-[#FECACA] dark:border-red-900 text-xs font-semibold text-[#B91C1C] dark:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-950/40 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FACULTY TAB */}
      {subTab === 'FACULTY' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveFaculty}
            className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              {editingFacultyId ? 'Edit Faculty Member' : 'Add Faculty Member'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="fac-name"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Faculty Name *
                </label>
                <input
                  id="fac-name"
                  type="text"
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                  placeholder="e.g. G Chandana Swathi"
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="fac-dept"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Department *
                </label>
                <input
                  id="fac-dept"
                  type="text"
                  value={facDept}
                  onChange={(e) => setFacDept(e.target.value)}
                  placeholder="e.g. CSE(AI&ML)"
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="fac-password"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  {editingFacultyId
                    ? 'Set New Password (blank to keep)'
                    : 'Password (blank = Faculty Name)'}
                </label>
                <div className="relative flex items-center">
                  <input
                    id="fac-password"
                    type={showFacPw ? 'text' : 'password'}
                    value={facPassword}
                    onChange={(e) => setFacPassword(e.target.value)}
                    placeholder={
                      editingFacultyId
                        ? 'Optional new password'
                        : 'Default: Faculty Name'
                    }
                    className="w-full h-[44px] pl-3 pr-12 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFacPw((p) => !p)}
                    aria-label={showFacPw ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-0 h-[44px] w-[44px] flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                  >
                    {showFacPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {editingFacultyId ? 'Update Faculty' : 'Add Faculty'}
              </button>
              {editingFacultyId && (
                <button
                  type="button"
                  onClick={clearFacultyForm}
                  className="min-h-[44px] px-4 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search faculty"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search faculty name or department..."
                  className="w-full h-[44px] pl-9 pr-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-10 border-b border-[#E2E8F0] dark:border-slate-700">
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Faculty Name
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Department
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.map((fac, idx) => (
                    <tr
                      key={fac.id}
                      className={`h-12 border-b border-[#E2E8F0] dark:border-slate-800 last:border-b-0 ${
                        idx % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                      }`}
                    >
                      <td className="px-4 text-xs font-semibold text-[#0F172A] dark:text-white">
                        {fac.name}
                      </td>
                      <td className="px-4 text-xs text-[#475569] dark:text-slate-300">
                        {fac.department}
                      </td>
                      <td className="px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFacultyId(fac.id);
                            setFacName(fac.name);
                            setFacDept(fac.department);
                            setFacPassword('');
                            setShowFacPw(false);
                          }}
                          className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetFacultyPassword(fac)}
                          className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Reset PW
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFaculty(fac.id)}
                          className="min-h-[44px] px-3 py-1.5 rounded border border-[#FECACA] dark:border-red-900 text-xs font-semibold text-[#B91C1C] dark:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-950/40 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBJECTS TAB */}
      {subTab === 'SUBJECTS' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveSubject}
            className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              {editingSubjectKey
                ? 'Edit Subject & Planned Classes'
                : 'Add Subject & Set Planned Classes'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="sub-id"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Subject ID *
                </label>
                <input
                  id="sub-id"
                  type="text"
                  value={subId}
                  onChange={(e) => setSubId(e.target.value)}
                  placeholder="e.g. CS302"
                  className="w-full h-[44px] px-3 text-sm font-mono rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="sub-name"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Subject Name *
                </label>
                <input
                  id="sub-name"
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. OOPJ"
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="sub-faculty"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Assigned Faculty
                </label>
                <select
                  id="sub-faculty"
                  value={subFacultyId}
                  onChange={(e) => setSubFacultyId(e.target.value)}
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                >
                  {db.faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="sub-semester"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Semester
                </label>
                <input
                  id="sub-semester"
                  type="text"
                  value={subSemester}
                  onChange={(e) => setSubSemester(e.target.value)}
                  placeholder="e.g. II Year I-Sem"
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="sub-section"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Section
                </label>
                <select
                  id="sub-section"
                  value={subSection}
                  onChange={(e) => setSubSection(e.target.value)}
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="sub-planned"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
                >
                  Total Planned Classes
                </label>
                <input
                  id="sub-planned"
                  type="number"
                  min={1}
                  value={subPlanned}
                  onChange={(e) => setSubPlanned(e.target.value)}
                  className="w-full h-[44px] px-3 text-sm font-mono rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {editingSubjectKey ? 'Update Subject' : 'Add Subject'}
              </button>
              {editingSubjectKey && (
                <button
                  type="button"
                  onClick={clearSubjectForm}
                  className="min-h-[44px] px-4 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search subjects"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search subject ID, name, section..."
                  className="w-full h-[44px] pl-9 pr-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-10 border-b border-[#E2E8F0] dark:border-slate-700">
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Subject ID
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Name
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Faculty
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                      Sem · Sec
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                      Planned
                    </th>
                    <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((sub, idx) => {
                    const facName =
                      db.faculty.find((f) => f.id === sub.facultyId)?.name ||
                      'Unassigned';
                    return (
                      <tr
                        key={`${sub.id}-${sub.section}`}
                        className={`h-12 border-b border-[#E2E8F0] dark:border-slate-800 last:border-b-0 ${
                          idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                        }`}
                      >
                        <td className="px-4 font-mono text-xs font-semibold text-[#1E3A8A] dark:text-[#93C5FD]">
                          {sub.id}
                        </td>
                        <td className="px-4 text-xs font-semibold text-[#0F172A] dark:text-white">
                          {sub.name}
                        </td>
                        <td className="px-4 text-xs text-[#475569] dark:text-slate-300">
                          {facName}
                        </td>
                        <td className="px-4 text-xs text-[#475569] dark:text-slate-300">
                          {sub.semester} · Sec {sub.section}
                        </td>
                        <td className="px-4 font-mono text-xs font-semibold text-right text-[#0F172A] dark:text-white tabular-nums">
                          {sub.plannedClasses}
                        </td>
                        <td className="px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubjectKey(`${sub.id}::${sub.section}`);
                              setSubId(sub.id);
                              setSubName(sub.name);
                              setSubFacultyId(sub.facultyId);
                              setSubSemester(sub.semester);
                              setSubSection(sub.section);
                              setSubPlanned(String(sub.plannedClasses));
                            }}
                            className="min-h-[44px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSubject(sub.id, sub.section)
                            }
                            className="min-h-[44px] px-3 py-1.5 rounded border border-[#FECACA] dark:border-red-900 text-xs font-semibold text-[#B91C1C] dark:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-950/40 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
