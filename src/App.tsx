import React, { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  KeyRound,
  LogOut,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Users,
  CalendarCheck,
  Upload,
  Database,
  FileText,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceSession,
  AuthSession,
  ErpDatabase,
} from './types/erp';
import {
  createEmptyDatabase,
  generateMassiveDatabase,
  loadDemoDatabaseFromJson,
  STORAGE_KEY,
} from './data/seedData';
import { getStudentOverallStats } from './utils/attendanceMath';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AttendanceCharts } from './components/AttendanceCharts';
import { DefaulterReportsView } from './components/DefaulterReportsView';
import { AdminManagementView } from './components/AdminManagementView';
import { FacultyAttendanceView } from './components/FacultyAttendanceView';
import { StudentPortalView } from './components/StudentPortalView';
import { DocumentImportView } from './components/DocumentImportView';
import { PublishedNoticePanel } from './components/PublishedNoticePanel';
import { motion } from 'motion/react';

type AdminTab = 'DASHBOARD' | 'REPORTS' | 'IMPORT' | 'MANAGE';
type FacultyTab = 'MARK' | 'REPORTS' | 'IMPORT' | 'CHARTS';

export default function App() {
  const [db, setDb] = useState<ErpDatabase | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('rgmcet_theme') === 'dark';
  });

  const [adminTab, setAdminTab] = useState<AdminTab>('DASHBOARD');
  const [facultyTab, setFacultyTab] = useState<FacultyTab>('MARK');
  const [changePwOpen, setChangePwOpen] = useState<boolean>(false);

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('rgmcet_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('rgmcet_theme', 'light');
    }
  }, [darkMode]);

  // Load or seed database from demo-data.json only if store is empty
  useEffect(() => {
    let mounted = true;
    async function init() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ErpDatabase;
          if (parsed && parsed.admin && Array.isArray(parsed.students)) {
            if (mounted) setDb(parsed);
            return;
          }
        } catch {
          // Fall back to demo-data.json
        }
      }
      try {
        const seeded = await loadDemoDatabaseFromJson();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        if (mounted) setDb(seeded);
      } catch {
        const empty = await createEmptyDatabase();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
        if (mounted) setDb(empty);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdateDb = (nextDb: ErpDatabase) => {
    setDb(nextDb);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDb));
  };

  const handleReloadDemo = async () => {
    const seeded = await loadDemoDatabaseFromJson(db?.admin);
    handleUpdateDb(seeded);
  };

  const handleLoadMassiveData = async () => {
    const massive = await generateMassiveDatabase(db?.admin);
    handleUpdateDb(massive);
  };

  const handleDeleteAllData = async () => {
    const empty = await createEmptyDatabase(db?.admin);
    handleUpdateDb(empty);
  };

  const handlePublishNotice = () => {
    if (!db || !session) return;
    handleUpdateDb({
      ...db,
      publishedNotice: {
        publishedAt: new Date().toISOString(),
        publishedBy: session.displayName,
        academicTerm: 'B.Tech CSE(AI&ML) · II Year I-Sem 2026-27',
      },
    });
  };

  const handleUnpublishNotice = () => {
    if (!db) return;
    handleUpdateDb({
      ...db,
      publishedNotice: null,
    });
  };

  const handleSaveSession = (newSess: AttendanceSession) => {
    if (!db) return;
    const exists = db.sessions.some((s) => s.id === newSess.id);
    const nextSessions = exists
      ? db.sessions.map((s) => (s.id === newSess.id ? newSess : s))
      : [...db.sessions, newSess];
    handleUpdateDb({ ...db, sessions: nextSessions });
  };

  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] text-sm font-medium text-[#475569] dark:text-slate-300">
        Loading RGMCET Attendance Portal...
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        db={db}
        onLogin={(s) => {
          setSession(s);
          setAdminTab('DASHBOARD');
          setFacultyTab('MARK');
        }}
        onUpdateDb={handleUpdateDb}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />
    );
  }

  // Compute Admin Dashboard KPIs
  const studentStatsList = db.students.map((stu) => ({
    student: stu,
    metrics: getStudentOverallStats(stu, db.subjects, db.sessions),
  }));
  const totalStudents = studentStatsList.length;
  const regularCount = studentStatsList.filter(
    (item) => item.metrics.category === 'REGULAR'
  ).length;
  const condonationCount = studentStatsList.filter(
    (item) => item.metrics.category === 'CONDONATION'
  ).length;
  const detainedCount = studentStatsList.filter(
    (item) => item.metrics.category === 'DETAINED'
  ).length;
  const defaulterCount = condonationCount + detainedCount;

  const percentages = studentStatsList.map((item) => item.metrics.percentage);
  const avgAttendance =
    percentages.length > 0
      ? percentages.reduce((a, b) => a + b, 0) / percentages.length
      : 0;
  const highestAttendance =
    percentages.length > 0 ? Math.max(...percentages) : 0;
  const lowestAttendance =
    percentages.length > 0 ? Math.min(...percentages) : 0;

  // Faculty-scoped data for charts
  const facultySubjects =
    session.role === 'FACULTY'
      ? db.subjects.filter((s) => s.facultyId === session.userId)
      : [];
  const facultySections = new Set(facultySubjects.map((s) => s.section));
  const facultyStudents = db.students.filter((st) =>
    facultySections.has(st.section)
  );
  const facultySessions = db.sessions.filter((sess) =>
    facultySubjects.some(
      (sub) => sub.id === sess.subjectId && sub.section === sess.section
    )
  );

  // Logged-in Student
  const currentStudent =
    session.role === 'STUDENT'
      ? db.students.find((s) => s.id === session.userId) || null
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F1F5F9]">
      {/* Demo Data Banner */}
      {db.isDemoData && (
        <div className="bg-[#1E3A8A] text-white text-center text-xs font-semibold py-1.5 px-4">
          Demo data - fake students
        </div>
      )}

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-[#CBD5E1] dark:border-slate-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-bold tracking-tight text-[#1E3A8A] dark:text-[#93C5FD] truncate">
              Attendance Defaulter List Generator — RGMCET
            </div>
            <div className="text-xs text-[#475569] dark:text-slate-400 truncate">
              B.Tech CSE(AI&amp;ML), II Year I-Sem 2026-27 · {session.displayName} ({session.role})
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="min-h-[44px] px-3 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {darkMode ? 'Light' : 'Dark'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChangePwOpen(true)}
              className="min-h-[44px] px-3 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Change Password</span>
            </button>

            <button
              type="button"
              onClick={() => setSession(null)}
              className="min-h-[44px] px-3.5 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Role Navigation Bar */}
        {session.role === 'ADMIN' && (
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-2.5 flex flex-wrap gap-1.5">
            {(
              [
                { id: 'DASHBOARD', label: 'Dashboard & Charts', icon: BarChart3 },
                { id: 'REPORTS', label: 'Defaulter & Category Reports', icon: FileSpreadsheet },
                { id: 'IMPORT', label: 'Document Import', icon: Upload },
                { id: 'MANAGE', label: 'Manage Students, Faculty & Subjects', icon: Users },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAdminTab(id)}
                className={`min-h-[44px] px-3.5 py-2 rounded text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
                  adminTab === id
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        {session.role === 'FACULTY' && (
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-2.5 flex flex-wrap gap-1.5">
            {(
              [
                { id: 'MARK', label: 'Mark Attendance', icon: CalendarCheck },
                { id: 'REPORTS', label: 'Defaulter & Category Reports', icon: FileSpreadsheet },
                { id: 'IMPORT', label: 'Document Import', icon: Upload },
                { id: 'CHARTS', label: 'Section Charts', icon: BarChart3 },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFacultyTab(id)}
                className={`min-h-[44px] px-3.5 py-2 rounded text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
                  facultyTab === id
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-[#F1F5F9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ADMIN PORTAL */}
        {session.role === 'ADMIN' && (
          <>
            {adminTab === 'DASHBOARD' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Alert Banner if any defaulters exist */}
                {defaulterCount > 0 && (
                  <div
                    role="alert"
                    className="p-4 rounded-lg bg-[#FEF2F2] dark:bg-red-950/50 border border-[#FECACA] dark:border-red-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#B91C1C] dark:text-red-200">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>
                        <strong>Compliance Alert:</strong>{' '}
                        <span className="font-mono font-bold">
                          {defaulterCount}
                        </span>{' '}
                        {defaulterCount === 1 ? 'student is' : 'students are'}{' '}
                        below 75% (
                        <strong className="font-mono">{condonationCount}</strong>{' '}
                        Condonation,{' '}
                        <strong className="font-mono">{detainedCount}</strong>{' '}
                        Detained).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdminTab('REPORTS')}
                      className="min-h-[44px] px-3.5 py-1.5 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold"
                    >
                      View Defaulter List
                    </button>
                  </div>
                )}

                {/* Quick Actions: CSV/PDF Import, Report Generation & Massive Data Controls */}
                <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminTab('IMPORT')}
                      className="min-h-[44px] px-3.5 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import CSV / Excel / PDF / Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('REPORTS')}
                      className="min-h-[44px] px-3.5 py-2 rounded border border-[#1E3A8A] dark:border-blue-500 bg-[#EFF6FF] dark:bg-blue-950/40 text-[#1E3A8A] dark:text-blue-300 hover:bg-[#DBEAFE] dark:hover:bg-blue-900/50 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Defaulter &amp; Category Reports</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const doc = new jsPDF({ orientation: 'landscape' });
                        doc.setFontSize(14);
                        doc.text(
                          'RGMCET — Executive Attendance & Defaulter Summary',
                          14,
                          16
                        );
                        doc.setFontSize(10);
                        doc.text(
                          `Total: ${totalStudents} | Regular: ${regularCount} | Condonation: ${condonationCount} | Detained: ${detainedCount} | Avg: ${avgAttendance.toFixed(2)}%`,
                          14,
                          24
                        );
                        const defaulters = studentStatsList
                          .filter((item) => item.metrics.isDefaulter)
                          .map((item) => [
                            item.student.registerNumber,
                            item.student.name,
                            item.student.section,
                            `${item.metrics.attended}/${item.metrics.conducted}`,
                            `${item.metrics.percentage.toFixed(2)}%`,
                            `${item.metrics.shortagePercent.toFixed(2)}%`,
                            item.metrics.category,
                          ]);
                        autoTable(doc, {
                          startY: 30,
                          head: [
                            [
                              'Register No',
                              'Student Name',
                              'Section',
                              'Attended',
                              'Attendance %',
                              'Shortage %',
                              'Category',
                            ],
                          ],
                          body: defaulters,
                        });
                        doc.save('RGMCET_Executive_Attendance_Report.pdf');
                      }}
                      className="min-h-[44px] px-3.5 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Export Executive PDF</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadMassiveData}
                      className="min-h-[44px] px-3.5 py-2 rounded border border-[#2563EB] dark:border-blue-500 bg-[#EFF6FF] dark:bg-blue-950/40 text-[#1E3A8A] dark:text-blue-300 hover:bg-[#DBEAFE] dark:hover:bg-blue-900/50 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Database className="w-4 h-4" />
                      <span>+ Add Massive Data (200 Students)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReloadDemo}
                      className="min-h-[44px] px-3 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reload Demo (48)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAllData}
                      className="min-h-[44px] px-3.5 py-2 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete All Data</span>
                    </button>
                  </div>
                </div>

                {/* 7 Dashboard Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
                  <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#1E3A8A] rounded-lg p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
                      Total Students
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                      {totalStudents}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#10B981] rounded-lg p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
                      Regular (≥ 75%)
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold text-[#047857] dark:text-emerald-400 tabular-nums">
                      {regularCount}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#F59E0B] rounded-lg p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
                      Condonation
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold text-[#B45309] dark:text-amber-400 tabular-nums">
                      {condonationCount}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#EF4444] rounded-lg p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
                      Detained (&lt; 65%)
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold text-[#B91C1C] dark:text-red-400 tabular-nums">
                      {detainedCount}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#2563EB] rounded-lg p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
                      Average %
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                      {avgAttendance.toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#10B981] rounded-lg p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
                      Highest %
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold text-[#047857] dark:text-emerald-400 tabular-nums">
                      {highestAttendance.toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#EF4444] rounded-lg p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
                      Lowest %
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold text-[#B91C1C] dark:text-red-400 tabular-nums">
                      {lowestAttendance.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* 5 Charts + Pie & Bar Graphs */}
                <AttendanceCharts
                  students={db.students}
                  subjects={db.subjects}
                  sessions={db.sessions}
                  scopeLabel="RGMCET B.Tech CSE(AI&ML) · II Year I-Sem 2026-27 (Sections A–D)"
                />

                {/* Official Published Condonation & Detained Register (All Subjects & Classes Average) */}
                <PublishedNoticePanel
                  db={db}
                  canPublish={true}
                  publisherName={session.displayName}
                  onPublish={handlePublishNotice}
                  onUnpublish={handleUnpublishNotice}
                />
              </motion.div>
            )}

            {adminTab === 'REPORTS' && (
              <DefaulterReportsView
                students={db.students}
                subjects={db.subjects}
                sessions={db.sessions}
                faculty={db.faculty}
              />
            )}

            {adminTab === 'IMPORT' && (
              <DocumentImportView db={db} onUpdateDb={handleUpdateDb} />
            )}

            {adminTab === 'MANAGE' && (
              <AdminManagementView
                db={db}
                onUpdateDb={handleUpdateDb}
                onReloadDemo={handleReloadDemo}
                onLoadMassiveData={handleLoadMassiveData}
                onDeleteAllData={handleDeleteAllData}
              />
            )}
          </>
        )}

        {/* FACULTY PORTAL */}
        {session.role === 'FACULTY' && (
          <>
            {facultyTab === 'MARK' && (
              <FacultyAttendanceView
                facultyId={session.userId}
                subjects={db.subjects}
                students={db.students}
                sessions={db.sessions}
                onSaveSession={handleSaveSession}
              />
            )}

            {facultyTab === 'REPORTS' && (
              <DefaulterReportsView
                students={db.students}
                subjects={db.subjects}
                sessions={db.sessions}
                faculty={db.faculty}
                restrictedFacultyId={session.userId}
              />
            )}

            {facultyTab === 'IMPORT' && (
              <DocumentImportView
                db={db}
                onUpdateDb={handleUpdateDb}
                restrictedFacultyId={session.userId}
              />
            )}

            {facultyTab === 'CHARTS' && (
              <AttendanceCharts
                students={facultyStudents}
                subjects={facultySubjects}
                sessions={facultySessions}
                scopeLabel={`Assigned Sections (${
                  Array.from(facultySections).join(', ') || 'None'
                })`}
              />
            )}
          </>
        )}

        {/* STUDENT PORTAL */}
        {session.role === 'STUDENT' && currentStudent && (
          <StudentPortalView
            student={currentStudent}
            subjects={db.subjects}
            sessions={db.sessions}
            faculty={db.faculty}
            publishedNotice={db.publishedNotice}
          />
        )}
      </main>

      <ChangePasswordModal
        isOpen={changePwOpen}
        onClose={() => setChangePwOpen(false)}
        session={session}
        db={db}
        onUpdateDb={handleUpdateDb}
      />
    </div>
  );
}
