import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Printer, ArrowLeft } from 'lucide-react';
import { getGradeFromPercentage } from '../types';

export default function ReportCard() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { users, questions, assessments, cceMarks, settings, currentUser } = useStore();

  const student = users.find(u => u.id === studentId && u.role === 'student');

  if (!student) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-500 font-bold">Student not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Go back</button>
        </div>
      </Layout>
    );
  }

  // Date helpers
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const releasedMonthIndex = MONTHS.indexOf(settings.reportMonth || '');
  const visibleMonths = settings.reportMonth ? [settings.reportMonth] : [];
  if (releasedMonthIndex > 0) visibleMonths.push(MONTHS[releasedMonthIndex - 1]);
  else if (releasedMonthIndex === 0) visibleMonths.push(MONTHS[11]);

  // Get marks for this student
  let studentMarks = cceMarks.filter(m => m.studentId === student.id);
  
  const showTotalMarks = !!settings.isTotalReportGenerated;
  const isMonthlyReportActive = settings.isReportGenerated && !showTotalMarks;

  if (currentUser?.role === 'student') {
    if (!settings.reportCardsActive) {
      return (
        <Layout>
          <div className="text-center py-20 px-4">
            <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Not Available Yet</h2>
              <p className="text-slate-600 mb-6">Your report card has not been released by the academic office yet. Please check back later.</p>
              <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline font-medium">Return to Dashboard</button>
            </div>
          </div>
        </Layout>
      );
    }
  }

  // Filter marks based on report type
  if (!showTotalMarks && settings.reportMonth) {
    // If we are looking at a monthly report, ONLY show the marks for that month
    studentMarks = studentMarks.filter(m => m.month === settings.reportMonth);
  }

  const subjects = Array.from(new Set(studentMarks.map(m => m.subject)));
  const aggregatedMarks = subjects.map(subject => {
    const marks = studentMarks.filter(m => m.subject === subject);
    const totalScore = marks.reduce((sum, m) => sum + m.score, 0);
    const totalMax = marks.reduce((sum, m) => sum + m.maxScore, 0);
    const outOf30 = totalMax > 0 ? (totalScore / totalMax) * 30 : 0;
    // Map outOf30 (0-30) to percentage (0-100) for Grade evaluation
    const percentage = (outOf30 / 30) * 100;
    return { subject, outOf30, percentage, count: marks.length, totalScore, totalMax };
  });

  // Calculate current semester performance percentage from CCE marks
  const totalScoreAllSubjects = aggregatedMarks.reduce((sum, m) => sum + m.totalScore, 0);
  const totalMaxAllSubjects = aggregatedMarks.reduce((sum, m) => sum + m.totalMax, 0);
  const currentAcademicPct = totalMaxAllSubjects > 0 
    ? Math.round((totalScoreAllSubjects / totalMaxAllSubjects) * 100 * 10) / 10 
    : 85;

  const currentSemLabel = settings.currentSemester 
    ? `${settings.currentSemester} (Current)` 
    : 'Current Sem';

  const printReport = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button 
          onClick={printReport}
          className="flex items-center gap-2 bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-md"
        >
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </div>

      <div className="bg-white p-10 sm:p-14 rounded-xl shadow-xl shadow-blue-100 border border-slate-200 max-w-4xl mx-auto print:p-0 print:shadow-none print:border-0 relative overflow-hidden font-serif">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-600 to-indigo-700 print:hidden"></div>
        
        {/* Header & Student Details Combined */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-blue-900 pb-8 mb-8 print:pb-6 print:mb-6 gap-8">
          
          {/* Left Side: School Info */}
          <div className="flex flex-col items-start text-left w-full md:w-[50%]">
            <div className="flex flex-row items-center gap-4 mb-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Campus Logo" className="w-20 h-20 object-contain print:w-16 print:h-16 shrink-0" />
              ) : (
                <div className="bg-blue-900 p-3 rounded-xl shadow-lg shadow-blue-200 print:w-16 print:h-16 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-10 h-10 text-white print:w-8 print:h-8" />
                </div>
              )}
              <div className="text-left flex-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase print:text-xl leading-none mb-2">{settings.name || "Darul Huda Punganur"}</h1>
                <p className="text-blue-600 tracking-widest uppercase text-xs font-bold">Official Student Report Card</p>
              </div>
            </div>
            {(settings.academicYear || settings.currentSemester) && (
              <p className="text-slate-600 font-bold text-xs mt-1">
                {settings.academicYear} {settings.academicYear && settings.currentSemester ? '|' : ''} {settings.currentSemester}
              </p>
            )}
          </div>

          {/* Right Side: Student Details */}
          <div className="flex flex-row gap-6 w-full md:w-[50%] justify-end">
            <div className="flex flex-col justify-center text-right">
              <h2 className="text-2xl font-black text-slate-900 leading-tight mb-3">{student.name}</h2>
              <div className="space-y-1.5 inline-block text-right">
                <p className="text-sm font-bold text-slate-700"><span className="text-[10px] text-slate-500 uppercase tracking-widest mr-2 font-sans">Grade & Sec:</span> Grade {student.classGrade || 'N/A'} • Sec {student.section || 'N/A'}</p>
                <p className="text-sm font-bold text-slate-700"><span className="text-[10px] text-slate-500 uppercase tracking-widest mr-2 font-sans">Adm No:</span> {student.admissionNumber || 'PENDING'}</p>
                <p className="text-sm font-bold text-slate-700"><span className="text-[10px] text-slate-500 uppercase tracking-widest mr-2 font-sans">Status:</span> Active</p>
              </div>
            </div>
            {student.photoUrl && (
              <div className="shrink-0">
                <img src={student.photoUrl} alt={student.name} className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm print:border-slate-300" />
              </div>
            )}
          </div>

        </div>

        {/* Non-Exam Assessments */}
        {/* Non-Exam Assessments */}
        <div className="mb-10 print:mb-4">
          <h3 className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-6 print:mb-3">Non-Exam Assessments</h3>
          
          <div className="space-y-8">
            {(['spiritual', 'behavioural'] as const).map(category => {
              const categoryFields = category === 'spiritual' ? settings.spiritualFields : settings.behaviouralFields;
              if (!categoryFields || categoryFields.length === 0) return null;

              return (
                <div key={category} className="space-y-4">
                  <div className="border-l-4 border-blue-900 pl-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                      {category === 'spiritual' ? 'Spiritual Wellbeing' : 'Behavioural Conduct'}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryFields.map(field => {
                      // Find questions in this field
                      const fieldQuestionIds = questions
                        .filter(q => q.category === category && q.field === field)
                        .map(q => q.id);
                      
                      if (fieldQuestionIds.length === 0) return null;

                      // Find the latest assessment for this student in this category
                      const categoryAssessments = assessments.filter(a => a.studentId === student.id && a.category === category);
                      const latest = categoryAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                      
                      let fieldAvg: number | null = null;
                      if (latest) {
                        const scoresInField = fieldQuestionIds
                          .map(id => latest.scores[id])
                          .filter(s => s !== undefined) as number[];
                        
                        if (scoresInField.length > 0) {
                          const total = scoresInField.reduce((sum, score) => sum + score, 0);
                          fieldAvg = total / scoresInField.length;
                        }
                      }
                      
                      const grade = fieldAvg !== null ? getGradeFromPercentage(fieldAvg) : null;

                      return (
                        <div key={field} className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                          <div className="flex justify-between items-center bg-slate-50 p-4 border-b border-slate-200 print:bg-slate-100 print:border-slate-300">
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight m-0">
                              {field}
                            </h3>
                            {grade ? (
                              <div className="text-right">
                                <span className="text-sm font-bold text-slate-900">{grade.label}</span>
                                <span className="text-sm ml-2">{grade.emoji}</span>
                              </div>
                            ) : (
                              <span className="text-xs italic text-slate-400">N/A</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exam Marks */}
        <div className="mb-12 border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:mb-4">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between print:bg-slate-100 print:border-slate-300 print:p-3">
            <h3 className="text-sm font-bold text-slate-500 m-0 uppercase tracking-wider">
              Academic Performance (CCE)
            </h3>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-1 sm:mt-0">
              {showTotalMarks ? 'Semester Total' : `Monthly Report - ${settings.reportMonth || 'Current'}`}
            </span>
          </div>
          
          {aggregatedMarks.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 print:bg-transparent print:border-slate-300">
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase print:py-2">Subject</th>
                  {!showTotalMarks ? (
                    <>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase text-right print:py-2">Month Score</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase text-right print:py-2">Month Max</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase text-right print:py-2">Total Score</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase text-right print:py-2">Total Max</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase text-right print:py-2">CCE Score (Max 30)</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase text-right print:py-2">Grade</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {aggregatedMarks.map((mark, i) => {
                  const grade = getGradeFromPercentage(mark.percentage);
                  return (
                    <tr key={i}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800 print:py-2">{mark.subject}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 text-right print:py-2">{mark.totalScore}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 text-right print:py-2">{mark.totalMax}</td>
                      {showTotalMarks ? (
                        <>
                          <td className="px-6 py-4 text-sm font-black text-slate-900 text-right print:py-2">{mark.outOf30.toFixed(1)} / 30</td>
                          <td className="px-6 py-4 text-right print:py-2">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                              mark.percentage >= 80 ? 'bg-blue-100 text-blue-800' :
                              mark.percentage >= 60 ? 'bg-indigo-100 text-indigo-800' :
                              'bg-rose-100 text-rose-800'
                            } print:border-0 print:bg-transparent print:p-0 print:text-black`}>
                              {grade.label} {grade.emoji}
                            </span>
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 italic">
              No academic records available for this student.
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="mt-16 pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-center print:border-slate-300 print:mt-6 print:pt-4">
          <div>
            <div className="h-16 border-b border-slate-300 w-48 mx-auto print:border-slate-400 print:h-12"></div>
            <p className="mt-2 text-sm font-bold text-slate-800 uppercase tracking-wider">Class Teacher</p>
          </div>
          <div>
            <div className="h-16 border-b border-slate-300 w-48 mx-auto print:border-slate-400 print:h-12"></div>
            <p className="mt-2 text-sm font-bold text-slate-800 uppercase tracking-wider">Principal / Academic Office</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-xs text-slate-400 print:text-slate-500 print:mt-6">
          <p>This is an official document generated by the Darul Huda Punganur Assurance Portal.</p>
          <p className="mt-1">Date Generated: {new Date().toLocaleDateString()}</p>
        </div>

      </div>
    </Layout>
  );
}
