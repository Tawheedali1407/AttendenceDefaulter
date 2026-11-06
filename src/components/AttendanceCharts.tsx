import React from 'react';
import {
  AttendanceSession,
  StudentUser,
  SubjectItem,
} from '../types/erp';
import {
  getStudentOverallStats,
  getStudentSubjectStats,
} from '../utils/attendanceMath';
import { CategoryBadge } from './CategoryBadge';

interface AttendanceChartsProps {
  students: StudentUser[];
  subjects: SubjectItem[];
  sessions: AttendanceSession[];
  scopeLabel?: string;
}

export const AttendanceCharts: React.FC<AttendanceChartsProps> = ({
  students,
  subjects,
  sessions,
  scopeLabel = 'All Sections & Subjects',
}) => {
  // 1. Student-wise Attendance % & 5. Category Distribution
  const studentBars = students.map((stu) => {
    const metrics = getStudentOverallStats(stu, subjects, sessions);
    return {
      label: stu.registerNumber.slice(-4),
      fullLabel: `${stu.registerNumber} (${stu.name})`,
      pct: metrics.percentage,
      category: metrics.category,
      isDefaulter: metrics.isDefaulter,
    };
  });

  const regularCount = studentBars.filter(
    (b) => b.category === 'REGULAR'
  ).length;
  const condonationCount = studentBars.filter(
    (b) => b.category === 'CONDONATION'
  ).length;
  const detainedCount = studentBars.filter(
    (b) => b.category === 'DETAINED'
  ).length;
  const totalStu = Math.max(1, studentBars.length);

  // 2. Subject-wise Attendance % & 4. Defaulters per Subject
  const subjectStats = subjects.map((sub) => {
    const secStudents = students.filter((s) => s.section === sub.section);
    const subSessions = sessions.filter(
      (s) => s.subjectId === sub.id && s.section === sub.section
    );
    let totalPct = 0;
    let defaulters = 0;
    for (const stu of secStudents) {
      const m = getStudentSubjectStats(stu.id, sub, sessions);
      totalPct += m.percentage;
      if (m.isDefaulter) defaulters++;
    }
    const avgPct =
      secStudents.length > 0 && subSessions.length > 0
        ? totalPct / secStudents.length
        : 0;
    return {
      id: sub.id,
      name: `${sub.name} (Sec ${sub.section})`,
      avgPct,
      defaulters,
      conducted: subSessions.length,
    };
  });

  // 3. Monthly Attendance %
  const monthMap = new Map<string, { attended: number; possible: number }>();
  for (const sess of sessions) {
    const sub = subjects.find(
      (s) => s.id === sess.subjectId && s.section === sess.section
    );
    if (!sub) continue;
    const secStudents = students.filter((s) => s.section === sess.section);
    const monthKey = sess.date.slice(0, 7);
    const prev = monthMap.get(monthKey) || { attended: 0, possible: 0 };
    const presentCount = sess.presentStudentIds.filter((id) =>
      secStudents.some((st) => st.id === id)
    ).length;
    monthMap.set(monthKey, {
      attended: prev.attended + presentCount,
      possible: prev.possible + secStudents.length,
    });
  }

  const monthlyData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, val]) => ({
      month,
      pct: val.possible > 0 ? (val.attended / val.possible) * 100 : 0,
    }));

  const maxDefaulters = Math.max(
    1,
    ...subjectStats.map((s) => s.defaulters)
  );

  // Section-wise stats (A, B, C, D) for Pie Chart & Vertical Bar Graph
  const sectionList = ['A', 'B', 'C', 'D'];
  const sectionColors: Record<string, string> = {
    A: '#2563EB',
    B: '#8B5CF6',
    C: '#F59E0B',
    D: '#EF4444',
  };
  const sectionStats = sectionList
    .map((sec) => {
      const secStus = studentBars.filter((_, idx) => students[idx]?.section === sec);
      const count = secStus.length;
      const avgPct =
        count > 0 ? secStus.reduce((sum, b) => sum + b.pct, 0) / count : 0;
      const defaulters = secStus.filter((b) => b.isDefaulter).length;
      return {
        section: sec,
        count,
        avgPct,
        defaulters,
        color: sectionColors[sec],
      };
    })
    .filter((s) => s.count > 0);

  // Helper for SVG Donut/Pie segments
  const buildDonutSegments = (
    items: Array<{ label: string; value: number; color: string }>
  ) => {
    const total = items.reduce((acc, i) => acc + i.value, 0);
    if (total === 0) return [];
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return items
      .filter((i) => i.value > 0)
      .map((item) => {
        const fraction = item.value / total;
        const dash = fraction * circumference;
        const seg = {
          ...item,
          pct: fraction * 100,
          dashArray: `${dash} ${circumference - dash}`,
          dashOffset: -offset,
        };
        offset += dash;
        return seg;
      });
  };

  const categoryPieSegments = buildDonutSegments([
    { label: 'Regular (≥ 75%)', value: regularCount, color: '#10B981' },
    { label: 'Condonation (65–74.99%)', value: condonationCount, color: '#F59E0B' },
    { label: 'Detained (< 65%)', value: detainedCount, color: '#EF4444' },
  ]);

  const totalSectionDefaulters = sectionStats.reduce(
    (acc, s) => acc + s.defaulters,
    0
  );
  const sectionDefaulterPieSegments = buildDonutSegments(
    sectionStats.map((s) => ({
      label: `Section ${s.section}`,
      value: s.defaulters,
      color: s.color,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
          Statistical &amp; Graphical Attendance Analytics
        </h2>
        <span className="text-xs text-[#64748B] dark:text-slate-400">
          {scopeLabel}
        </span>
      </div>

      {/* Graphical Row 1: Two SVG Pie/Donut Charts + Section Vertical Bar Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie/Donut Chart 1: Category Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Category Pie Chart
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Regular vs Condonation vs Detained
            </p>
          </div>

          <div className="my-4 flex items-center justify-center">
            {studentBars.length === 0 ? (
              <div className="py-10 text-xs text-[#64748B]">No student data</div>
            ) : (
              <svg
                viewBox="0 0 180 180"
                className="w-44 h-44"
                role="img"
                aria-label="Category Distribution Pie Chart"
              >
                <circle
                  cx="90"
                  cy="90"
                  r="64"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="26"
                  className="dark:stroke-slate-800"
                />
                <g transform="rotate(-90 90 90)">
                  {categoryPieSegments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="90"
                      cy="90"
                      r="64"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="26"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                    >
                      <title>{`${seg.label}: ${seg.value} (${seg.pct.toFixed(2)}%)`}</title>
                    </circle>
                  ))}
                </g>
                <text
                  x="90"
                  y="86"
                  textAnchor="middle"
                  className="fill-[#0F172A] dark:fill-white font-mono text-xl font-bold"
                >
                  {studentBars.length}
                </text>
                <text
                  x="90"
                  y="104"
                  textAnchor="middle"
                  className="fill-[#64748B] dark:fill-slate-400 text-[10px] font-semibold uppercase"
                >
                  Students
                </text>
              </svg>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 font-medium text-[#0F172A] dark:text-slate-200">
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                Regular (≥ 75%)
              </span>
              <span className="font-mono font-bold text-[#047857] dark:text-emerald-400 tabular-nums">
                {regularCount} ({((regularCount / totalStu) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 font-medium text-[#0F172A] dark:text-slate-200">
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                Condonation (65–74.99%)
              </span>
              <span className="font-mono font-bold text-[#B45309] dark:text-amber-400 tabular-nums">
                {condonationCount} ({((condonationCount / totalStu) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 font-medium text-[#0F172A] dark:text-slate-200">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                Detained (&lt; 65%)
              </span>
              <span className="font-mono font-bold text-[#B91C1C] dark:text-red-400 tabular-nums">
                {detainedCount} ({((detainedCount / totalStu) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Pie/Donut Chart 2: Defaulters Share by Section */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Defaulters by Section Pie Chart
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Share of students below 75% across sections
            </p>
          </div>

          <div className="my-4 flex items-center justify-center">
            {totalSectionDefaulters === 0 ? (
              <div className="py-10 text-xs text-[#64748B]">
                0 defaulters in current scope
              </div>
            ) : (
              <svg
                viewBox="0 0 180 180"
                className="w-44 h-44"
                role="img"
                aria-label="Defaulters by Section Pie Chart"
              >
                <circle
                  cx="90"
                  cy="90"
                  r="64"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="26"
                  className="dark:stroke-slate-800"
                />
                <g transform="rotate(-90 90 90)">
                  {sectionDefaulterPieSegments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="90"
                      cy="90"
                      r="64"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="26"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                    >
                      <title>{`${seg.label}: ${seg.value} defaulters (${seg.pct.toFixed(2)}%)`}</title>
                    </circle>
                  ))}
                </g>
                <text
                  x="90"
                  y="86"
                  textAnchor="middle"
                  className="fill-[#B91C1C] dark:fill-red-400 font-mono text-xl font-bold"
                >
                  {totalSectionDefaulters}
                </text>
                <text
                  x="90"
                  y="104"
                  textAnchor="middle"
                  className="fill-[#64748B] dark:fill-slate-400 text-[10px] font-semibold uppercase"
                >
                  Defaulters
                </text>
              </svg>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {sectionStats.map((s) => (
              <div key={s.section} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-medium text-[#0F172A] dark:text-slate-200">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  Section {s.section} ({s.count} students)
                </span>
                <span className="font-mono font-bold text-[#0F172A] dark:text-white tabular-nums">
                  {s.defaulters} defaulters
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Column Bar Graph: Section-Wise Average Attendance (%) */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Section-Wise Average Bar Graph
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Mean attendance % per section (75% target line)
            </p>
          </div>

          {sectionStats.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No section data available
            </div>
          ) : (
            <div className="my-4 relative h-48 pt-6 pb-6 px-2 flex items-end justify-around gap-3 border-b border-[#CBD5E1] dark:border-slate-700">
              {/* 75% Dashed Reference Line */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-[#1E3A8A] dark:border-blue-400 pointer-events-none z-10"
                style={{ bottom: 'calc(24px + 0.75 * (100% - 48px))' }}
              >
                <span className="absolute right-1 -top-4 text-[10px] font-mono font-bold text-[#1E3A8A] dark:text-blue-300 bg-white/90 dark:bg-slate-900/90 px-1 rounded">
                  75%
                </span>
              </div>

              {sectionStats.map((s) => {
                const barHeightPct = Math.max(4, Math.min(100, s.avgPct));
                return (
                  <div
                    key={s.section}
                    className="flex-1 h-full flex flex-col items-center justify-end group"
                  >
                    <span className="font-mono text-[11px] font-bold text-[#0F172A] dark:text-white mb-1 tabular-nums">
                      {s.avgPct.toFixed(1)}%
                    </span>
                    <div className="w-full max-w-[44px] h-full flex items-end bg-[#F1F5F9] dark:bg-slate-800 rounded-t overflow-hidden">
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          s.avgPct >= 75
                            ? 'bg-[#10B981]'
                            : s.avgPct >= 65
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#EF4444]'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                        title={`Section ${s.section}: ${s.avgPct.toFixed(2)}%`}
                      />
                    </div>
                    <span className="mt-1.5 text-xs font-bold text-[#475569] dark:text-slate-300">
                      Sec {s.section}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400">
            <span>Green ≥ 75% · Amber 65–74.99% · Red &lt; 65%</span>
            <span className="font-mono font-semibold">
              {sectionStats.length} Sections
            </span>
          </div>
        </div>
      </div>

      {/* Category Distribution Stacked Bar (Full Width) */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
            Category Distribution Breakdown (Regular ≥ 75% · Condonation 65%–74.99% · Detained &lt; 65%)
          </h3>
          <span className="font-mono text-xs text-[#64748B] dark:text-slate-400 tabular-nums">
            Total: {studentBars.length} students
          </span>
        </div>

        {/* Stacked Horizontal Bar */}
        <div className="w-full h-7 bg-[#F1F5F9] dark:bg-slate-800 rounded overflow-hidden flex">
          {regularCount > 0 && (
            <div
              className="bg-[#10B981] h-full flex items-center justify-center text-[11px] font-mono font-bold text-white tabular-nums"
              style={{ width: `${(regularCount / totalStu) * 100}%` }}
              title={`Regular: ${regularCount}`}
            >
              {((regularCount / totalStu) * 100).toFixed(1)}%
            </div>
          )}
          {condonationCount > 0 && (
            <div
              className="bg-[#F59E0B] h-full flex items-center justify-center text-[11px] font-mono font-bold text-white tabular-nums"
              style={{ width: `${(condonationCount / totalStu) * 100}%` }}
              title={`Condonation: ${condonationCount}`}
            >
              {((condonationCount / totalStu) * 100).toFixed(1)}%
            </div>
          )}
          {detainedCount > 0 && (
            <div
              className="bg-[#EF4444] h-full flex items-center justify-center text-[11px] font-mono font-bold text-white tabular-nums"
              style={{ width: `${(detainedCount / totalStu) * 100}%` }}
              title={`Detained: ${detainedCount}`}
            >
              {((detainedCount / totalStu) * 100).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800 flex items-center justify-between">
            <CategoryBadge category="REGULAR" />
            <span className="font-mono font-bold text-[#047857] dark:text-emerald-300 tabular-nums">
              {regularCount} ({((regularCount / totalStu) * 100).toFixed(2)}%)
            </span>
          </div>
          <div className="p-3 rounded bg-[#FFFBEB] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800 flex items-center justify-between">
            <CategoryBadge category="CONDONATION" />
            <span className="font-mono font-bold text-[#B45309] dark:text-amber-300 tabular-nums">
              {condonationCount} (
              {((condonationCount / totalStu) * 100).toFixed(2)}%)
            </span>
          </div>
          <div className="p-3 rounded bg-[#FEF2F2] dark:bg-red-950/40 border border-[#FECACA] dark:border-red-800 flex items-center justify-between">
            <CategoryBadge category="DETAINED" />
            <span className="font-mono font-bold text-[#B91C1C] dark:text-red-300 tabular-nums">
              {detainedCount} ({((detainedCount / totalStu) * 100).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Student-wise Attendance */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Student-Wise Attendance (%)
            </h3>
            <span className="text-xs text-[#64748B] dark:text-slate-400">
              75% Target Line
            </span>
          </div>
          {studentBars.length === 0 ? (
            <p className="text-xs text-[#64748B] py-8 text-center">
              No student attendance records in scope.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {studentBars.map((bar) => (
                <div key={bar.fullLabel} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#0F172A] dark:text-slate-200 truncate">
                      {bar.fullLabel}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <CategoryBadge category={bar.category} />
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          bar.category === 'DETAINED'
                            ? 'text-[#B91C1C] dark:text-red-400'
                            : bar.category === 'CONDONATION'
                            ? 'text-[#B45309] dark:text-amber-400'
                            : 'text-[#047857] dark:text-emerald-400'
                        }`}
                      >
                        {bar.pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full h-2.5 bg-[#F1F5F9] dark:bg-slate-800 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-200 ${
                        bar.category === 'DETAINED'
                          ? 'bg-[#EF4444]'
                          : bar.category === 'CONDONATION'
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#10B981]'
                      }`}
                      style={{ width: `${Math.min(100, bar.pct)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#1E3A8A] dark:bg-blue-400"
                      style={{ left: '75%' }}
                      title="75% Minimum Threshold"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart 2: Subject-wise Attendance */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Subject-Wise Average Attendance (%)
            </h3>
            <span className="text-xs text-[#64748B] dark:text-slate-400">
              By Subject &amp; Section
            </span>
          </div>
          {subjectStats.length === 0 ? (
            <p className="text-xs text-[#64748B] py-8 text-center">
              No subjects assigned.
            </p>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {subjectStats.map((sub) => (
                <div key={`${sub.id}-${sub.name}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-semibold text-[#1E3A8A] dark:text-[#93C5FD] mr-2">
                        {sub.id}
                      </span>
                      <span className="font-medium text-[#0F172A] dark:text-slate-200">
                        {sub.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#0F172A] dark:text-white tabular-nums">
                      {sub.avgPct.toFixed(2)}% ({sub.conducted} cls)
                    </span>
                  </div>
                  <div className="relative w-full h-3 bg-[#F1F5F9] dark:bg-slate-800 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-200 ${
                        sub.avgPct < 75 ? 'bg-[#F59E0B]' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${Math.min(100, sub.avgPct)}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#0F172A] dark:bg-white"
                      style={{ left: '75%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart 3: Monthly Attendance */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Monthly Attendance Trend (%)
            </h3>
            <span className="text-xs text-[#64748B] dark:text-slate-400">
              Calendar Month
            </span>
          </div>
          {monthlyData.length === 0 ? (
            <p className="text-xs text-[#64748B] py-8 text-center">
              No monthly session data available.
            </p>
          ) : (
            <div className="space-y-3">
              {monthlyData.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-[#475569] dark:text-slate-300 w-20 shrink-0 tabular-nums">
                    {m.month}
                  </span>
                  <div className="flex-1 h-6 bg-[#F1F5F9] dark:bg-slate-800 rounded overflow-hidden relative">
                    <div
                      className={`h-full rounded flex items-center px-2 text-[11px] font-mono font-bold text-white tabular-nums ${
                        m.pct < 75 ? 'bg-[#EF4444]' : 'bg-[#1E3A8A]'
                      }`}
                      style={{ width: `${Math.max(15, Math.min(100, m.pct))}%` }}
                    >
                      {m.pct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart 4: Number of Defaulters per Subject */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
              Number of Defaulters per Subject (&lt; 75%)
            </h3>
            <span className="text-xs text-[#64748B] dark:text-slate-400">
              Headcount
            </span>
          </div>
          {subjectStats.length === 0 ? (
            <p className="text-xs text-[#64748B] py-8 text-center">
              No subjects available.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {subjectStats.map((sub) => (
                <div key={`def-${sub.id}-${sub.name}`} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[#0F172A] dark:text-slate-200 w-40 truncate shrink-0">
                    {sub.id} · {sub.name}
                  </span>
                  <div className="flex-1 h-6 bg-[#F1F5F9] dark:bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#EF4444] rounded transition-all duration-200"
                      style={{
                        width: `${
                          sub.defaulters > 0
                            ? Math.max(8, (sub.defaulters / maxDefaulters) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#B91C1C] dark:text-red-400 w-10 text-right tabular-nums">
                    {sub.defaulters}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
