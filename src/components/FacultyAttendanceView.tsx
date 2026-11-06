import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Edit3,
} from 'lucide-react';
import {
  AttendanceSession,
  StudentUser,
  SubjectItem,
} from '../types/erp';

interface FacultyAttendanceViewProps {
  facultyId: string;
  subjects: SubjectItem[];
  students: StudentUser[];
  sessions: AttendanceSession[];
  onSaveSession: (session: AttendanceSession) => void;
}

export const FacultyAttendanceView: React.FC<FacultyAttendanceViewProps> = ({
  facultyId,
  subjects,
  students,
  sessions,
  onSaveSession,
}) => {
  const mySubjects = subjects.filter((s) => s.facultyId === facultyId);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>(
    mySubjects[0] ? `${mySubjects[0].id}::${mySubjects[0].section}` : ''
  );
  const [date, setDate] = useState<string>('2026-10-22');
  const [markingMode, setMarkingMode] = useState<'INDIVIDUAL' | 'ABSENTEES'>(
    'ABSENTEES'
  );
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [editingExistingId, setEditingExistingId] = useState<string | null>(
    null
  );
  const [savedBanner, setSavedBanner] = useState<string>('');

  const [subjectId, section] = selectedSubjectKey.split('::');
  const currentSubject = mySubjects.find(
    (s) => s.id === subjectId && s.section === section
  );
  const sectionStudents = students.filter((s) => s.section === section);

  const duplicateSession = sessions.find(
    (s) =>
      s.subjectId === subjectId &&
      s.section === section &&
      s.date === date &&
      s.id !== editingExistingId
  );

  // Initialize presentIds when subject/section changes
  useEffect(() => {
    setEditingExistingId(null);
    setSavedBanner('');
    setPresentIds(sectionStudents.map((s) => s.id));
  }, [selectedSubjectKey, date]);

  const toggleStudent = (studentId: string) => {
    setPresentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleLoadExistingForEdit = () => {
    if (!duplicateSession) return;
    setEditingExistingId(duplicateSession.id);
    setPresentIds(duplicateSession.presentStudentIds);
    setSavedBanner('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject || duplicateSession) return;

    const sessionToSave: AttendanceSession = {
      id: editingExistingId || `sess-${Date.now()}`,
      subjectId: currentSubject.id,
      section: currentSubject.section,
      date,
      presentStudentIds: presentIds,
    };

    onSaveSession(sessionToSave);
    setEditingExistingId(null);
    setSavedBanner(
      `Attendance saved for ${currentSubject.id} (${currentSubject.name}) · Section ${currentSubject.section} on ${date} (${presentIds.length}/${sectionStudents.length} Present).`
    );
  };

  if (mySubjects.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-8 text-center">
        <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
          No Subjects Assigned
        </p>
        <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
          Ask the RGMCET Admin to assign subjects to your faculty profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-5 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
              Mark Daily Class Attendance
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Duplicate dates are blocked automatically; load an existing date to
              correct a wrong entry.
            </p>
          </div>

          {/* Marking Mode Switch */}
          <div className="flex p-1 bg-[#F1F5F9] dark:bg-slate-800 rounded">
            <button
              type="button"
              onClick={() => setMarkingMode('ABSENTEES')}
              className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                markingMode === 'ABSENTEES'
                  ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-[#93C5FD] border border-[#CBD5E1] dark:border-slate-700'
                  : 'text-[#64748B] dark:text-slate-400'
              }`}
            >
              Everyone Present (Tick Absentees)
            </button>
            <button
              type="button"
              onClick={() => setMarkingMode('INDIVIDUAL')}
              className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                markingMode === 'INDIVIDUAL'
                  ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-[#93C5FD] border border-[#CBD5E1] dark:border-slate-700'
                  : 'text-[#64748B] dark:text-slate-400'
              }`}
            >
              Tick Each Student
            </button>
          </div>
        </div>

        {/* Subject & Date Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
              Assigned Subject &amp; Section
            </label>
            <select
              value={selectedSubjectKey}
              onChange={(e) => setSelectedSubjectKey(e.target.value)}
              className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white"
            >
              {mySubjects.map((sub) => (
                <option
                  key={`${sub.id}::${sub.section}`}
                  value={`${sub.id}::${sub.section}`}
                >
                  {sub.id} — {sub.name} (Sec {sub.section} · {sub.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5">
              Class Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Duplicate Date Warning */}
        {duplicateSession && (
          <div className="p-4 rounded-lg bg-[#FFFBEB] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-[#B45309] dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Duplicate Date Blocked:</strong> Attendance for{' '}
                <strong>
                  {currentSubject?.id} (Sec {section})
                </strong>{' '}
                on <span className="font-mono">{date}</span> is already
                recorded ({duplicateSession.presentStudentIds.length}/
                {sectionStudents.length} Present).
              </div>
            </div>
            <button
              type="button"
              onClick={handleLoadExistingForEdit}
              className="min-h-[40px] px-3.5 py-1.5 rounded bg-[#1E3A8A] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#172554]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Load &amp; Correct Existing Entry
            </button>
          </div>
        )}

        {editingExistingId && (
          <div className="p-3 rounded bg-[#EFF4FF] dark:bg-blue-950/40 border border-[#CBD5E1] dark:border-blue-800 text-xs text-[#1E3A8A] dark:text-blue-200">
            Editing existing attendance record for{' '}
            <span className="font-mono font-semibold">{date}</span>. Update
            below and click <strong>Update Attendance Record</strong>.
          </div>
        )}

        {savedBanner && (
          <div className="p-3 rounded bg-[#ECFDF5] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800 flex items-center gap-2 text-xs text-[#047857] dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedBanner}</span>
          </div>
        )}

        {/* Batch Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-[#475569] dark:text-slate-300">
            <Users className="w-4 h-4 text-[#1E3A8A] dark:text-[#93C5FD]" />
            <span>
              Present:{' '}
              <strong className="font-mono text-[#047857] dark:text-emerald-400 tabular-nums">
                {presentIds.length}
              </strong>{' '}
              · Absent:{' '}
              <strong className="font-mono text-[#B91C1C] dark:text-red-400 tabular-nums">
                {sectionStudents.length - presentIds.length}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPresentIds(sectionStudents.map((s) => s.id))}
              className="min-h-[40px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => setPresentIds([])}
              className="min-h-[40px] px-3 py-1.5 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Student Roll-Call List (Large Mobile-Friendly Tap Targets) */}
        <div className="border border-[#E2E8F0] dark:border-slate-800 rounded-lg divide-y divide-[#E2E8F0] dark:divide-slate-800">
          {sectionStudents.map((stu) => {
            const isPresent = presentIds.includes(stu.id);
            const isChecked =
              markingMode === 'ABSENTEES' ? !isPresent : isPresent;

            return (
              <div
                key={stu.id}
                onClick={() => toggleStudent(stu.id)}
                className={`min-h-[52px] px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  !isPresent
                    ? 'bg-[#FEF2F2]/70 dark:bg-red-950/20'
                    : 'bg-white dark:bg-slate-900 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    aria-label={
                      markingMode === 'ABSENTEES'
                        ? `Mark ${stu.name} absent`
                        : `Mark ${stu.name} present`
                    }
                    className="w-5 h-5 rounded border-[#CBD5E1] text-[#1E3A8A] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                      {stu.name}
                    </div>
                    <div className="font-mono text-xs text-[#64748B] dark:text-slate-400">
                      {stu.registerNumber} · {stu.branch} Sec {stu.section}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-[0.05em] shrink-0 ${
                    isPresent
                      ? 'bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800'
                      : 'bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300 border border-[#FECACA] dark:border-red-800'
                  }`}
                >
                  {isPresent ? 'Present' : 'Absent'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={Boolean(duplicateSession)}
            className="min-h-[44px] px-5 py-2.5 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-sm font-semibold transition-colors disabled:opacity-40 inline-flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {editingExistingId
              ? 'Update Attendance Record'
              : 'Save Attendance Record'}
          </button>
        </div>
      </form>
    </div>
  );
};
