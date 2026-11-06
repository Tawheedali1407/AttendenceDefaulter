import React, { useState } from 'react';
import { Download, FileText, Filter } from 'lucide-react';
import {
  AttendanceCategory,
  AttendanceSession,
  FacultyUser,
  StudentUser,
  SubjectItem,
} from '../types/erp';
import {
  calculateAttendanceMetrics,
  getStudentOverallStats,
  getStudentSubjectStats,
} from '../utils/attendanceMath';
import { exportToCsv, exportToPdf } from '../utils/exportUtils';

type ReportType =
  | 'SUBJECT_SECTION'
  | 'CLASS_WISE'
  | 'STUDENT_WISE'
  | 'MONTHLY'
  | 'FINAL'
  | 'CATEGORY_LIST';

interface DefaulterReportsViewProps {
  students: StudentUser[];
  subjects: SubjectItem[];
  sessions: AttendanceSession[];
  faculty: FacultyUser[];
  restrictedFacultyId?: string;
}

export const DefaulterReportsView: React.FC<DefaulterReportsViewProps> = ({
  students,
  subjects,
  sessions,
  faculty,
  restrictedFacultyId,
}) => {
  const visibleSubjects = restrictedFacultyId
    ? subjects.filter((s) => s.facultyId === restrictedFacultyId)
    : subjects;

  const [reportType, setReportType] = useState<ReportType>('SUBJECT_SECTION');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    visibleSubjects[0]?.id || ''
  );
  const [selectedSection, setSelectedSection] = useState<string>(
    visibleSubjects[0]?.section || 'ALL'
  );
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    sessions[0]?.date.slice(0, 7) || '2026-10'
  );
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | AttendanceCategory
  >('ALL');
  const [defaultersOnly, setDefaultersOnly] = useState<boolean>(true);

  const availableSections = ['A', 'B', 'C', 'D'];
  const availableBranches = Array.from(
    new Set(students.map((s) => s.branch))
  ).sort();
  const availableMonths = Array.from(
    new Set(sessions.map((s) => s.date.slice(0, 7)))
  ).sort();

  const getFacultyName = (facId: string) =>
    faculty.find((f) => f.id === facId)?.name || 'Unassigned';

  const formatRecovery = (
    isDefaulter: boolean,
    classesNeeded: number,
    remainingClasses: number,
    isFeasible: boolean,
    bestReachable: number
  ) => {
    if (!isDefaulter) return 'Regular (≥ 75%)';
    if (isFeasible) {
      return `Feasible: Attend ${classesNeeded} of ${remainingClasses} rem.`;
    }
    return `Not Feasible (Max ${bestReachable.toFixed(2)}%)`;
  };

  const scopedStudents = restrictedFacultyId
    ? students.filter((st) =>
        visibleSubjects.some((sub) => sub.section === st.section)
      )
    : students;

  // Category counts for Category List summary
  const allOverall = scopedStudents.map((st) => ({
    st,
    m: getStudentOverallStats(st, visibleSubjects, sessions),
  }));
  const catCounts = {
    REGULAR: allOverall.filter((x) => x.m.category === 'REGULAR').length,
    CONDONATION: allOverall.filter((x) => x.m.category === 'CONDONATION').length,
    DETAINED: allOverall.filter((x) => x.m.category === 'DETAINED').length,
  };

  let reportTitle = '';
  let reportSubtitle = '';
  let headers: string[] = [];
  let rows: (string | number)[][] = [];

  if (reportType === 'SUBJECT_SECTION') {
    const sub =
      visibleSubjects.find(
        (s) =>
          s.id === selectedSubjectId &&
          (selectedSection === 'ALL' || s.section === selectedSection)
      ) || visibleSubjects[0];

    reportTitle = sub
      ? `Subject & Section Report — ${sub.id} (${sub.name}) · Sec ${sub.section}`
      : 'Subject & Section Report';
    reportSubtitle = sub
      ? `Faculty: ${getFacultyName(sub.facultyId)} · Planned: ${sub.plannedClasses} classes`
      : 'No subject selected';

    headers = [
      'Register No',
      'Student Name',
      'Section',
      'Planned',
      'Conducted',
      'Attended',
      'Attendance %',
      'Category',
      'Shortage %',
      'Classes Needed',
      'Recovery Status',
    ];

    if (sub) {
      const secStudents = students.filter((st) => st.section === sub.section);
      const computed = secStudents
        .map((st) => ({
          st,
          m: getStudentSubjectStats(st.id, sub, sessions),
        }))
        .filter((item) => (!defaultersOnly ? true : item.m.isDefaulter));

      rows = computed.map(({ st, m }) => [
        st.registerNumber,
        st.name,
        st.section,
        m.planned,
        m.conducted,
        m.attended,
        `${m.percentage.toFixed(2)}%`,
        m.category,
        `${m.shortagePercent.toFixed(2)}%`,
        m.classesNeeded,
        formatRecovery(
          m.isDefaulter,
          m.classesNeeded,
          m.remainingClasses,
          m.isRecoveryFeasible,
          m.bestReachablePercent
        ),
      ]);
    }
  } else if (reportType === 'CLASS_WISE') {
    reportTitle = `Class-Wise Defaulter Report (${
      selectedBranch === 'ALL' ? 'All Branches' : selectedBranch
    } · ${selectedSection === 'ALL' ? 'All Sections' : `Sec ${selectedSection}`})`;
    reportSubtitle = 'Aggregated across assigned subjects per class';

    headers = [
      'Register No',
      'Student Name',
      'Branch',
      'Year',
      'Section',
      'Conducted',
      'Attended',
      'Attendance %',
      'Category',
      'Shortage %',
      'Classes Needed',
    ];

    const filteredStudents = scopedStudents.filter(
      (st) =>
        (selectedBranch === 'ALL' || st.branch === selectedBranch) &&
        (selectedSection === 'ALL' || st.section === selectedSection)
    );

    rows = filteredStudents
      .map((st) => ({
        st,
        m: getStudentOverallStats(st, visibleSubjects, sessions),
      }))
      .filter((item) => (!defaultersOnly ? true : item.m.isDefaulter))
      .map(({ st, m }) => [
        st.registerNumber,
        st.name,
        st.branch,
        st.year,
        st.section,
        m.conducted,
        m.attended,
        `${m.percentage.toFixed(2)}%`,
        m.category,
        `${m.shortagePercent.toFixed(2)}%`,
        m.classesNeeded,
      ]);
  } else if (reportType === 'STUDENT_WISE') {
    reportTitle = 'Student-Wise Overall Attendance & Recovery Report';
    reportSubtitle = 'Cumulative attendance and 75% recovery feasibility';

    headers = [
      'Register No',
      'Student Name',
      'Class',
      'Planned',
      'Conducted',
      'Attended',
      'Attendance %',
      'Category',
      'Shortage %',
      'Classes Needed',
      'Recovery Feasibility',
    ];

    rows = allOverall
      .filter((item) => (!defaultersOnly ? true : item.m.isDefaulter))
      .map(({ st, m }) => [
        st.registerNumber,
        st.name,
        `${st.branch} ${st.year} - ${st.section}`,
        m.planned,
        m.conducted,
        m.attended,
        `${m.percentage.toFixed(2)}%`,
        m.category,
        `${m.shortagePercent.toFixed(2)}%`,
        m.classesNeeded,
        formatRecovery(
          m.isDefaulter,
          m.classesNeeded,
          m.remainingClasses,
          m.isRecoveryFeasible,
          m.bestReachablePercent
        ),
      ]);
  } else if (reportType === 'MONTHLY') {
    reportTitle = `Monthly Attendance & Defaulter Report (${selectedMonth})`;
    reportSubtitle = 'Filtered by calendar month sessions';

    headers = [
      'Register No',
      'Student Name',
      'Section',
      'Month Conducted',
      'Month Attended',
      'Month %',
      'Category',
      'Shortage %',
      'Classes Needed',
    ];

    const monthSessions = sessions.filter((s) =>
      s.date.startsWith(selectedMonth)
    );

    rows = scopedStudents
      .map((st) => {
        const secSubs = visibleSubjects.filter((s) => s.section === st.section);
        const relevantSess = monthSessions.filter(
          (sess) =>
            sess.section === st.section &&
            secSubs.some((sub) => sub.id === sess.subjectId)
        );
        const conducted = relevantSess.length;
        const attended = relevantSess.filter((sess) =>
          sess.presentStudentIds.includes(st.id)
        ).length;
        const m = calculateAttendanceMetrics(attended, conducted, conducted);
        return { st, m };
      })
      .filter((item) => (!defaultersOnly ? true : item.m.isDefaulter))
      .map(({ st, m }) => [
        st.registerNumber,
        st.name,
        st.section,
        m.conducted,
        m.attended,
        `${m.percentage.toFixed(2)}%`,
        m.category,
        `${m.shortagePercent.toFixed(2)}%`,
        m.classesNeeded,
      ]);
  } else if (reportType === 'CATEGORY_LIST') {
    reportTitle = `Category List (${
      selectedCategory === 'ALL' ? 'All Categories' : selectedCategory
    })`;
    reportSubtitle = `Regular (≥75%): ${catCounts.REGULAR} · Condonation (65–74.9%): ${catCounts.CONDONATION} · Detained (<65%): ${catCounts.DETAINED}`;

    headers = [
      'Register No',
      'Student Name',
      'Branch & Sec',
      'Conducted',
      'Attended',
      'Attendance %',
      'Category',
      'Shortage %',
      'Classes Needed',
    ];

    rows = allOverall
      .filter((item) =>
        selectedCategory === 'ALL' ? true : item.m.category === selectedCategory
      )
      .sort((a, b) => a.m.percentage - b.m.percentage)
      .map(({ st, m }) => [
        st.registerNumber,
        st.name,
        `${st.branch} · Sec ${st.section}`,
        m.conducted,
        m.attended,
        `${m.percentage.toFixed(2)}%`,
        m.category,
        `${m.shortagePercent.toFixed(2)}%`,
        m.classesNeeded,
      ]);
  } else {
    // FINAL
    reportTitle = 'Final Consolidated Defaulter Register (< 75% Attendance)';
    reportSubtitle = 'RGMCET Official Examination Eligibility & Shortage List';

    headers = [
      'Register No',
      'Student Name',
      'Branch & Sec',
      'Conducted',
      'Attended',
      'Attendance %',
      'Category',
      'Shortage %',
      'Classes Needed',
      'Recovery / Best Reachable',
    ];

    rows = allOverall
      .filter((item) => item.m.isDefaulter)
      .sort((a, b) => a.m.percentage - b.m.percentage)
      .map(({ st, m }) => [
        st.registerNumber,
        st.name,
        `${st.branch} · Sec ${st.section}`,
        m.conducted,
        m.attended,
        `${m.percentage.toFixed(2)}%`,
        m.category,
        `${m.shortagePercent.toFixed(2)}%`,
        m.classesNeeded,
        formatRecovery(
          m.isDefaulter,
          m.classesNeeded,
          m.remainingClasses,
          m.isRecoveryFeasible,
          m.bestReachablePercent
        ),
      ]);
  }

  const handleExportCsv = () => {
    exportToCsv(`RGMCET_${reportType}_Report.csv`, headers, rows);
  };

  const handleExportPdf = () => {
    exportToPdf(
      reportTitle,
      reportSubtitle,
      headers,
      rows,
      `RGMCET_${reportType}_Report.pdf`
    );
  };

  return (
    <div className="space-y-5">
      {/* Report Type Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#F1F5F9] dark:bg-slate-800 rounded">
            {(
              [
                { id: 'SUBJECT_SECTION', label: 'Subject & Section' },
                { id: 'CLASS_WISE', label: 'Class-Wise' },
                { id: 'STUDENT_WISE', label: 'Student-Wise' },
                { id: 'MONTHLY', label: 'Monthly' },
                { id: 'CATEGORY_LIST', label: 'Category List' },
                { id: 'FINAL', label: 'Final Defaulter List' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportType(tab.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                  reportType === tab.id
                    ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-[#93C5FD] border border-[#CBD5E1] dark:border-slate-700'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[42px] px-3.5 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="min-h-[42px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Category Summary Strip when on CATEGORY_LIST */}
        {reportType === 'CATEGORY_LIST' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 text-xs">
            <div className="p-3 rounded bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800 flex items-center justify-between">
              <span className="font-semibold text-[#047857] dark:text-emerald-300">
                Regular (≥ 75%)
              </span>
              <span className="font-mono font-bold text-[#047857] dark:text-emerald-300 tabular-nums">
                {catCounts.REGULAR}
              </span>
            </div>
            <div className="p-3 rounded bg-[#FFFBEB] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800 flex items-center justify-between">
              <span className="font-semibold text-[#B45309] dark:text-amber-300">
                Condonation (65% – 74.9%)
              </span>
              <span className="font-mono font-bold text-[#B45309] dark:text-amber-300 tabular-nums">
                {catCounts.CONDONATION}
              </span>
            </div>
            <div className="p-3 rounded bg-[#FEF2F2] dark:bg-red-950/40 border border-[#FECACA] dark:border-red-800 flex items-center justify-between">
              <span className="font-semibold text-[#B91C1C] dark:text-red-300">
                Detained (&lt; 65%)
              </span>
              <span className="font-mono font-bold text-[#B91C1C] dark:text-red-300 tabular-nums">
                {catCounts.DETAINED}
              </span>
            </div>
          </div>
        )}

        {/* Contextual Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {reportType === 'SUBJECT_SECTION' && (
            <>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedSubjectId(nextId);
                  const found = visibleSubjects.find((s) => s.id === nextId);
                  if (found) setSelectedSection(found.section);
                }}
                className="h-[40px] px-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              >
                {visibleSubjects.map((sub) => (
                  <option key={`${sub.id}-${sub.section}`} value={sub.id}>
                    {sub.id} — {sub.name} (Sec {sub.section})
                  </option>
                ))}
              </select>

              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="h-[40px] px-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              >
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </>
          )}

          {reportType === 'CLASS_WISE' && (
            <>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-[40px] px-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Branches</option>
                {availableBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="h-[40px] px-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              >
                <option value="ALL">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </>
          )}

          {reportType === 'MONTHLY' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-[40px] px-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {reportType === 'CATEGORY_LIST' && (
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value as 'ALL' | AttendanceCategory
                )
              }
              className="h-[40px] px-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
            >
              <option value="ALL">All Categories</option>
              <option value="REGULAR">Regular (≥ 75%)</option>
              <option value="CONDONATION">Condonation (65% – 74.9%)</option>
              <option value="DETAINED">Detained (&lt; 65%)</option>
            </select>
          )}

          {reportType !== 'FINAL' && reportType !== 'CATEGORY_LIST' && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0F172A] dark:text-slate-200 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={defaultersOnly}
                onChange={(e) => setDefaultersOnly(e.target.checked)}
                className="w-4 h-4 rounded border-[#CBD5E1] text-[#1E3A8A]"
              />
              Show Defaulters Only (&lt; 75%)
            </label>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              {reportTitle}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              {reportSubtitle}
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-[#1E3A8A] dark:text-[#93C5FD] tabular-nums">
            {rows.length} {rows.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-10 border-b border-[#E2E8F0] dark:border-slate-700">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-10 text-center text-xs text-[#64748B] dark:text-slate-400"
                  >
                    No matching records found for the selected filter.
                  </td>
                </tr>
              ) : (
                rows.map((row, rIdx) => {
                  const isDetained = row.some((c) => c === 'DETAINED');
                  return (
                    <tr
                      key={rIdx}
                      className={`h-11 border-b border-[#E2E8F0] dark:border-slate-800 last:border-b-0 ${
                        rIdx % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                      } ${
                        isDetained
                          ? 'hover:bg-[#FEF2F2] dark:hover:bg-red-950/20'
                          : 'hover:bg-[#F1F5F9] dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {row.map((cell, cIdx) => {
                        const str = String(cell);
                        const isCategoryBadge =
                          str === 'DETAINED' ||
                          str === 'CONDONATION' ||
                          str === 'REGULAR';
                        return (
                          <td
                            key={cIdx}
                            className={`px-3.5 text-xs whitespace-nowrap ${
                              cIdx === 0 ||
                              str.includes('%') ||
                              typeof cell === 'number'
                                ? 'font-mono tabular-nums'
                                : ''
                            } ${
                              cIdx === 0
                                ? 'font-semibold text-[#1E3A8A] dark:text-[#93C5FD]'
                                : 'text-[#0F172A] dark:text-slate-200'
                            }`}
                          >
                            {isCategoryBadge ? (
                              <span
                                className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] ${
                                  str === 'DETAINED'
                                    ? 'bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300 border border-[#FECACA] dark:border-red-800'
                                    : str === 'CONDONATION'
                                    ? 'bg-[#FFFBEB] dark:bg-amber-950 text-[#B45309] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800'
                                    : 'bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
                                }`}
                              >
                                {str}
                              </span>
                            ) : (
                              cell
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
