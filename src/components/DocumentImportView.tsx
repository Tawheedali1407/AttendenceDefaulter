import React, { useState } from 'react';
import {
  Upload,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AttendanceSession,
  ErpDatabase,
  StudentUser,
} from '../types/erp';
import { generateSalt, hashPassword } from '../utils/crypto';
import {
  extractLinesFromFile,
  parseDailySheetLines,
  parsePercentageLines,
  ParsedDailySheetResult,
  ParsedPercentageRow,
  REG_NO_REGEX,
} from '../utils/documentParser';

interface DocumentImportViewProps {
  db: ErpDatabase;
  onUpdateDb: (nextDb: ErpDatabase) => void;
  restrictedFacultyId?: string;
}

export const DocumentImportView: React.FC<DocumentImportViewProps> = ({
  db,
  onUpdateDb,
  restrictedFacultyId,
}) => {
  const visibleSubjects = restrictedFacultyId
    ? db.subjects.filter((s) => s.facultyId === restrictedFacultyId)
    : db.subjects;

  const [importType, setImportType] = useState<'PERCENTAGE' | 'DAILY'>(
    'PERCENTAGE'
  );

  // Percentage list options
  const [pctBranch, setPctBranch] = useState('CSE(AI&ML)');
  const [pctYear, setPctYear] = useState('II Year');
  const [pctSection, setPctSection] = useState('B');

  // Daily sheet options
  const [dailySubjectKey, setDailySubjectKey] = useState(
    visibleSubjects[0] ? `${visibleSubjects[0].id}::${visibleSubjects[0].section}` : ''
  );
  const [dailyMonth, setDailyMonth] = useState('2026-10');

  // Drag & drop + parsing state
  const [isDragging, setIsDragging] = useState(false);
  const [parsingStatus, setParsingStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Editable Preview state
  const [pctPreview, setPctPreview] = useState<ParsedPercentageRow[] | null>(
    null
  );
  const [dailyPreview, setDailyPreview] =
    useState<ParsedDailySheetResult | null>(null);

  const handleFile = async (file: File) => {
    setErrorMsg('');
    setSuccessMsg('');
    setPctPreview(null);
    setDailyPreview(null);
    setParsingStatus(`Reading ${file.name}...`);

    try {
      const lines = await extractLinesFromFile(file, (msg) =>
        setParsingStatus(msg)
      );

      if (importType === 'PERCENTAGE') {
        const parsed = parsePercentageLines(lines);
        if (parsed.length === 0) {
          setErrorMsg(
            'No rows with valid register numbers (e.g. 25091A33B5) were found in this file.'
          );
        } else {
          setPctPreview(parsed);
        }
      } else {
        const parsed = parseDailySheetLines(lines, dailyMonth);
        if (parsed.rows.length === 0 || parsed.dates.length === 0) {
          setErrorMsg(
            'No valid daily attendance rows (Register No + P/A) were found in this file.'
          );
        } else {
          setDailyPreview(parsed);
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to parse document.'
      );
    } finally {
      setParsingStatus('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirmPercentageImport = async () => {
    if (!pctPreview || pctPreview.length === 0) return;

    const nextStudents = [...db.students];
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of pctPreview) {
      const reg = row.registerNumber.trim().toUpperCase();
      const name = row.name.trim();
      const pct = Number(row.percentageStr);
      if (!REG_NO_REGEX.test(reg) || !name || isNaN(pct) || pct < 0 || pct > 100) {
        continue;
      }

      const existingIdx = nextStudents.findIndex(
        (s) => s.registerNumber.toUpperCase() === reg
      );
      if (existingIdx >= 0) {
        nextStudents[existingIdx] = {
          ...nextStudents[existingIdx],
          name,
          branch: pctBranch.trim() || nextStudents[existingIdx].branch,
          year: pctYear.trim() || nextStudents[existingIdx].year,
          section: pctSection.trim().toUpperCase() || nextStudents[existingIdx].section,
          importedOverallPercent: Number(pct.toFixed(1)),
          isImported: true,
        };
        updatedCount++;
      } else {
        const salt = generateSalt();
        const hash = await hashPassword(reg, salt);
        const newStu: StudentUser = {
          id: `stu-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          registerNumber: reg,
          name,
          branch: pctBranch.trim() || 'CSE(AI&ML)',
          year: pctYear.trim() || 'II Year',
          section: pctSection.trim().toUpperCase() || 'B',
          passwordSalt: salt,
          passwordHash: hash,
          isDefaultPassword: true,
          importedOverallPercent: Number(pct.toFixed(1)),
          isImported: true,
        };
        nextStudents.push(newStu);
        createdCount++;
      }
    }

    onUpdateDb({ ...db, students: nextStudents });
    setPctPreview(null);
    setSuccessMsg(
      `Imported Percentage List: ${createdCount} new students created, ${updatedCount} existing students updated.`
    );
  };

  const handleConfirmDailyImport = async () => {
    if (!dailyPreview || !dailySubjectKey) return;
    const [subjectId, section] = dailySubjectKey.split('::');

    const nextStudents = [...db.students];
    const regToId = new Map<string, string>();
    for (const s of nextStudents) {
      regToId.set(s.registerNumber.toUpperCase(), s.id);
    }

    // Create any missing students
    for (const row of dailyPreview.rows) {
      const reg = row.registerNumber.trim().toUpperCase();
      if (!REG_NO_REGEX.test(reg)) continue;
      if (!regToId.has(reg)) {
        const salt = generateSalt();
        const hash = await hashPassword(reg, salt);
        const newStu: StudentUser = {
          id: `stu-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          registerNumber: reg,
          name: row.name.trim() || reg,
          branch: 'CSE(AI&ML)',
          year: 'II Year',
          section,
          passwordSalt: salt,
          passwordHash: hash,
          isDefaultPassword: true,
          isImported: true,
        };
        nextStudents.push(newStu);
        regToId.set(reg, newStu.id);
      }
    }

    const nextSessions = [...db.sessions];
    let addedDates = 0;
    let skippedDuplicates = 0;

    dailyPreview.dates.forEach((dateStr, colIdx) => {
      const isDup = nextSessions.some(
        (s) =>
          s.subjectId === subjectId &&
          s.section === section &&
          s.date === dateStr
      );
      if (isDup) {
        skippedDuplicates++;
        return;
      }

      const presentStudentIds: string[] = [];
      for (const row of dailyPreview.rows) {
        const stuId = regToId.get(row.registerNumber.trim().toUpperCase());
        if (stuId && row.statuses[colIdx] === 'P') {
          presentStudentIds.push(stuId);
        }
      }

      nextSessions.push({
        id: `sess-imp-${Date.now()}-${colIdx}`,
        subjectId,
        section,
        date: dateStr,
        presentStudentIds,
        isImported: true,
      });
      addedDates++;
    });

    onUpdateDb({
      ...db,
      students: nextStudents,
      sessions: nextSessions,
    });
    setDailyPreview(null);
    setSuccessMsg(
      `Imported Daily Attendance Sheet for ${subjectId} (Sec ${section}): ${addedDates} new date(s) saved${
        skippedDuplicates > 0
          ? `, ${skippedDuplicates} duplicate date(s) blocked`
          : ''
      }.`
    );
  };

  const handleDeleteAllImported = () => {
    const importedStudentIds = new Set(
      db.students.filter((s) => s.isImported).map((s) => s.id)
    );
    const nextStudents = db.students.filter((s) => !s.isImported);
    const nextSessions = db.sessions
      .filter((sess) => !sess.isImported)
      .map((sess) => ({
        ...sess,
        presentStudentIds: sess.presentStudentIds.filter(
          (id) => !importedStudentIds.has(id)
        ),
      }));

    onUpdateDb({
      ...db,
      students: nextStudents,
      sessions: nextSessions,
    });
    setPctPreview(null);
    setDailyPreview(null);
    setSuccessMsg(
      'Deleted all imported students and imported attendance sessions from browser storage.'
    );
  };

  // Duplicate roll detection for Percentage Preview
  const pctRollCounts = new Map<string, number>();
  if (pctPreview) {
    for (const r of pctPreview) {
      const key = r.registerNumber.trim().toUpperCase();
      pctRollCounts.set(key, (pctRollCounts.get(key) || 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      {/* Privacy Warning & Delete Imported Data */}
      <div className="p-4 rounded-lg bg-[#FFFBEB] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3 text-xs sm:text-sm text-[#B45309] dark:text-amber-200 max-w-3xl">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Local Browser Privacy Notice:</strong> All documents (.csv,
            .xlsx, .pdf, .docx, and images) are parsed 100% locally in your
            browser. Nothing is uploaded to any server. Real student data stays
            in your own browser&apos;s localStorage only.
          </div>
        </div>
        <button
          type="button"
          onClick={handleDeleteAllImported}
          className="min-h-[42px] px-4 py-2 rounded bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          Delete all imported data
        </button>
      </div>

      {/* Import Type & Target Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
              Document Import (Browser-Only)
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Supports .csv, .xlsx, .pdf, .docx, and scanned images (OCR).
              Always shows an editable preview before saving.
            </p>
          </div>

          <div className="flex p-1 bg-[#F1F5F9] dark:bg-slate-800 rounded">
            <button
              type="button"
              onClick={() => {
                setImportType('PERCENTAGE');
                setPctPreview(null);
                setDailyPreview(null);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                importType === 'PERCENTAGE'
                  ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-[#93C5FD] border border-[#CBD5E1] dark:border-slate-700'
                  : 'text-[#64748B] dark:text-slate-400'
              }`}
            >
              1. Percentage List (Regd.No, Name, %)
            </button>
            <button
              type="button"
              onClick={() => {
                setImportType('DAILY');
                setPctPreview(null);
                setDailyPreview(null);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                importType === 'DAILY'
                  ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-[#93C5FD] border border-[#CBD5E1] dark:border-slate-700'
                  : 'text-[#64748B] dark:text-slate-400'
              }`}
            >
              2. Daily Attendance Sheet (Roll + P/A)
            </button>
          </div>
        </div>

        {importType === 'PERCENTAGE' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={pctBranch}
                onChange={(e) => setPctBranch(e.target.value)}
                className="w-full h-[42px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                Year
              </label>
              <input
                type="text"
                value={pctYear}
                onChange={(e) => setPctYear(e.target.value)}
                className="w-full h-[42px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="imp-pct-section"
                className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Section
              </label>
              <select
                id="imp-pct-section"
                value={pctSection}
                onChange={(e) => setPctSection(e.target.value)}
                className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              >
                {['A', 'B', 'C', 'D'].map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                Subject &amp; Section
              </label>
              <select
                value={dailySubjectKey}
                onChange={(e) => setDailySubjectKey(e.target.value)}
                className="w-full h-[42px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              >
                {visibleSubjects.map((s) => (
                  <option key={`${s.id}::${s.section}`} value={`${s.id}::${s.section}`}>
                    {s.id} — {s.name} (Sec {s.section})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1">
                Month (YYYY-MM)
              </label>
              <input
                type="month"
                value={dailyMonth}
                onChange={(e) => setDailyMonth(e.target.value)}
                className="w-full h-[42px] px-3 text-sm font-mono rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging
              ? 'border-[#2563EB] bg-[#EFF4FF] dark:bg-blue-950/30'
              : 'border-[#CBD5E1] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950/50 hover:border-[#1E3A8A]'
          }`}
        >
          <Upload className="w-8 h-8 text-[#1E3A8A] dark:text-[#93C5FD] mb-2" />
          <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
            Drag &amp; drop a file here, or click to browse
          </span>
          <span className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Accepted: .csv, .xlsx, .pdf, .docx, .png, .jpg, .jpeg
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>

        {parsingStatus && (
          <div className="p-3 rounded bg-[#EFF4FF] dark:bg-blue-950/40 border border-[#CBD5E1] dark:border-blue-800 text-xs font-medium text-[#1E3A8A] dark:text-blue-200">
            {parsingStatus}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded bg-[#FEF2F2] dark:bg-red-950/50 border border-[#FECACA] dark:border-red-800 flex items-center gap-2 text-xs text-[#B91C1C] dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded bg-[#ECFDF5] dark:bg-emerald-950/50 border border-[#A7F3D0] dark:border-emerald-800 flex items-center gap-2 text-xs text-[#047857] dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* EDITABLE PREVIEW: PERCENTAGE LIST */}
      {pctPreview && (
        <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Editable Import Preview — Percentage List ({pctPreview.length}{' '}
                rows)
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Problem rows (bad %, duplicate roll, missing/cut-off name) are
                highlighted. Edit inline or remove before confirming.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPctPreview(null)}
                className="min-h-[40px] px-4 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#475569] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPercentageImport}
                className="min-h-[40px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold"
              >
                Confirm &amp; Save Import
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-10 border-b border-[#E2E8F0] dark:border-slate-700">
                  <th className="px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                    Register No
                  </th>
                  <th className="px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                    Student Name
                  </th>
                  <th className="px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                    Attendance %
                  </th>
                  <th className="px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                    Validation
                  </th>
                  <th className="px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300 text-right">
                    Remove
                  </th>
                </tr>
              </thead>
              <tbody>
                {pctPreview.map((row, idx) => {
                  const regUpper = row.registerNumber.trim().toUpperCase();
                  const pctNum = Number(row.percentageStr);
                  const badPct =
                    row.percentageStr.trim() === '' ||
                    isNaN(pctNum) ||
                    pctNum < 0 ||
                    pctNum > 100;
                  const dupRoll = (pctRollCounts.get(regUpper) || 0) > 1;
                  const badName = row.name.trim().length < 3;
                  const badReg = !REG_NO_REGEX.test(regUpper);
                  const hasProblem = badPct || dupRoll || badName || badReg;

                  return (
                    <tr
                      key={row.rowId}
                      className={`border-b border-[#E2E8F0] dark:border-slate-800 ${
                        hasProblem
                          ? 'bg-[#FEF2F2] dark:bg-red-950/30'
                          : idx % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                      }`}
                    >
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.registerNumber}
                          onChange={(e) => {
                            const next = [...pctPreview];
                            next[idx] = {
                              ...row,
                              registerNumber: e.target.value,
                            };
                            setPctPreview(next);
                          }}
                          className="h-[36px] px-2.5 text-xs font-mono rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white w-36"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => {
                            const next = [...pctPreview];
                            next[idx] = { ...row, name: e.target.value };
                            setPctPreview(next);
                          }}
                          className="h-[36px] px-2.5 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white w-full min-w-[180px]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.percentageStr}
                          onChange={(e) => {
                            const next = [...pctPreview];
                            next[idx] = {
                              ...row,
                              percentageStr: e.target.value,
                            };
                            setPctPreview(next);
                          }}
                          className="h-[36px] px-2.5 text-xs font-mono rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white w-24"
                        />
                      </td>
                      <td className="p-2 text-xs">
                        {!hasProblem ? (
                          <span className="text-[#047857] dark:text-emerald-400 font-semibold">
                            Valid
                          </span>
                        ) : (
                          <span className="text-[#B91C1C] dark:text-red-300 font-semibold">
                            {[
                              badReg && 'Invalid Regd.No',
                              dupRoll && 'Duplicate Roll',
                              badName && 'Missing/Cut-off Name',
                              badPct && 'Bad %',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setPctPreview(
                              pctPreview.filter((r) => r.rowId !== row.rowId)
                            )
                          }
                          className="p-1.5 rounded text-[#B91C1C] hover:bg-red-100 dark:hover:bg-red-950"
                          aria-label="Remove row"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDITABLE PREVIEW: DAILY ATTENDANCE SHEET */}
      {dailyPreview && (
        <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#1E3A8A]" />
                Editable Import Preview — Daily Attendance Sheet (
                {dailyPreview.rows.length} students · {dailyPreview.dates.length}{' '}
                dates)
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Duplicate dates are highlighted and will be blocked on save.
                Click P/A cells to toggle.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDailyPreview(null)}
                className="min-h-[40px] px-4 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#475569] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDailyImport}
                className="min-h-[40px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold"
              >
                Confirm &amp; Save Attendance
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] dark:bg-slate-800 h-11 border-b border-[#E2E8F0] dark:border-slate-700">
                  <th className="px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                    Register No
                  </th>
                  <th className="px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#475569] dark:text-slate-300">
                    Name
                  </th>
                  {dailyPreview.dates.map((d, dIdx) => {
                    const [subId, sec] = dailySubjectKey.split('::');
                    const isDup = db.sessions.some(
                      (s) =>
                        s.subjectId === subId &&
                        s.section === sec &&
                        s.date === d
                    );
                    return (
                      <th
                        key={dIdx}
                        className={`px-2 text-[11px] font-mono font-bold text-center whitespace-nowrap ${
                          isDup
                            ? 'bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300'
                            : 'text-[#475569] dark:text-slate-300'
                        }`}
                      >
                        <div>{d}</div>
                        {isDup && (
                          <div className="text-[10px] font-sans">
                            Duplicate (Blocked)
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dailyPreview.rows.map((row, rIdx) => {
                  const badName = row.name.trim().length < 3;
                  return (
                    <tr
                      key={row.rowId}
                      className={`h-11 border-b border-[#E2E8F0] dark:border-slate-800 ${
                        badName
                          ? 'bg-[#FFFBEB] dark:bg-amber-950/20'
                          : rIdx % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-[#F8FAFC] dark:bg-slate-900/60'
                      }`}
                    >
                      <td className="px-3 font-mono text-xs font-semibold text-[#1E3A8A] dark:text-[#93C5FD]">
                        {row.registerNumber}
                      </td>
                      <td className="px-3">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => {
                            const nextRows = [...dailyPreview.rows];
                            nextRows[rIdx] = { ...row, name: e.target.value };
                            setDailyPreview({
                              ...dailyPreview,
                              rows: nextRows,
                            });
                          }}
                          className="h-[34px] px-2 text-xs rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white w-44"
                        />
                      </td>
                      {row.statuses.map((st, cIdx) => (
                        <td key={cIdx} className="px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const nextRows = [...dailyPreview.rows];
                              const nextStatuses = [...row.statuses];
                              nextStatuses[cIdx] = st === 'P' ? 'A' : 'P';
                              nextRows[rIdx] = {
                                ...row,
                                statuses: nextStatuses,
                              };
                              setDailyPreview({
                                ...dailyPreview,
                                rows: nextRows,
                              });
                            }}
                            className={`w-8 h-8 rounded font-mono text-xs font-bold ${
                              st === 'P'
                                ? 'bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
                                : 'bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300 border border-[#FECACA] dark:border-red-800'
                            }`}
                          >
                            {st}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
