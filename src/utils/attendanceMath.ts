import {
  AttendanceCategory,
  AttendanceMetrics,
  AttendanceSession,
  StudentUser,
  SubjectItem,
} from '../types/erp';

export function getAttendanceCategory(
  percentage: number,
  hasData: boolean
): AttendanceCategory {
  if (!hasData) return 'REGULAR';
  if (percentage >= 75) return 'REGULAR';
  if (percentage >= 65) return 'CONDONATION';
  return 'DETAINED';
}

export function calculateAttendanceMetrics(
  attended: number,
  conducted: number,
  planned: number
): AttendanceMetrics {
  const safePlanned = Math.max(planned, conducted);
  const hasData = conducted > 0;
  const percentage = hasData ? (attended / conducted) * 100 : 0;
  const category = getAttendanceCategory(percentage, hasData);
  const isDefaulter = hasData && percentage < 75;
  const shortagePercent = isDefaulter ? Math.max(0, 75 - percentage) : 0;
  const classesNeeded = isDefaulter
    ? Math.max(0, Math.ceil((0.75 * conducted - attended) / 0.25))
    : 0;
  const remainingClasses = Math.max(0, safePlanned - conducted);
  const isRecoveryFeasible = classesNeeded <= remainingClasses;
  const totalPossibleConducted = conducted + remainingClasses;
  const bestReachablePercent =
    totalPossibleConducted > 0
      ? ((attended + remainingClasses) / totalPossibleConducted) * 100
      : 0;

  return {
    planned: safePlanned,
    conducted,
    attended,
    percentage,
    category,
    isDefaulter,
    shortagePercent,
    classesNeeded,
    remainingClasses,
    isRecoveryFeasible,
    bestReachablePercent,
  };
}

export function getStudentSubjectStats(
  studentId: string,
  subject: SubjectItem,
  sessions: AttendanceSession[]
): AttendanceMetrics {
  const subjectSessions = sessions.filter(
    (s) => s.subjectId === subject.id && s.section === subject.section
  );
  const conducted = subjectSessions.length;
  const attended = subjectSessions.filter((s) =>
    s.presentStudentIds.includes(studentId)
  ).length;

  return calculateAttendanceMetrics(attended, conducted, subject.plannedClasses);
}

export function getStudentOverallStats(
  student: StudentUser,
  subjects: SubjectItem[],
  sessions: AttendanceSession[]
): AttendanceMetrics {
  const studentSubjects = subjects.filter(
    (sub) => sub.section === student.section
  );
  let totalPlanned = 0;
  let totalConducted = 0;
  let totalAttended = 0;

  for (const sub of studentSubjects) {
    const subSessions = sessions.filter(
      (s) => s.subjectId === sub.id && s.section === student.section
    );
    totalPlanned += sub.plannedClasses;
    totalConducted += subSessions.length;
    totalAttended += subSessions.filter((s) =>
      s.presentStudentIds.includes(student.id)
    ).length;
  }

  // If student was imported via Percentage List and has no session-level logs yet
  if (
    totalConducted === 0 &&
    typeof student.importedOverallPercent === 'number'
  ) {
    const pct = student.importedOverallPercent;
    const category = getAttendanceCategory(pct, true);
    const isDefaulter = pct < 75;
    const shortagePercent = isDefaulter ? Math.max(0, 75 - pct) : 0;
    return {
      planned: totalPlanned,
      conducted: 0,
      attended: 0,
      percentage: pct,
      category,
      isDefaulter,
      shortagePercent,
      classesNeeded: 0,
      remainingClasses: totalPlanned,
      isRecoveryFeasible: true,
      bestReachablePercent: 100,
    };
  }

  return calculateAttendanceMetrics(totalAttended, totalConducted, totalPlanned);
}
