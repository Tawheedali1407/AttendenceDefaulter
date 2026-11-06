import React, { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Calendar,
  Megaphone,
} from 'lucide-react';
import {
  AttendanceSession,
  FacultyUser,
  PublishedNotice,
  StudentUser,
  SubjectItem,
} from '../types/erp';
import {
  getStudentOverallStats,
  getStudentSubjectStats,
} from '../utils/attendanceMath';
import { CategoryBadge } from './CategoryBadge';

interface StudentPortalViewProps {
  student: StudentUser;
  subjects: SubjectItem[];
  sessions: AttendanceSession[];
  faculty: FacultyUser[];
  publishedNotice?: PublishedNotice | null;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  student,
  subjects,
  sessions,
  faculty,
  publishedNotice,
}) => {
  const [historySubjectFilter, setHistorySubjectFilter] =
    useState<string>('ALL');

  const mySubjects = subjects.filter((s) => s.section === student.section);
  const overall = getStudentOverallStats(student, subjects, sessions);

  const subjectRows = mySubjects.map((sub) => ({
    subject: sub,
    facultyName:
      faculty.find((f) => f.id === sub.facultyId)?.name || 'Unassigned',
    metrics: getStudentSubjectStats(student.id, sub, sessions),
  }));

  const anyDetained =
    overall.category === 'DETAINED' ||
    subjectRows.some((r) => r.metrics.category === 'DETAINED');
  const anyCondonation =
    overall.category === 'CONDONATION' ||
    subjectRows.some((r) => r.metrics.category === 'CONDONATION');

  // Date-wise history
  const historyRows = sessions
    .filter(
      (s) =>
        s.section === student.section &&
        (historySubjectFilter === 'ALL' || s.subjectId === historySubjectFilter)
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => {
      const sub = mySubjects.find((subItem) => subItem.id === s.subjectId);
      const present = s.presentStudentIds.includes(student.id);
      return {
        id: s.id,
        date: s.date,
        subjectId: s.subjectId,
        subjectName: sub?.name || s.subjectId,
        present,
      };
    });

  return (
    <div className="space-y-6">
      {/* Official Published Condonation & Detained Notice */}
      {publishedNotice && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <div className="font-bold uppercase tracking-wider text-blue-100">
                Official Published Notice · {publishedNotice.academicTerm}
              </div>
              <div className="text-sm font-semibold">
                All-Subjects &amp; Classes Average Attendance:{' '}
                <span className="font-mono font-bold">
                  {overall.percentage.toFixed(2)}%
                </span>{' '}
                ({overall.attended} / {overall.conducted} classes)
              </div>
              <div className="text-blue-100">
                Published on {new Date(publishedNotice.publishedAt).toLocaleString()} by{' '}
                {publishedNotice.publishedBy}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-100">
              Published Status:
            </span>
            <CategoryBadge category={overall.category} />
          </div>
        </div>
      )}

      {/* Stronger Crimson Alert Banner when below 65% (DETAINED) */}
      {anyDetained ? (
        <div
          role="alert"
          className="p-4 rounded-lg bg-[#FEF2F2] dark:bg-red-950/60 border-2 border-[#EF4444] flex items-start gap-3"
        >
          <Ban className="w-5 h-5 text-[#B91C1C] dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#B91C1C] dark:text-red-200 space-y-1">
            <div className="font-bold uppercase tracking-wide">
              Critical Alert: Detained Bracket (&lt; 65% Attendance)
            </div>
            {overall.category === 'DETAINED' ? (
              <p>
                Your overall attendance is{' '}
                <strong className="font-mono">
                  {overall.percentage.toFixed(1)}%
                </strong>
                , which is below the 65% minimum condonation limit (Shortage:{' '}
                <strong className="font-mono">
                  {overall.shortagePercent.toFixed(1)}%
                </strong>
                ).{' '}
                {overall.conducted > 0 && (
                  <>
                    You need{' '}
                    <strong className="font-mono">
                      {overall.classesNeeded}
                    </strong>{' '}
                    more classes out of{' '}
                    <strong className="font-mono">
                      {overall.remainingClasses}
                    </strong>{' '}
                    remaining to reach 75%.{' '}
                    {overall.isRecoveryFeasible
                      ? 'Recovery is feasible if you attend all required classes.'
                      : `Full recovery is not feasible; best reachable attendance is ${overall.bestReachablePercent.toFixed(
                          2
                        )}%.`}
                  </>
                )}
              </p>
            ) : (
              <p>
                One or more of your subjects has fallen below 65% (Detained
                bracket). Immediate attendance recovery is required.
              </p>
            )}
          </div>
        </div>
      ) : anyCondonation ? (
        <div
          role="alert"
          className="p-4 rounded-lg bg-[#FFFBEB] dark:bg-amber-950/50 border border-[#F59E0B] flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-[#B45309] dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#B45309] dark:text-amber-200 space-y-1">
            <div className="font-bold">
              Condonation Warning — Below 75% Attendance (65% to 74.9%)
            </div>
            <p>
              Your overall attendance is{' '}
              <strong className="font-mono">
                {overall.percentage.toFixed(2)}%
              </strong>{' '}
              (Shortage:{' '}
              <strong className="font-mono">
                {overall.shortagePercent.toFixed(2)}%
              </strong>
              ).{' '}
              {overall.conducted > 0 && (
                <>
                  Attend{' '}
                  <strong className="font-mono">{overall.classesNeeded}</strong>{' '}
                  of{' '}
                  <strong className="font-mono">
                    {overall.remainingClasses}
                  </strong>{' '}
                  remaining classes to return to Regular (≥ 75%) standing.
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800 flex items-center gap-3 text-xs sm:text-sm text-[#047857] dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            <strong>Regular Standing:</strong> Your overall attendance is{' '}
            <strong className="font-mono">
              {overall.percentage.toFixed(2)}%
            </strong>{' '}
            (≥ 75% required).
          </span>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#1E3A8A] rounded-lg p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
            Overall Attendance
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
            {overall.percentage.toFixed(2)}%
          </div>
          <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            {overall.conducted > 0
              ? `${overall.attended} / ${overall.conducted} conducted`
              : 'Imported overall %'}
          </div>
        </div>

        <div
          className={`bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] rounded-lg p-4 ${
            overall.category === 'DETAINED'
              ? 'border-t-[#EF4444]'
              : overall.category === 'CONDONATION'
              ? 'border-t-[#F59E0B]'
              : 'border-t-[#10B981]'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
            Category
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-bold uppercase tracking-[0.05em] ${
                overall.category === 'DETAINED'
                  ? 'bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300 border border-[#FECACA] dark:border-red-800'
                  : overall.category === 'CONDONATION'
                  ? 'bg-[#FFFBEB] dark:bg-amber-950 text-[#B45309] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800'
                  : 'bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
              }`}
            >
              {overall.category}
            </span>
          </div>
          <div className="text-xs text-[#64748B] dark:text-slate-400 mt-1.5">
            {overall.isDefaulter
              ? `Shortage: ${overall.shortagePercent.toFixed(2)}%`
              : 'Meets 75% rule'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#F59E0B] rounded-lg p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
            Classes Needed (75%)
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
            {overall.classesNeeded}
          </div>
          <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            {overall.remainingClasses} remaining planned
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 border-t-[3px] border-t-[#2563EB] rounded-lg p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-400">
            Recovery Outlook
          </div>
          <div className="mt-1.5 text-base font-bold text-[#0F172A] dark:text-white">
            {!overall.isDefaulter
              ? 'On Track'
              : overall.isRecoveryFeasible
              ? 'Feasible'
              : `Max ${overall.bestReachablePercent.toFixed(2)}%`}
          </div>
          <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            {!overall.isDefaulter
              ? 'No recovery needed'
              : overall.isRecoveryFeasible
              ? `Attend ${overall.classesNeeded} more`
              : 'Best reachable %'}
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50">
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
            Subject-Wise Attendance &amp; Recovery Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-10 border-b border-[#E2E8F0] dark:border-slate-700">
                <th className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                  Subject
                </th>
                <th className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                  Faculty
                </th>
                <th className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                  Attended / Conducted
                </th>
                <th className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                  Attendance %
                </th>
                <th className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                  Category
                </th>
                <th className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                  Shortage %
                </th>
                <th className="px-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                  Recovery / Best Reachable
                </th>
              </tr>
            </thead>
            <tbody>
              {subjectRows.map(({ subject, facultyName, metrics }, idx) => (
                <tr
                  key={subject.id}
                  className={`h-12 border-b border-[#E2E8F0] dark:border-slate-800 last:border-b-0 ${
                    idx % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                  }`}
                >
                  <td className="px-3.5">
                    <span className="font-mono text-xs font-semibold text-[#1E3A8A] dark:text-[#93C5FD] mr-1.5">
                      {subject.id}
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A] dark:text-white">
                      {subject.name}
                    </span>
                  </td>
                  <td className="px-3.5 text-xs text-[#475569] dark:text-slate-300">
                    {facultyName}
                  </td>
                  <td className="px-3.5 font-mono text-xs text-right text-[#0F172A] dark:text-white tabular-nums">
                    {metrics.attended} / {metrics.conducted} (Plan:{' '}
                    {metrics.planned})
                  </td>
                  <td
                    className={`px-3.5 font-mono text-xs font-bold text-right tabular-nums ${
                      metrics.category === 'DETAINED'
                        ? 'text-[#B91C1C] dark:text-red-400'
                        : metrics.category === 'CONDONATION'
                        ? 'text-[#B45309] dark:text-amber-400'
                        : 'text-[#047857] dark:text-emerald-400'
                    }`}
                  >
                    {metrics.percentage.toFixed(2)}%
                  </td>
                  <td className="px-3.5">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] ${
                        metrics.category === 'DETAINED'
                          ? 'bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300 border border-[#FECACA] dark:border-red-800'
                          : metrics.category === 'CONDONATION'
                          ? 'bg-[#FFFBEB] dark:bg-amber-950 text-[#B45309] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800'
                          : 'bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
                      }`}
                    >
                      {metrics.category}
                    </span>
                  </td>
                  <td className="px-3.5 font-mono text-xs text-right text-[#475569] dark:text-slate-300 tabular-nums">
                    {metrics.shortagePercent.toFixed(2)}%
                  </td>
                  <td className="px-3.5 text-xs text-[#0F172A] dark:text-slate-200">
                    {!metrics.isDefaulter
                      ? 'No shortage'
                      : metrics.isRecoveryFeasible
                      ? `Need ${metrics.classesNeeded} of ${metrics.remainingClasses} rem. classes`
                      : `Not feasible (Best: ${metrics.bestReachablePercent.toFixed(
                          1
                        )}%)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date-Wise Attendance History */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1E3A8A] dark:text-[#93C5FD]" />
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Date-Wise Attendance History
            </h2>
          </div>
          <select
            value={historySubjectFilter}
            onChange={(e) => setHistorySubjectFilter(e.target.value)}
            className="h-[38px] px-3 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
          >
            <option value="ALL">All Subjects</option>
            {mySubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-10 border-b border-[#E2E8F0] dark:border-slate-700">
                <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                  Date
                </th>
                <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                  Subject
                </th>
                <th className="px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                  Attendance Status
                </th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-xs text-[#64748B]"
                  >
                    No class sessions recorded yet.
                  </td>
                </tr>
              ) : (
                historyRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`h-11 border-b border-[#E2E8F0] dark:border-slate-800 last:border-b-0 ${
                      idx % 2 === 0
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                    }`}
                  >
                    <td className="px-4 font-mono text-xs font-semibold text-[#0F172A] dark:text-white tabular-nums">
                      {row.date}
                    </td>
                    <td className="px-4 text-xs text-[#475569] dark:text-slate-300">
                      <span className="font-mono font-semibold text-[#1E3A8A] dark:text-[#93C5FD] mr-1.5">
                        {row.subjectId}
                      </span>
                      {row.subjectName}
                    </td>
                    <td className="px-4">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] ${
                          row.present
                            ? 'bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
                            : 'bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300 border border-[#FECACA] dark:border-red-800'
                        }`}
                      >
                        {row.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
