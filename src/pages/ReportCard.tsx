import { useEffect } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Printer, ArrowLeft, Sparkles, BookOpen, Award, CheckCircle2, Circle, FileText, AlertTriangle, Download, Clock } from 'lucide-react';
import { getGradeFromPercentage } from '../types';
import { matchesMonth } from '../lib/utils';

export default function ReportCard() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { users, questions, assessments, cceMarks, settings, currentUser, skillClubMarks, studentTasks, taskTemplates } = useStore();

  const student = users.find(u => u.id === studentId && u.role === 'student');

  if (!student) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-500 font-bold">Student not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline font-bold">Go back</button>
        </div>
      </Layout>
    );
  }

  const mentor = users.find(u => u.id === student.mentorId);

  // Get marks for this student
  let studentMarks = cceMarks.filter(m => m.studentId === student.id);
  const showTotalMarks = !!settings.isTotalReportGenerated;

  // Normalize month matching

  // Report cards are now "full free" - no longer blocking access based on settings.reportCardsActive
  // unless explicitly requested to add a different toggle.
  
  // Filter marks based on report type
  const month = settings.reportMonth || settings.currentAssessmentMonth || 'August';

  if (!showTotalMarks) {
    const monthMatched = studentMarks.filter(m => matchesMonth(m.month, month));
    if (monthMatched.length > 0) {
      studentMarks = studentMarks.filter(m => !m.month || matchesMonth(m.month, month));
    }
    // If no marks matched this month specifically, keep all studentMarks so all marks are preserved
  }

  // CHECK COMPLETION STATUS
  
  // 1. Check Assessments Completion
  const requiredCategories = settings.assessmentCategories || [];
  const mentorId = student.mentorId;
  
  const studentAssessments = assessments.filter(a => a.studentId === student.id && matchesMonth(a.month, month));
  
  const teacherAssessments = studentAssessments.filter(a => a.assessorId === mentorId);
  const selfAssessments = studentAssessments.filter(a => a.assessorId === student.id);
  
  const teacherAssessedCategories = new Set(teacherAssessments.map(a => a.category));
  const selfAssessedCategories = new Set(selfAssessments.map(a => a.category));
  
  // Teacher assessment check:
  const teacherCategories = requiredCategories.filter(c => !c.toLowerCase().includes('spiritual'));
  const isTeacherDone = teacherCategories.length === 0 
    ? teacherAssessments.length > 0 
    : teacherCategories.every(cat => teacherAssessedCategories.has(cat));

  // Student self-assessment check:
  const isStudentDone = selfAssessments.length > 0;

  // USER REQUIREMENT: "If any assessments of teachers or students are not done then show only the cce marks of that month...."
  const allAssessmentsDone = isTeacherDone && isStudentDone;
  const showOnlyCCEMarks = !allAssessmentsDone;

  if (showOnlyCCEMarks) {
    // Strictly show ONLY the CCE marks belonging to that month
    studentMarks = studentMarks.filter(m => matchesMonth(m.month, month));
  }

  const assessmentsCompleted = allAssessmentsDone;

  // 2. Check Tasks Completion
  const studentTemplates = taskTemplates.filter(t => String(t.classGrade) === String(student.classGrade) && matchesMonth(t.month, month));
  const completedTasks = studentTasks.filter(t => t.studentId === student.id && t.completed && matchesMonth(t.month, month));
  const tasksCompleted = studentTemplates.length === 0 || completedTasks.length > 0 || studentTemplates.every(template => 
    completedTasks.some(t => t.templateId === template.id)
  );

  const isReady = assessmentsCompleted && tasksCompleted;
  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'teacher';


  // Aggregate academic subjects
  const subjects = Array.from(new Set(studentMarks.map(m => m.subject)));
  const aggregatedMarks = subjects.map(subject => {
    const marks = studentMarks.filter(m => m.subject === subject);
    const hasAbsent = marks.some(m => m.score === 'Ab');
    const allAbsent = marks.every(m => m.score === 'Ab');
    
    const totalScore = marks.reduce((sum, m) => sum + (m.score === 'Ab' ? 0 : m.score), 0);
    const totalMax = marks.reduce((sum, m) => sum + m.maxScore, 0);
    const outOf30 = totalMax > 0 ? (totalScore / totalMax) * 30 : 0;
    const percentage = (outOf30 / 30) * 100;
    const rawMarks = marks.map(m => ({
      cceLevel: m.cceLevel,
      score: m.score,
      maxScore: m.maxScore,
      description: m.description,
      date: m.date
    }));
    const descriptions = Array.from(new Set(marks.map(m => (m.description || '').trim()).filter(Boolean)));
    return { subject, outOf30, percentage, count: marks.length, totalScore, totalMax, hasAbsent, allAbsent, rawMarks, descriptions };
  });

  // Calculate Academic Overall
  const academicTotalScore = aggregatedMarks.reduce((sum, m) => sum + m.totalScore, 0);
  const academicTotalMax = aggregatedMarks.reduce((sum, m) => sum + m.totalMax, 0);
  const academicHasAbsent = aggregatedMarks.some(m => m.hasAbsent);
  const academicTotalCCE = aggregatedMarks.reduce((sum, m) => sum + m.outOf30, 0);
  const academicMaxCCE = aggregatedMarks.length * 30;
  const academicTotalPct = academicMaxCCE > 0 ? (academicTotalCCE / academicMaxCCE) * 100 : 0;
  const overallAcademicGrade = aggregatedMarks.length > 0 ? getGradeFromPercentage(academicTotalPct) : null;

  // Process Wellbeing / Character Parameters
  interface WellbeingItem {
    category: string;
    field: string;
    score: number | null;
    grade: ReturnType<typeof getGradeFromPercentage> | null;
  }

  const wellbeingList: WellbeingItem[] = [];
  (settings.assessmentCategories || []).forEach(category => {
    const categoryFields = (settings.categoryFields || {})[category] || [];
    categoryFields.forEach(field => {
      const normalizedField = (field || '').trim().toLowerCase();
      const fieldQuestionIds = questions.filter(q => 
        q.category === category && 
        (q.field || '').trim().toLowerCase() === normalizedField
      ).map(q => q.id);

      if (fieldQuestionIds.length === 0) return;

      const categoryAssessments = assessments.filter(a => 
        a.studentId === student.id && 
        a.category === category &&
        matchesMonth(a.month, month)
      );

      const latestScores: Record<string, number> = {};
      categoryAssessments
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(a => {
          Object.entries(a.scores || {}).forEach(([qId, score]) => {
            if (score !== undefined) latestScores[qId] = Number(score);
          });
        });

      const scoresInField = fieldQuestionIds.map(id => latestScores[id]).filter(s => s !== undefined);
      const fieldAvg = scoresInField.length > 0 ? scoresInField.reduce((a, b) => a + b, 0) / scoresInField.length : null;
      const grade = fieldAvg !== null ? getGradeFromPercentage(fieldAvg) : null;

      wellbeingList.push({
        category,
        field,
        score: fieldAvg,
        grade
      });
    });
  });

  const validWellbeingScores = wellbeingList.filter(item => item.score !== null).map(item => item.score as number);
  const wellbeingAvg = validWellbeingScores.length > 0
    ? validWellbeingScores.reduce((a, b) => a + b, 0) / validWellbeingScores.length
    : null;
  const overallWellbeingGrade = wellbeingAvg !== null ? getGradeFromPercentage(wellbeingAvg) : null;

  // Overall Holistic Combined Rating
  const allHolisticPct: number[] = [];
  if (aggregatedMarks.length > 0) allHolisticPct.push(academicTotalPct);
  if (wellbeingAvg !== null) allHolisticPct.push(wellbeingAvg);
  const holisticOverallAvg = allHolisticPct.length > 0 
    ? allHolisticPct.reduce((a, b) => a + b, 0) / allHolisticPct.length 
    : null;
  const holisticOverallGrade = holisticOverallAvg !== null ? getGradeFromPercentage(holisticOverallAvg) : null;

  // Skill Club Points
  const studentClubMarks = skillClubMarks.filter(m => 
    m.studentId === student.id && 
    (showTotalMarks ? true : matchesMonth(m.month, month))
  );
  
  const totalClubScore = studentClubMarks.reduce((s, m) => s + (m.score === 'Ab' ? 0 : m.score), 0);

  // Completed Tasks
  const studentCompletedTasks = studentTasks.filter(t => 
    t.studentId === student.id && 
    t.completed && 
    (showTotalMarks ? true : matchesMonth(t.month, month))
  );

  useEffect(() => {
    if (window.location.search.includes('download=true') || window.location.search.includes('print=true')) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const printReport = () => {
    window.print();
  };

  const isReportEmpty = aggregatedMarks.length === 0 && wellbeingList.every(item => item.score === null) && studentCompletedTasks.length === 0 && studentClubMarks.length === 0;

  return (
    <div className="print-report-wrapper">
      <Layout>
        {/* Top Action Bar (hidden in print) */}
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden w-full px-4">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 text-slate-600 hover:text-blue-700 transition-colors text-xs font-black uppercase tracking-wider bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to List
            </button>
            {isPrivileged && (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                Admin Privileged Access • Download Enabled For All Statuses
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={printReport}
              disabled={isReportEmpty && !isPrivileged}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black transition-all shadow-md text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download and save report card as PDF"
            >
              <Download className="w-4 h-4" /> Download Report Card (PDF)
            </button>
            <button 
              onClick={printReport}
              disabled={isReportEmpty && !isPrivileged}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-black transition-all shadow-md text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print report card directly"
            >
              <Printer className="w-4 h-4" /> Print (Full A4)
            </button>
          </div>
        </div>

        {showOnlyCCEMarks && (
          <div className="w-full bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-2xl shadow-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-950">
                  CCE Marks Evaluation Mode (Assessments Incomplete)
                </p>
                <p className="text-xs text-blue-800 mt-0.5">
                  Teacher or student behavioral assessments for {month} are not yet completed. Displaying verified Continuous Comprehensive Evaluation (CCE) marks for this period. Admin can download or print this report card anytime.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={printReport}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download Pending Card
              </button>
            </div>
          </div>
        )}

        {isReportEmpty && (
          <div className="w-full bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm mb-6">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">No Records Found</h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm">There are no academic CCE marks or assessments logged for <strong>{month}</strong> yet. Please check back once your teachers have entered your marks.</p>
          </div>
        )}

        {!isReportEmpty && (
          <div className="print-report-container bg-white p-8 sm:p-16 rounded-2xl shadow-2xl border-2 border-slate-900/10 w-full print:p-8 print:shadow-none print:border-none print:max-w-full text-slate-900 leading-relaxed relative overflow-hidden print:overflow-visible min-h-[1100px] print:min-h-0">
        
        {/* 1. Header Section */}
        <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 print:pb-6 print:mb-8">
          <div className="flex justify-between items-center gap-4">
            
            {/* Campus Identity */}
            <div className="flex items-center gap-4">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Campus Logo" className="w-16 h-16 object-contain shrink-0 print:w-20 print:h-20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shrink-0 print:w-20 print:h-20">
                  <GraduationCap className="w-8 h-8 print:w-10 print:h-10" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase print:text-2xl leading-tight">
                  {settings.name || "Grand Campus Assurance"}
                </h1>
                <p className="text-slate-600 font-extrabold text-[10px] uppercase tracking-widest mt-0.5 print:text-[12px]">
                  Official Academic & Character Progress Transcript
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-[9px] font-black uppercase tracking-widest print:text-[11px]">
                    {settings.academicYear || 'Academic Year'}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-[9px] font-black uppercase tracking-widest border border-slate-300 print:text-[11px]">
                    {settings.currentSemester || 'Semester'}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-200 print:text-[11px]">
                    {showTotalMarks ? 'Annual Cumulative' : `Cycle: ${settings.reportMonth || 'Standard'}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Student Profile Card (Compact) */}
            <div className="flex items-center gap-3.5 bg-slate-50/90 px-4 py-3 rounded-2xl border border-slate-200 print:bg-white print:border-slate-400 print:py-4 print:px-6">
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 print:text-[10px]">Student</p>
                <h2 className="text-sm font-black text-slate-900 leading-tight print:text-xl">{student.name}</h2>
                <div className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-slate-600 mt-0.5 uppercase print:text-[11px]">
                  <span>Class {student.classGrade || '-'}</span>
                  <span>•</span>
                  <span>Sec {student.section || '-'}</span>
                  <span>•</span>
                  <span className="text-blue-700 font-black">ID: {student.admissionNumber || student.id.slice(0, 6).toUpperCase()}</span>
                </div>
              </div>
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-md shrink-0 print:w-16 print:h-16" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white border-2 border-white flex items-center justify-center font-black text-base shadow-md shrink-0 print:w-16 print:h-16 print:text-xl">
                  {student.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Rating Strip */}
        {showOnlyCCEMarks ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 print:mb-8 print:gap-4">
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center justify-between print:bg-slate-50 print:border-slate-300 print:py-4 print:px-6">
              <div>
                <p className="text-[8px] font-black text-blue-900/60 uppercase tracking-widest print:text-[10px]">Academic Evaluation (CCE)</p>
                <p className="text-xs font-black text-blue-950 mt-0.5 print:text-base">
                  {aggregatedMarks.length > 0 ? `${academicTotalCCE.toFixed(1)} / ${academicMaxCCE} (${academicTotalPct.toFixed(0)}%)` : 'No Records'}
                </p>
              </div>
              {overallAcademicGrade && (
                <span className="text-xs font-black bg-blue-700 text-white px-2.5 py-0.5 rounded-md shadow-xs print:text-sm print:px-3">
                  {overallAcademicGrade.label}
                </span>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between print:bg-white print:border-slate-300">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest print:text-[10px]">Reporting Cycle</p>
                <p className="text-xs font-black text-slate-800 mt-0.5 print:text-base">{month}</p>
              </div>
              <span className="text-[9px] font-bold uppercase text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                {settings.academicYear || 'Current Year'}
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center justify-between print:bg-white print:border-slate-300">
              <div>
                <p className="text-[8px] font-black text-emerald-900/60 uppercase tracking-widest print:text-[10px]">Evaluation Status</p>
                <p className="text-xs font-black text-emerald-950 mt-0.5 print:text-sm">CCE Marks Published</p>
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                Verified
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 mb-4 print:mb-8 print:gap-4">
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-3.5 py-2 flex items-center justify-between print:bg-slate-50 print:border-slate-300 print:py-4 print:px-6">
              <div>
                <p className="text-[8px] font-black text-blue-900/60 uppercase tracking-widest print:text-[10px]">Academic (CCE)</p>
                <p className="text-xs font-black text-blue-950 mt-0.5 print:text-base">
                  {aggregatedMarks.length > 0 ? `${academicTotalCCE.toFixed(1)} / ${academicMaxCCE} (${academicTotalPct.toFixed(0)}%)` : 'No Records'}
                </p>
              </div>
              {overallAcademicGrade && (
                <span className="text-xs font-black bg-blue-700 text-white px-2 py-0.5 rounded-md shadow-xs print:text-sm print:px-3">
                  {overallAcademicGrade.label}
                </span>
              )}
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-3.5 py-2 flex items-center justify-between print:bg-slate-50 print:border-slate-200">
              <div>
                <p className="text-[8px] font-black text-emerald-900/60 uppercase tracking-widest">Conduct & Wellbeing</p>
                <p className="text-xs font-black text-emerald-950 mt-0.5">
                  {wellbeingAvg !== null ? `${wellbeingAvg.toFixed(0)}% Index` : 'Pending Evaluation'}
                </p>
              </div>
              {overallWellbeingGrade && (
                <span className="text-xs font-black bg-emerald-700 text-white px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                  {overallWellbeingGrade.label} {overallWellbeingGrade.emoji}
                </span>
              )}
            </div>

            <div className="bg-indigo-900 text-white border border-indigo-950 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs print:bg-slate-900">
              <div>
                <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Holistic Index</p>
                <p className="text-xs font-black text-white mt-0.5">
                  {holisticOverallAvg !== null ? `${holisticOverallAvg.toFixed(0)}% Overall` : 'In Progress'}
                </p>
              </div>
              {holisticOverallGrade && (
                <span className="text-xs font-black bg-white text-indigo-950 px-2 py-0.5 rounded-md shadow-xs">
                  Grade {holisticOverallGrade.label}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 3. DUAL-TABLE SIDE-BY-SIDE MATRIX OR CCE-ONLY FULL TABLE */}
        {showOnlyCCEMarks ? (
          /* SHOW ONLY THE CCE MARKS OF THAT MONTH */
          <div className="mb-4 print:mb-8">
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white print:border-slate-400">
              <div className="bg-slate-900 text-white px-3.5 py-2 flex justify-between items-center print:py-3 print:px-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400 print:w-5 print:h-5" />
                  <span className="text-[10px] font-black uppercase tracking-wider print:text-[12px]">Academic Performance (Continuous Comprehensive Evaluation - CCE)</span>
                </div>
                <span className="text-[8px] font-bold text-slate-300 uppercase print:text-[10px]">Weight: 30 Marks</span>
              </div>

              <table className="w-full text-left border-collapse text-[10px] print:text-[12px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[8px] print:text-[10px]">
                    <th className="px-3.5 py-2 print:py-3 print:px-4">Subject</th>
                    <th className="px-2.5 py-2 text-right print:py-3 print:px-4">Raw Score</th>
                    <th className="px-2.5 py-2 text-right print:py-3 print:px-4">CCE (30)</th>
                    <th className="px-3.5 py-2 text-right print:py-3 print:px-4">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedMarks.length > 0 ? (
                    aggregatedMarks.map((mark, i) => {
                      const grade = getGradeFromPercentage(mark.percentage);
                      return (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="px-3.5 py-2 font-bold text-slate-900 truncate max-w-[200px] print:max-w-none print:py-2.5 print:px-4">
                            {mark.subject}
                          </td>
                          <td className="px-2.5 py-2 text-right font-medium text-slate-600 print:py-2.5 print:px-4">
                            {mark.allAbsent ? (
                              <span className="text-rose-600 font-black">Ab</span>
                            ) : (
                              <>
                                {mark.totalScore}/{mark.totalMax}
                                {mark.hasAbsent && <span className="ml-1 text-[8px] text-rose-500 font-bold">(Ab)</span>}
                              </>
                            )}
                          </td>
                          <td className="px-2.5 py-2 text-right font-black text-slate-900 print:py-2.5 print:px-4">
                            {mark.allAbsent ? '0.0' : mark.outOf30.toFixed(1)}
                          </td>
                          <td className="px-3.5 py-2 text-right font-black text-blue-800 print:py-2.5 print:px-4">
                            {grade.label}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400 font-bold uppercase text-[9px] print:text-[11px] print:py-12">
                        No CCE marks recorded for this period
                      </td>
                    </tr>
                  )}
                </tbody>
                {aggregatedMarks.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-black text-slate-900 text-[9px] print:text-[11px]">
                      <td className="px-3.5 py-2 uppercase print:py-3 print:px-4">Academic Aggregate</td>
                      <td className="px-2.5 py-2 text-right text-slate-600 print:py-3 print:px-4">
                        {academicTotalScore}/{academicTotalMax}
                        {academicHasAbsent && <span className="ml-1 text-[7px] text-rose-500 font-bold">(Inc. Ab)</span>}
                      </td>
                      <td className="px-2.5 py-2 text-right text-blue-900 print:py-3 print:px-4">{academicTotalCCE.toFixed(1)}/{academicMaxCCE}</td>
                      <td className="px-3.5 py-2 text-right text-blue-900 print:py-3 print:px-4">{overallAcademicGrade?.label || '-'}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              
              {/* Skill Club Subsection if points exist (hidden in CCE-only mode) */}
              {studentClubMarks.length > 0 && !showOnlyCCEMarks && (
                <>
                  <div className="bg-amber-50 border-t border-slate-200 px-3 py-1.5 flex items-center gap-2 print:py-3 print:px-4">
                    <Award className="w-3.5 h-3.5 text-amber-600 print:w-5 print:h-5" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 print:text-[11px]">Extra-Curricular: Skill Clubs</span>
                  </div>
                  <table className="w-full text-left border-collapse text-[10px] bg-amber-50/30 print:text-[12px]">
                    <tbody className="divide-y divide-amber-100/50">
                      <tr>
                        <td className="px-3.5 py-2 font-bold text-amber-900 print:py-3 print:px-4">Total Skill Club Points Earned</td>
                        <td className="px-3.5 py-2 text-right font-black text-amber-700 print:py-3 print:px-4">
                          {totalClubScore} pts
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 print:grid-cols-2 print:gap-8 print:mb-8 items-start">
            
            {/* Table A: Character, Spiritual & Behavioral Wellbeing */}
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white print:border-slate-400">
              <div className="bg-slate-900 text-white px-3 py-1.5 flex justify-between items-center print:py-3 print:px-4">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 print:w-5 print:h-5" />
                  <span className="text-[9px] font-black uppercase tracking-wider print:text-[11px]">A. Wellbeing & Conduct Evaluation</span>
                </div>
                <span className="text-[8px] font-bold text-slate-300 uppercase print:text-[10px]">Self & Mentor Assessment</span>
              </div>

              <table className="w-full text-left border-collapse text-[10px] print:text-[12px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[8px] print:text-[10px]">
                    <th className="px-3 py-1.5 print:py-3 print:px-4">Category</th>
                    <th className="px-2 py-1.5 print:py-3 print:px-4">Evaluated Parameter</th>
                    <th className="px-3 py-1.5 text-right print:py-3 print:px-4">Rating / Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wellbeingList.length > 0 ? (
                    wellbeingList.map((item, idx) => {
                      const isSpiritual = (item.category || '').toLowerCase().includes('spiritual');
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="px-3 py-1.5 font-bold print:py-3 print:px-4">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight print:text-[10px] ${
                              isSpiritual 
                                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' 
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isSpiritual ? 'bg-indigo-600' : 'bg-emerald-600'}`}></span>
                              {item.category.replace(' Wellbeing', '').replace('Wellbeing', '')}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 font-bold text-slate-800 truncate max-w-[150px] print:max-w-none print:py-3 print:px-4">
                            {item.field}
                          </td>
                          <td className="px-3 py-1.5 text-right font-black print:py-3 print:px-4">
                            {item.grade ? (
                              <span className="inline-flex items-center gap-1 text-slate-900">
                                <span>{item.grade.label}</span>
                                <span className="text-xs print:text-sm">{item.grade.emoji}</span>
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-slate-400 uppercase italic print:text-[10px]">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-400 font-bold uppercase text-[9px] print:text-[11px] print:py-12">
                        No character assessment parameters configured
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Completed Tasks Subsection */}
              <div className="bg-indigo-50 border-t border-slate-200 px-3 py-1.5 flex items-center gap-2 print:py-3 print:px-4">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 print:w-5 print:h-5" />
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-800 print:text-[11px]">Monthly Growth: Completed Tasks</span>
              </div>
              <div className="p-3 bg-indigo-50/30 print:p-6">
                {studentCompletedTasks.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 print:gap-y-3">
                    {studentCompletedTasks.map((task, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-0.5 shrink-0 print:w-3.5 print:h-3.5"></div>
                        <div>
                          <p className="text-[9px] font-bold text-indigo-900 leading-tight print:text-[11px]">
                            {task.customTitle || taskTemplates.find(t => t.id === task.templateId)?.title || 'Growth Task'}
                          </p>
                          {task.quantity && (
                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter print:text-[10px]">Done: {task.quantity}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-indigo-400 font-bold uppercase text-[8px] italic py-2 print:text-[10px] print:py-4">
                    No monthly tasks logged
                  </p>
                )}
              </div>
            </div>

            {/* Table B: Academic CCE Performance */}
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white print:border-slate-400">
              <div className="bg-slate-900 text-white px-3 py-1.5 flex justify-between items-center print:py-3 print:px-4">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400 print:w-5 print:h-5" />
                  <span className="text-[9px] font-black uppercase tracking-wider print:text-[11px]">B. Academic Performance (CCE)</span>
                </div>
                <span className="text-[8px] font-bold text-slate-300 uppercase print:text-[10px]">Weight: 30 Marks</span>
              </div>

              <table className="w-full text-left border-collapse text-[10px] print:text-[12px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[8px] print:text-[10px]">
                    <th className="px-3 py-1.5 print:py-3 print:px-4">Subject</th>
                    <th className="px-2 py-1.5 text-right print:py-3 print:px-4">Raw Score</th>
                    <th className="px-2 py-1.5 text-right print:py-3 print:px-4">CCE (30)</th>
                    <th className="px-3 py-1.5 text-right print:py-3 print:px-4">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedMarks.length > 0 ? (
                    aggregatedMarks.map((mark, i) => {
                      const grade = getGradeFromPercentage(mark.percentage);
                      return (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="px-3 py-1.5 font-bold text-slate-900 truncate max-w-[140px] print:max-w-none print:py-2.5 print:px-4">
                            {mark.subject}
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium text-slate-600 print:py-2.5 print:px-4">
                            {mark.allAbsent ? (
                              <span className="text-rose-600 font-black">Ab</span>
                            ) : (
                              <>
                                {mark.totalScore}/{mark.totalMax}
                                {mark.hasAbsent && <span className="ml-1 text-[8px] text-rose-500 font-bold">(Ab)</span>}
                              </>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-black text-slate-900 print:py-2.5 print:px-4">
                            {mark.allAbsent ? '0.0' : mark.outOf30.toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-black text-blue-800 print:py-2.5 print:px-4">
                            {grade.label}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400 font-bold uppercase text-[9px] print:text-[11px] print:py-12">
                        No CCE marks recorded for this period
                      </td>
                    </tr>
                  )}
                </tbody>
                {aggregatedMarks.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-black text-slate-900 text-[9px] print:text-[11px]">
                      <td className="px-3 py-1.5 uppercase print:py-3 print:px-4">Academic Aggregate</td>
                      <td className="px-2 py-1.5 text-right text-slate-600 print:py-3 print:px-4">
                        {academicTotalScore}/{academicTotalMax}
                        {academicHasAbsent && <span className="ml-1 text-[7px] text-rose-500 font-bold">(Inc. Ab)</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right text-blue-900 print:py-3 print:px-4">{academicTotalCCE.toFixed(1)}/{academicMaxCCE}</td>
                      <td className="px-3 py-1.5 text-right text-blue-900 print:py-3 print:px-4">{overallAcademicGrade?.label || '-'}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              
              {/* Skill Club Subsection */}
              <div className="bg-amber-50 border-t border-slate-200 px-3 py-1.5 flex items-center gap-2 print:py-3 print:px-4">
                <Award className="w-3.5 h-3.5 text-amber-600 print:w-5 print:h-5" />
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 print:text-[11px]">Extra-Curricular: Skill Clubs</span>
              </div>
              <table className="w-full text-left border-collapse text-[10px] bg-amber-50/30 print:text-[12px]">
                <tbody className="divide-y divide-amber-100/50">
                  {studentClubMarks.length > 0 ? (
                    <tr>
                      <td className="px-3 py-1.5 font-bold text-amber-900 print:py-3 print:px-4">Total Skill Club Points Earned</td>
                      <td className="px-3 py-1.5 text-right font-black text-amber-700 print:py-3 print:px-4">
                        {totalClubScore} pts
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-3 py-3 text-center text-amber-400 font-bold uppercase text-[8px] italic print:text-[10px] print:py-6">
                        No skill club points recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* 4. Grade Scale Guide (Compact 1-liner) */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 mb-4 print:mb-8 print:py-3 print:px-6 flex items-center justify-between text-[8px] text-slate-600 font-semibold print:text-[10px]">
          <span className="font-black text-slate-800 uppercase tracking-wider">Evaluation Key:</span>
          <div className="flex items-center gap-3 print:gap-6">
            <span><strong>O</strong> (90-100% Outstanding)</span>
            <span><strong>A+</strong> (80-89% Excellent)</span>
            <span><strong>A</strong> (70-79% Very Good)</span>
            <span><strong>B+</strong> (60-69% Good)</span>
            <span><strong>B</strong> (50-59% Satisfactory)</span>
            <span><strong>C</strong> (&lt;50% Needs Focus)</span>
          </div>
        </div>

        {/* 5. Disclaimer */}
        <div className="text-[8px] text-slate-500 font-medium leading-normal mb-5 print:mb-12 px-1 print:text-[10px]">
          <p>
            <strong>Disclaimer:</strong> The Result published online is provisional and can't be used for any official purpose.
          </p>
        </div>

        {/* 6. Signatures Section (Always avoids page break) */}
        <div className="pt-3 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center print:pt-6 print:break-inside-avoid">
          <div className="space-y-1">
            <div className="h-9 flex items-end justify-center print:h-12">
              <div className="w-28 border-b border-slate-400 print:w-40"></div>
            </div>
            <p className="text-[8px] font-black text-slate-900 uppercase tracking-wider print:text-[11px]">Assigned Mentor</p>
            <p className="text-[7px] text-slate-500 font-medium print:text-[10px]">{mentor?.name || 'Class Mentor'}</p>
          </div>

          <div className="space-y-1">
            <div className="h-9 flex items-end justify-center print:h-12">
              <div className="w-28 border-b border-slate-400 print:w-40"></div>
            </div>
            <p className="text-[8px] font-black text-slate-900 uppercase tracking-wider print:text-[11px]">Parent / Guardian</p>
            <p className="text-[7px] text-slate-500 font-medium print:text-[10px]">Signature & Date</p>
          </div>

          <div className="space-y-1">
            <div className="h-9 flex items-end justify-center flex-col items-center print:h-12">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Seal" className="w-5 h-5 object-contain opacity-30 grayscale mb-1 print:w-8 print:h-8" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-slate-300 mb-1 print:w-8 print:h-8"></div>
              )}
              <div className="w-28 border-b border-slate-400 print:w-40"></div>
            </div>
            <p className="text-[8px] font-black text-slate-900 uppercase tracking-wider print:text-[11px]">Office of Academic Affairs</p>
            <p className="text-[7px] text-slate-500 font-medium print:text-[10px]">Institutional Quality Seal</p>
          </div>
        </div>

        {/* 7. Footer Stamp */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[7px] text-slate-400 font-medium tracking-tight print:mt-12 print:text-[9px]">
          <span>{settings.name || "Grand Campus Assurance"} • Automated Academic Transcript</span>
          <span>Verified ID: {student.id.slice(0, 10).toUpperCase()} • Generated: {new Date().toLocaleDateString()}</span>
        </div>

      </div>
        )}
      </Layout>
    </div>
  );
}
