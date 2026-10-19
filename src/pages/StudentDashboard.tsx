import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { 
  FileText, CheckCircle2, UserCircle, Upload, TrendingUp, HelpCircle, 
  X, Info, LayoutDashboard, Sparkles, GraduationCap, ShieldCheck, 
  CheckSquare, BookOpen, AlertTriangle, PenLine, Clock, Calendar, 
  ArrowRight, Search, Award, Check, ChevronRight, UserCheck, Flame, 
  Filter, RefreshCw, BarChart2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { matchesMonth } from '../lib/utils';
import { Question } from '../types';
import { ProgressChart } from '../components/ProgressChart';

export default function StudentDashboard() {
  const { 
    currentUser, 
    users, 
    questions, 
    assessments, 
    addAssessment, 
    settings, 
    updateUser, 
    taskTemplates, 
    studentTasks, 
    cceMarks,
    subjects
  } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const month = settings.reportMonth || settings.currentAssessmentMonth || 'August';
  
  // Subjects in order for student's class
  const studentSubjects = useMemo(() => {
    const classSubjects = (subjects || []).filter(s => String(s.classGrade) === String(currentUser?.classGrade));
    if (classSubjects.length > 0) {
      return classSubjects.sort((a, b) => a.name.localeCompare(b.name));
    }
    const fromMarks = Array.from(new Set((cceMarks || []).map(m => m.subject)));
    if (fromMarks.length > 0) {
      return fromMarks.sort().map((name, idx) => ({ id: String(idx), classGrade: currentUser?.classGrade || '1', name }));
    }
    return [
      { id: '1', classGrade: currentUser?.classGrade || '1', name: 'Arabic' },
      { id: '2', classGrade: currentUser?.classGrade || '1', name: 'English' },
      { id: '3', classGrade: currentUser?.classGrade || '1', name: 'Islamic Studies' },
      { id: '4', classGrade: currentUser?.classGrade || '1', name: 'Mathematics' },
      { id: '5', classGrade: currentUser?.classGrade || '1', name: 'Science' },
      { id: '6', classGrade: currentUser?.classGrade || '1', name: 'Social Studies' }
    ].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, currentUser?.classGrade, cceMarks]);

  const levels = ['CCE 1', 'CCE 2', 'CCE 3', 'CCE 4', 'Mid Term Exam'];

  const studentCceRows = useMemo(() => {
    const studentMarks = (cceMarks || []).filter(m => m.studentId === currentUser?.id);
    const rows: Array<{
      subject: string;
      cceLevel: string;
      mark: typeof cceMarks[0];
      status: 'scored' | 'ab' | 'zero';
    }> = [];

    const sortedMarks = [...studentMarks].sort((a, b) => {
      const subjCompare = a.subject.localeCompare(b.subject);
      if (subjCompare !== 0) return subjCompare;
      return a.cceLevel.localeCompare(b.cceLevel);
    });

    sortedMarks.forEach(mark => {
      const isAb = mark.score === 'Ab';
      const isZero = mark.score === 0;
      let status: 'scored' | 'ab' | 'zero' = 'scored';
      if (isAb) status = 'ab';
      else if (isZero) status = 'zero';

      rows.push({
        subject: mark.subject,
        cceLevel: mark.cceLevel,
        mark,
        status
      });
    });

    return rows;
  }, [cceMarks, currentUser?.id]);



  const studentTemplates = taskTemplates.filter(t => String(t.classGrade) === String(currentUser?.classGrade) && matchesMonth(t.month, month));
  const completedTasks = studentTasks.filter(t => t.studentId === currentUser?.id && t.completed && matchesMonth(t.month, month));
  const tasksCompleted = studentTemplates.length === 0 || completedTasks.length > 0 || studentTemplates.every(template => 
    completedTasks.some(t => t.templateId === template.id)
  );

  const studentAssessments = assessments.filter(a => a.studentId === currentUser?.id && matchesMonth(a.month, month));
  const requiredCategories = settings.assessmentCategories || [];
  const teacherAssessments = studentAssessments.filter(a => a.assessorId === currentUser?.mentorId);
  const selfAssessments = studentAssessments.filter(a => a.assessorId === currentUser?.id);
  const teacherAssessedCategories = new Set(teacherAssessments.map(a => a.category));
  const selfAssessedCategories = new Set(selfAssessments.map(a => a.category));
  
  const teacherCategories = requiredCategories.filter(c => !c.toLowerCase().includes('spiritual'));
  const isTeacherDone = teacherCategories.length === 0 
    ? teacherAssessments.length > 0 
    : teacherCategories.every(cat => teacherAssessedCategories.has(cat));
  const isStudentDone = selfAssessments.length > 0;
  const anyAssessmentPending = !isTeacherDone || !isStudentDone;
  const assessmentsCompleted = !anyAssessmentPending;

  const isReportReady = assessmentsCompleted && tasksCompleted;

  const tabParam = searchParams.get('tab') as 'report' | 'spiritual' | 'trends' | null;
  const activeTab = tabParam || 'report';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [scores, setScores] = useState<Record<string, number>>({});
  const [showTutorial, setShowTutorial] = useState(false);
  const [cceSearch, setCceSearch] = useState('');
  const [cceFilter, setCceFilter] = useState<'month' | 'all' | 'attended' | 'absent'>(anyAssessmentPending ? 'month' : 'all');
  const [isEditing, setIsEditing] = useState(false);

  const filteredCceRows = useMemo(() => {
    return studentCceRows.filter(row => {
      const matchesSearch = row.subject.toLowerCase().includes(cceSearch.toLowerCase()) ||
                            row.cceLevel.toLowerCase().includes(cceSearch.toLowerCase()) ||
                            (row.mark?.description || '').toLowerCase().includes(cceSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (cceFilter === 'month' && row.mark?.month) {
        return matchesMonth(row.mark.month, month);
      }
      if (cceFilter === 'attended') return row.status === 'scored';
      if (cceFilter === 'absent') return row.status === 'ab';
      return true;
    });
  }, [studentCceRows, cceSearch, cceFilter, month]);

  // Mentor details
  const mentor = users.find(u => u.id === currentUser?.mentorId);

  // Spiritual questions
  const spiritualQuestions = questions.filter(q => q.category === 'Spiritual Wellbeing' && q.enabled !== false);
  
  // Group questions by field
  const groupedQuestions = spiritualQuestions.reduce((acc, q) => {
    const fieldKey = (q.field || 'General').trim();
    if (!acc[fieldKey]) acc[fieldKey] = [];
    acc[fieldKey].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const hasAssessed = assessments.some(
    a => a.studentId === currentUser?.id && a.category === 'Spiritual Wellbeing' && matchesMonth(a.month, settings.currentAssessmentMonth)
  );

  const currentMonthAssessment = assessments.find(
    a => a.studentId === currentUser?.id && a.category === 'Spiritual Wellbeing' && matchesMonth(a.month, settings.currentAssessmentMonth)
  );

  // Student CCE Marks and Topics / Absent Records
  const myCceMarks = useMemo(() => {
    return (cceMarks || []).filter(m => m.studentId === currentUser?.id);
  }, [cceMarks, currentUser?.id]);

  const absentCceMarks = useMemo(() => {
    return myCceMarks.filter(m => m.score === 'Ab');
  }, [myCceMarks]);

  const attendedCceMarks = useMemo(() => {
    return myCceMarks.filter(m => m.score !== 'Ab');
  }, [myCceMarks]);

  // Overall CCE average percentage
  const cceAverage = useMemo(() => {
    if (attendedCceMarks.length === 0) return 0;
    const totalAchieved = attendedCceMarks.reduce((sum, m) => sum + (typeof m.score === 'number' ? m.score : 0), 0);
    const totalPossible = attendedCceMarks.reduce((sum, m) => sum + (m.maxScore || 25), 0);
    return totalPossible > 0 ? Math.round((totalAchieved / totalPossible) * 100) : 0;
  }, [attendedCceMarks]);

  const monthCceMarks = useMemo(() => {
    return myCceMarks.filter(m => matchesMonth(m.month, month));
  }, [myCceMarks, month]);

  // Filtered CCE list for table
  const filteredCceMarks = useMemo(() => {
    return myCceMarks.filter(m => {
      const matchesSearch = (m.subject || '').toLowerCase().includes(cceSearch.toLowerCase()) ||
                            (m.description || '').toLowerCase().includes(cceSearch.toLowerCase()) ||
                            (m.cceLevel || '').toLowerCase().includes(cceSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (cceFilter === 'month') return matchesMonth(m.month, month);
      if (cceFilter === 'attended') return m.score !== 'Ab';
      if (cceFilter === 'absent') return m.score === 'Ab';
      return true;
    });
  }, [myCceMarks, cceSearch, cceFilter, month]);

  const activeMonths = settings.activeAssessmentMonths || [];
  const isMonthActive = activeMonths.length === 0 || 
    (settings.currentAssessmentMonth && activeMonths.some(m => settings.currentAssessmentMonth?.toLowerCase().includes(m.toLowerCase())));

  useEffect(() => {
    if (currentMonthAssessment && isEditing) {
      setScores(currentMonthAssessment.scores || {});
    }
  }, [currentMonthAssessment, isEditing]);

  const handleScoreChange = (qId: string, val: number) => {
    setScores(prev => ({ ...prev, [qId]: val }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateUser(currentUser.id, { photoUrl: reader.result as string });
        alert('Profile photo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    addAssessment({
      studentId: currentUser.id,
      assessorId: currentUser.id,
      category: 'Spiritual Wellbeing',
      scores,
      month: settings.currentAssessmentMonth
    });
    
    setIsEditing(false);
    alert('Self-assessment submitted successfully!');
  };

  // Time-based friendly greeting
  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ========================================================================= */}
        {/* HERO BANNER: VIBRANT, MODERN, DISTINCTIVE */}
        {/* ========================================================================= */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-2xl p-6 sm:p-8 border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/15 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                {currentUser?.photoUrl ? (
                  <img 
                    src={currentUser.photoUrl} 
                    alt="Profile" 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl" 
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center ring-4 ring-white/20 shadow-xl text-3xl font-black text-white">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <UserCircle className="w-12 h-12" />}
                  </div>
                )}
                <label className="absolute inset-0 bg-slate-950/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity backdrop-blur-xs text-[10px] font-bold">
                  <Upload className="w-5 h-5 mb-1" />
                  <span>Update Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> Student Portal
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/20 border border-white/25 text-white text-[11px] font-black tracking-wide">
                    Full Name: {currentUser?.name || 'Student'}
                  </span>
                  {currentUser?.admissionNumber && (
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-slate-200 text-[11px] font-mono font-bold tracking-wider">
                      ID: {currentUser.admissionNumber}
                    </span>
                  )}
                  {currentUser?.classGrade && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-200 text-[11px] font-bold">
                      Class {currentUser.classGrade} {currentUser.section ? `• Sec ${currentUser.section}` : ''}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {greeting}, {currentUser?.name || 'Student'}!
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1 flex flex-wrap items-center gap-2">
                  <span>Welcome to your digital academic records & continuous evaluation portal.</span>
                  {mentor && (
                    <span className="text-indigo-300 font-semibold inline-flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" /> Mentor: {mentor.name}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate(`/report/${currentUser?.id}`)}
                className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all flex items-center gap-2 active:scale-95"
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>View Full Report</span>
              </button>
              <button 
                onClick={() => setShowTutorial(!showTutorial)}
                className={`p-3 rounded-2xl transition-all border ${showTutorial ? 'bg-white/20 text-white border-white/30' : 'bg-white/10 text-slate-300 hover:text-white border-white/10 hover:bg-white/15'}`}
                title="Portal Help"
              >
                {showTutorial ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK STATS TILES */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">CCE Average</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {cceAverage > 0 ? `${cceAverage}%` : 'N/A'}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Based on {attendedCceMarks.length} recorded tests
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Evaluations</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {myCceMarks.length}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {attendedCceMarks.length} attended, {absentCceMarks.length} absent
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Self Assessment</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${hasAssessed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {hasAssessed ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
            </div>
            <div className="text-lg font-black text-slate-900">
              {hasAssessed ? 'Completed' : 'Pending'}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Period: {settings.currentAssessmentMonth || 'Active Month'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Official Report</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isReportReady ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900">
              {isReportReady ? 'Ready to View' : 'Processing'}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {settings.reportMonth || settings.currentAssessmentMonth || 'Current cycle'}
            </p>
          </div>
        </div>

        {/* Help Guide Modal / Collapse */}
        {showTutorial && (
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-bold">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Student Guide & Quick Tips</h3>
                  <p className="text-slate-400 text-xs">Everything you need to navigate your records and missed assessments.</p>
                </div>
              </div>
              <button onClick={() => setShowTutorial(false)} className="text-slate-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-1.5 text-blue-300">
                  <BookOpen className="w-4 h-4" /> Missed Evaluations
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If you were absent during a CCE test, look at the highlighted box below. Your teachers write down what portion or topic was given so you can prepare.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-1.5 text-amber-300">
                  <Sparkles className="w-4 h-4" /> Spiritual Wellbeing
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Complete your self-assessment every month under the Spiritual tab. Your honest self-ratings guide your mentor in personal development.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 mb-1.5 text-emerald-300">
                  <FileText className="w-4 h-4" /> Official Report Card
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Once teachers finalize behavioral evaluations and tasks, click "View Full Report" to print or download your verified transcript.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE NAVIGATION TABS INSIDE DASHBOARD */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'report'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Academic & CCE Hub</span>
            {absentCceMarks.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('spiritual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'spiritual'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Spiritual Self-Assessment</span>
            {hasAssessed && (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'trends'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Growth & Behavioral Trends</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ACADEMIC & CCE HUB (PORTIONS, MISSED TESTS & FULL REPORT CARD) */}
        {/* ========================================================================= */}
        {activeTab === 'report' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* ABSENT STUDENTS NOTIFICATION: USER REQUESTED FEATURE */}
            {absentCceMarks.length > 0 && (
              <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-200/90 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/60 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-rose-200">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-rose-950 tracking-tight flex items-center gap-2">
                        Notice for Absent Evaluations ({absentCceMarks.length} Missed)
                      </h3>
                      <p className="text-xs text-rose-800 font-medium">
                        You were marked absent for the evaluations below. Here is what your teacher conducted so you can prepare:
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-black uppercase tracking-wider shrink-0 border border-rose-200">
                    Action Required
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {absentCceMarks.map(ab => (
                    <div key={ab.id} className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs hover:border-rose-300 transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-slate-900">{ab.subject}</span>
                        <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                          {ab.cceLevel}
                        </span>
                      </div>
                      
                      <div className="bg-rose-50/80 p-2.5 rounded-xl border border-rose-100 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-0.5 flex items-center gap-1">
                          <PenLine className="w-3 h-3" /> Portion / What CCE Was Given:
                        </p>
                        <p className="font-semibold text-slate-800 leading-snug">
                          {ab.description ? ab.description : 'Standard syllabus unit evaluation (Contact subject teacher)'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
                        <span>Max Score: <strong className="text-slate-800">{ab.maxScore}</strong></span>
                        <span className="text-rose-600 font-bold">Marked Absent</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CCE PORTIONS & EVALUATION DIRECTORY */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    CCE Assessment Records & Syllabus Portions
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    View test details, what portions were tested by teachers, and your verified scores.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {/* Search box */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search subject or portion..."
                      value={cceSearch}
                      onChange={(e) => setCceSearch(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setCceFilter('month')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${cceFilter === 'month' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {month} ({monthCceMarks.length})
                    </button>
                    <button
                      onClick={() => setCceFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${cceFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      All ({myCceMarks.length})
                    </button>
                    <button
                      onClick={() => setCceFilter('attended')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${cceFilter === 'attended' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Scored ({attendedCceMarks.length})
                    </button>
                    <button
                      onClick={() => setCceFilter('absent')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${cceFilter === 'absent' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Absent ({absentCceMarks.length})
                    </button>
                  </div>
                </div>
              </div>

              {anyAssessmentPending && (
                <div className="mx-6 mt-4 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3 text-blue-950">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-semibold text-blue-900">
                      Evaluations for {month} in progress. Showing CCE marks for <strong>{month}</strong>.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200 shrink-0">
                    {month} Only
                  </span>
                </div>
              )}

              {/* Table of CCEs (All subjects in order, marks or yellow for Ab/0 or Incomplete CCE for blanks) */}
              {filteredCceRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-black text-[10px]">
                        <th className="px-5 py-3.5">Subject (Ordered)</th>
                        <th className="px-4 py-3.5">Evaluation</th>
                        <th className="px-5 py-3.5">What CCE Was Given (Topic / Portion)</th>
                        <th className="px-4 py-3.5 text-center">Score / Status</th>
                        <th className="px-4 py-3.5 text-right">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCceRows.map((row, idx) => {
                        const { subject, cceLevel, mark, status } = row;
                        const isAb = status === 'ab';
                        const isZero = status === 'zero';
                        const isIncomplete = status === 'incomplete';
                        const score = mark?.score;
                        const maxScore = mark?.maxScore || 25;
                        const pct = !isAb && !isIncomplete && typeof score === 'number' && maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-4 font-black text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs">
                                  {subject.charAt(0)}
                                </div>
                                <span className="text-slate-900 font-bold">{subject}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-700">
                              <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-extrabold text-slate-800">
                                {cceLevel}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {mark?.description ? (
                                <div className="flex items-start gap-2 max-w-md">
                                  <PenLine className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                  <span className="font-semibold text-slate-800 leading-relaxed text-xs">
                                    {mark.description}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">General syllabus assessment</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {isAb ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 font-black text-xs shadow-2xs">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Absent (Ab)
                                </span>
                              ) : isZero ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 font-black text-xs shadow-2xs">
                                  0 / {maxScore} (Yellow)
                                </span>
                              ) : isIncomplete ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs shadow-2xs">
                                  <Clock className="w-3 h-3 text-amber-600" /> Incomplete CCE
                                </span>
                              ) : (
                                <div className="font-black text-slate-900 text-sm">
                                  {score} <span className="text-slate-400 font-normal text-xs">/ {maxScore}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {isIncomplete ? (
                                <span className="text-amber-600 font-bold text-xs">Incomplete CCE</span>
                              ) : isAb || isZero ? (
                                <span className="text-amber-700 font-bold text-xs bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">0% (Yellow)</span>
                              ) : (
                                <div className="inline-flex items-center gap-2 justify-end">
                                  <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                    <div 
                                      className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-black text-slate-800 text-xs">{pct}%</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50/50">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No CCE records found for your class subjects.</p>
                  <p className="text-xs text-slate-400 mt-1">Evaluations logged by faculty will automatically appear here with their portions.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SPIRITUAL SELF-ASSESSMENT */}
        {/* ========================================================================= */}
        {activeTab === 'spiritual' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Spiritual Wellbeing Self-Assessment
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Evaluate your habits, ethics, and spiritual mindfulness for <span className="font-bold text-indigo-700">{settings.currentAssessmentMonth}</span>.
                </p>
              </div>

              {hasAssessed && !isEditing && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Submitted for {settings.currentAssessmentMonth}</span>
                </div>
              )}
            </div>

            {!settings.assessmentsActive ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-900">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <h4 className="font-black text-base">Assessment Window Closed</h4>
                <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                  The administration has locked the assessment period. Please check back when the next reporting cycle begins.
                </p>
              </div>
            ) : !isMonthActive ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="font-black text-base text-slate-800">Assessment Scheduled for Later</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Self-assessments for {settings.currentAssessmentMonth} are not open yet.
                </p>
              </div>
            ) : hasAssessed && !isEditing ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-emerald-950">Self-Assessment Submitted!</h4>
                  <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                    You have successfully submitted your answers for {settings.currentAssessmentMonth}. These responses are included in your Monthly Report Card.
                  </p>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 bg-white text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-100 transition-all shadow-2xs"
                >
                  Edit My Responses
                </button>
              </div>
            ) : spiritualQuestions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-xs">
                No spiritual questions are currently configured in the syllabus.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {(Object.entries(groupedQuestions) as [string, Question[]][]).map(([fieldName, qs]) => (
                  <div key={fieldName} className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/40 px-4 py-2.5 rounded-xl border border-indigo-100/80">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">{fieldName}</h4>
                    </div>

                    <div className="space-y-6 pl-1 sm:pl-2">
                      {qs.map((q, idx) => (
                        <div key={q.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
                          <label className="block font-bold text-slate-900 text-sm leading-snug">
                            {idx + 1}. {q.text}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                              { val: 100, label: 'Always', color: 'peer-checked:bg-emerald-50 peer-checked:border-emerald-500 peer-checked:text-emerald-800' },
                              { val: 75, label: 'Often', color: 'peer-checked:bg-blue-50 peer-checked:border-blue-500 peer-checked:text-blue-800' },
                              { val: 50, label: 'Sometimes', color: 'peer-checked:bg-amber-50 peer-checked:border-amber-500 peer-checked:text-amber-800' },
                              { val: 25, label: 'Rarely', color: 'peer-checked:bg-rose-50 peer-checked:border-rose-500 peer-checked:text-rose-800' }
                            ].map(option => (
                              <label key={option.val} className="cursor-pointer">
                                <input 
                                  type="radio" 
                                  name={`student_spiritual_${currentUser?.id}_${q.id}`} 
                                  className="peer sr-only"
                                  required
                                  checked={scores[q.id] === option.val}
                                  onChange={() => handleScoreChange(q.id, option.val)}
                                />
                                <div className={`text-center p-3 text-xs rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-300 font-bold text-slate-700 transition-all ${option.color} peer-checked:shadow-xs`}>
                                  {option.label}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    Submit Self-Assessment
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GROWTH & BEHAVIORAL TRENDS */}
        {/* ========================================================================= */}
        {activeTab === 'trends' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Longitudinal Behavioral & Holistic Growth
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Visual progression across monthly assessment periods recorded by your faculty mentor.
                  </p>
                </div>
              </div>
              <ProgressChart studentId={currentUser?.id || ''} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
