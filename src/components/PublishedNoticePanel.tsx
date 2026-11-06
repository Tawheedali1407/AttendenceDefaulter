import React, { useState } from 'react';
import {
  Megaphone,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  ShieldAlert,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ErpDatabase } from '../types/erp';
import {
  getStudentOverallStats,
  getStudentSubjectStats,
} from '../utils/attendanceMath';
import { CategoryBadge } from './CategoryBadge';

interface PublishedNoticePanelProps {
  db: ErpDatabase;
  canPublish?: boolean;
  publisherName?: string;
  onPublish?: () => void;
  onUnpublish?: () => void;
}

export const PublishedNoticePanel: React.FC<PublishedNoticePanelProps> = ({
  db,
  canPublish = false,
  onPublish,
  onUnpublish,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL_DEFAULTERS' | 'CONDONATION' | 'DETAINED'
  >('ALL_DEFAULTERS');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');

  // Compute all-subjects & classes average attendance for every student
  const allStudentRows = db.students.map((stu) => {
    const overall = getStudentOverallStats(stu, db.subjects, db.sessions);
    const secSubjects = db.subjects.filter((s) => s.section === stu.section);
    const subjectBreakdown = secSubjects.map((sub) => ({
      code: sub.id,
      name: sub.name,
      metrics: getStudentSubjectStats(stu.id, sub, db.sessions),
    }));
    return {
      student: stu,
      overall,
      subjectBreakdown,
    };
  });

  const condonationRows = allStudentRows.filter(
    (r) => r.overall.category === 'CONDONATION'
  );
  const detainedRows = allStudentRows.filter(
    (r) => r.overall.category === 'DETAINED'
  );

  const filteredRows = allStudentRows
    .filter((r) => {
      if (categoryFilter === 'CONDONATION') {
        return r.overall.category === 'CONDONATION';
      }
      if (categoryFilter === 'DETAINED') {
        return r.overall.category === 'DETAINED';
      }
      return r.overall.isDefaulter;
    })
    .filter((r) =>
      sectionFilter === 'ALL' ? true : r.student.section === sectionFilter
    )
    .sort((a, b) => a.overall.percentage - b.overall.percentage);

  const handleExportPublishedPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(
      'RGMCET — Official Condonation & Detained List (All Subjects & Classes Average)',
      14,
      15
    );
    doc.setFontSize(9.5);
    const statusText = db.publishedNotice
      ? `Published on ${new Date(db.publishedNotice.publishedAt).toLocaleString()} by ${db.publishedNotice.publishedBy}`
      : 'Draft Preview (Not yet published)';
    doc.text(
      `${statusText} | Condonation (65%–74.99%): ${condonationRows.length} | Detained (< 65%): ${detainedRows.length}`,
      14,
      22
    );

    autoTable(doc, {
      startY: 28,
      head: [
        [
          'Register No',
          'Student Name',
          'Sec',
          'All-Subjects Attended',
          'Overall Avg %',
          'Shortage %',
          'Classes Needed',
          'Status',
          'Subject-Wise Breakdown',
        ],
      ],
      body: filteredRows.map((r) => [
        r.student.registerNumber,
        r.student.name,
        r.student.section,
        `${r.overall.attended} / ${r.overall.conducted}`,
        `${r.overall.percentage.toFixed(2)}%`,
        `${r.overall.shortagePercent.toFixed(2)}%`,
        r.overall.isRecoveryFeasible
          ? `${r.overall.classesNeeded} cls`
          : `Max ${r.overall.bestReachablePercent.toFixed(1)}%`,
        r.overall.category,
        r.subjectBreakdown
          .map((sb) => `${sb.code}: ${sb.metrics.percentage.toFixed(1)}%`)
          .join(', '),
      ]),
      styles: { fontSize: 8 },
    });

    doc.save('RGMCET_Published_Condonation_Detained_List.pdf');
  };

  const handleExportPublishedCsv = () => {
    const headers = [
      'Register Number',
      'Student Name',
      'Section',
      'Total Attended (All Subjects)',
      'Total Conducted (All Subjects)',
      'Overall Average %',
      'Shortage %',
      'Category',
      'Subject Breakdown',
    ];
    const lines = [
      headers.join(','),
      ...filteredRows.map((r) =>
        [
          r.student.registerNumber,
          `"${r.student.name}"`,
          r.student.section,
          r.overall.attended,
          r.overall.conducted,
          r.overall.percentage.toFixed(2),
          r.overall.shortagePercent.toFixed(2),
          r.overall.category,
          `"${r.subjectBreakdown
            .map((sb) => `${sb.code}: ${sb.metrics.percentage.toFixed(2)}%`)
            .join(' | ')}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RGMCET_Published_Condonation_Detained_List.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-[#1E3A8A] via-[#1E40AF] to-[#2563EB] text-white flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-300 shrink-0" />
            <h3 className="text-base font-bold tracking-tight">
              Condonation &amp; Detained Register (All Subjects &amp; Classes Average)
            </h3>
            {db.publishedNotice ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-emerald-100 text-[11px] font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Published
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-300/40 text-amber-100 text-[11px] font-semibold">
                Draft — Not Published
              </span>
            )}
          </div>
          <p className="text-xs text-blue-100">
            Calculated from cumulative attendance across all subjects and classes conducted per section.
            {db.publishedNotice && (
              <span className="ml-2 font-medium text-white">
                · Published {new Date(db.publishedNotice.publishedAt).toLocaleString()} by{' '}
                {db.publishedNotice.publishedBy}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPublish && onPublish && (
            <button
              type="button"
              onClick={onPublish}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              <span>
                {db.publishedNotice
                  ? 'Republish Condonation & Detained List'
                  : 'Publish Condonation & Detained List'}
              </span>
            </button>
          )}
          {canPublish && db.publishedNotice && onUnpublish && (
            <button
              type="button"
              onClick={onUnpublish}
              className="min-h-[44px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Unpublish</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportPublishedPdf}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white text-[#1E3A8A] hover:bg-blue-50 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportPublishedCsv}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Strip + Filters */}
      <div className="p-4 bg-[#F8FAFC] dark:bg-slate-950/60 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL_DEFAULTERS')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              categoryFilter === 'ALL_DEFAULTERS'
                ? 'bg-[#1E3A8A] text-white'
                : 'bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 text-[#475569] dark:text-slate-300'
            }`}
          >
            All Defaulters ({condonationRows.length + detainedRows.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('CONDONATION')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              categoryFilter === 'CONDONATION'
                ? 'bg-[#F59E0B] text-white'
                : 'bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 text-[#B45309] dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Condonation 65%–74.99% ({condonationRows.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('DETAINED')}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              categoryFilter === 'DETAINED'
                ? 'bg-[#EF4444] text-white'
                : 'bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 text-[#B91C1C] dark:text-red-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Detained &lt; 65% ({detainedRows.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#64748B]" />
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            aria-label="Filter published list by section"
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#0F172A] dark:text-white"
          >
            <option value="ALL">All Sections (A–D)</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B] dark:text-slate-400">
            No students in this category for the selected section.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-slate-800/80 text-[#475569] dark:text-slate-300 border-b border-[#E2E8F0] dark:border-slate-800">
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  Register No
                </th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  Student Name
                </th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  Sec
                </th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  All-Subjects Classes
                </th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  Overall Avg %
                </th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  Shortage
                </th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  Category
                </th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider">
                  Subject-Wise Breakdown
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {filteredRows.map(({ student, overall, subjectBreakdown }) => (
                <tr
                  key={student.id}
                  className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#1E3A8A] dark:text-[#93C5FD] whitespace-nowrap">
                    {student.registerNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white whitespace-nowrap">
                    {student.name}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold">
                    {student.section}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums">
                    {overall.attended} / {overall.conducted}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold tabular-nums">
                    <span
                      className={
                        overall.category === 'DETAINED'
                          ? 'text-[#B91C1C] dark:text-red-400'
                          : 'text-[#B45309] dark:text-amber-400'
                      }
                    >
                      {overall.percentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#B91C1C] dark:text-red-400 tabular-nums">
                    -{overall.shortagePercent.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <CategoryBadge category={overall.category} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {subjectBreakdown.map((sb) => (
                        <span
                          key={sb.code}
                          className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                            sb.metrics.percentage < 65
                              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                              : sb.metrics.percentage < 75
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {sb.code}: {sb.metrics.percentage.toFixed(1)}%
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
