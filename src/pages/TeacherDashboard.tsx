import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { 
  FileText, CheckCircle2, ChevronRight, ChevronLeft, Search, Upload, 
  TrendingUp, HelpCircle, Users, BarChart3, BookOpen, Sparkles, Bot, 
  AlertCircle, Check, RefreshCw, LayoutDashboard, ShieldCheck, GraduationCap, 
  CheckSquare, History, X, UserCheck, Star, ThumbsUp, ArrowRight, RotateCcw, 
  Award, Clock, Filter, Edit3, Eye, AlertTriangle, Layers, Download, Plus, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CCEMarksManager } from '../components/CCEMarksManager';
import { CCEMarksSummary } from '../components/CCEMarksSummary';
import { TeacherTaskVerifier } from '../components/TeacherTaskVerifier';
import { Question, User } from '../types';
import { ProgressChart } from '../components/ProgressChart';

export default function TeacherDashboard() {
  const { 
    currentUser, 
    users, 
    questions, 
    assessments, 
    addAssessment, 
    settings, 
    updateUser, 
    getAIInsights, 
    mentorInsights,
    cceMarks,
    studentTasks
  } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'dashboard' | 'mentees' | 'cce' | 'cce-status' | 'assessments' | 'activities' | 'help' | null;
  const activeTab = (!tabParam || tabParam === 'dashboard' || tabParam === 'mentees') ? 'dashboard' : tabParam;

  const setActiveTab = (tab: string) => {
    if (tab === 'dashboard') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [classFilter, setClassFilter] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [dashboardViewMode, setDashboardViewMode] = useState<'mentees' | 'cce'>('mentees');

  // Auto-select student if provided in search params
  useEffect(() => {
    const studentParam = searchParams.get('studentId');
    if (studentParam) {
      setSelectedStudent(studentParam);
    }
  }, [searchParams]);

  // Available teacher assessment categories (excluding student self-assessed Spiritual categories)
  const teacherCategories = useMemo(() => {
    return (settings.assessmentCategories && settings.assessmentCategories.length > 0)
      ? settings.assessmentCategories.filter(c => !c.toLowerCase().includes('spiritual'))
      : ['Behavioral Wellbeing'];
  }, [settings.assessmentCategories]);

  const [selectedCategory, setSelectedCategory] = useState<string>(teacherCategories[0] || 'Behavioral Wellbeing');

  useEffect(() => {
    if (teacherCategories.length > 0 && !teacherCategories.includes(selectedCategory)) {
      setSelectedCategory(teacherCategories[0]);
    }
  }, [teacherCategories, selectedCategory]);

  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editAdmission, setEditAdmission] = useState('');
  const [editClassGrade, setEditClassGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Show only mentees assigned to this teacher
  const menteeStudents = useMemo(() => {
    return users.filter(u => 
      u.role === 'student' && 
      (u.mentorId === currentUser?.id || (currentUser?.name && u.mentorName === currentUser.name))
    );
  }, [users, currentUser]);

  const activeCategory = selectedCategory || 'Behavioral Wellbeing';
  const categoryQuestions = useMemo(() => {
    return questions.filter(q => q.category === activeCategory && q.enabled !== false);
  }, [questions, activeCategory]);
  
  // Group questions by field safely
  const groupedQuestions = useMemo(() => {
    return categoryQuestions.reduce((acc, q) => {
      const fieldKey = (q.field || 'General').trim();
      if (!acc[fieldKey]) acc[fieldKey] = [];
      acc[fieldKey].push(q);
      return acc;
    }, {} as Record<string, Question[]>);
  }, [categoryQuestions]);

  const handleScoreChange = (qId: string, val: number) => {
    setScores(prev => ({ ...prev, [qId]: val }));
    setSaveSuccessMessage(null);
  };

  const matchesMonth = (dataMonth: string | undefined, filterMonth: string | undefined) => {
    if (!filterMonth) return true;
    if (!dataMonth) return false;
    const normalizedData = dataMonth.trim().toLowerCase();
    const normalizedFilter = filterMonth.trim().toLowerCase();
    return normalizedData === normalizedFilter || normalizedData.includes(normalizedFilter) || normalizedFilter.includes(normalizedData);
  };

  const currentMonthAssessment = assessments.find(
    a => a.studentId === selectedStudent && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth)
  );

  // When a student is chosen or category changes, load any existing scores
  useEffect(() => {
    if (selectedStudent) {
      const existingAssmt = assessments.find(
        a => a.studentId === selectedStudent && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth)
      );
      if (existingAssmt && existingAssmt.scores) {
        setScores(existingAssmt.scores);
      } else {
        setScores({});
      }
      setSaveSuccessMessage(null);
    } else {
      setScores({});
      setSaveSuccessMessage(null);
    }
  }, [selectedStudent, activeCategory, assessments, settings.currentAssessmentMonth]);

  const activeMonths = settings.activeAssessmentMonths || [];
  const isMonthActive = activeMonths.length === 0 || 
    (settings.currentAssessmentMonth && activeMonths.some(m => settings.currentAssessmentMonth?.toLowerCase().includes(m.toLowerCase())));

  const studentInsights = mentorInsights.find(
    i => i.studentId === selectedStudent && matchesMonth(i.month, settings.currentAssessmentMonth)
  );

  const handleGenerateAI = async () => {
    if (!selectedStudent) return;
    setIsGeneratingAI(true);
    setAiError(null);
    try {
      await getAIInsights(selectedStudent, settings.currentAssessmentMonth || '');
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Quick fill helper
  const handleQuickFill = (targetPercentage: number) => {
    const newScores: Record<string, number> = {};
    categoryQuestions.forEach(q => {
      if (q.options && q.options.length > 0) {
        if (targetPercentage >= 90) {
          newScores[q.id] = 100;
        } else if (targetPercentage >= 60) {
          const midIdx = Math.floor((q.options.length - 1) / 2);
          newScores[q.id] = Math.round(100 - (midIdx * (100 / Math.max(1, q.options.length - 1))));
        } else {
          newScores[q.id] = Math.round(100 - ((q.options.length - 1) * (100 / Math.max(1, q.options.length - 1))));
        }
      } else {
        newScores[q.id] = targetPercentage;
      }
    });
    setScores(newScores);
    setSaveSuccessMessage(null);
  };

  // Save assessment logic
  const handleSaveEvaluation = (goToNext: boolean = false) => {
    if (!selectedStudent || !currentUser) return;
    
    // Validate all questions are answered
    const unanswered = categoryQuestions.filter(q => scores[q.id] === undefined);
    if (unanswered.length > 0) {
      alert(`Please answer all ${categoryQuestions.length} questions before saving. (${unanswered.length} question${unanswered.length > 1 ? 's' : ''} remaining)`);
      return;
    }

    addAssessment({
      studentId: selectedStudent,
      assessorId: currentUser.id,
      category: activeCategory,
      scores,
      month: settings.currentAssessmentMonth
    });

    setSaveSuccessMessage('Assessment successfully saved!');

    if (goToNext) {
      const currentIndex = menteeStudents.findIndex(s => s.id === selectedStudent);
      if (currentIndex !== -1 && currentIndex < menteeStudents.length - 1) {
        const nextStudent = menteeStudents[currentIndex + 1];
        setSelectedStudent(nextStudent.id);
      } else {
        setTimeout(() => {
          setSelectedStudent(null);
        }, 1200);
      }
    }
  };

  // Filtered mentees by search, class and status
  const filteredMenteeStudents = useMemo(() => {
    return menteeStudents.filter(student => {
      const matchesSearch = (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (student.admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (student.classGrade || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (classFilter && student.classGrade !== classFilter) return false;

      const hasAssessed = assessments.some(
        a => a.studentId === student.id && a.assessorId === currentUser?.id && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth)
      );

      if (statusFilter === 'completed') return hasAssessed;
      if (statusFilter === 'pending') return !hasAssessed;
      return true;
    });
  }, [menteeStudents, searchQuery, classFilter, statusFilter, assessments, currentUser?.id, activeCategory, settings.currentAssessmentMonth]);

  const selectedStudentObj = users.find(u => u.id === selectedStudent);
  const currentStudentIndex = menteeStudents.findIndex(s => s.id === selectedStudent);
  const totalQuestionsCount = categoryQuestions.length;
  const answeredCount = categoryQuestions.filter(q => scores[q.id] !== undefined).length;
  const completionPercentage = totalQuestionsCount > 0 ? Math.round((answeredCount / totalQuestionsCount) * 100) : 0;

  // Evaluation completion statistics
  const completedMenteesCount = useMemo(() => {
    return menteeStudents.filter(student => 
      assessments.some(a => a.studentId === student.id && a.assessorId === currentUser?.id && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth))
    ).length;
  }, [menteeStudents, assessments, currentUser?.id, activeCategory, settings.currentAssessmentMonth]);

  const menteeCompletionRate = menteeStudents.length > 0 ? Math.round((completedMenteesCount / menteeStudents.length) * 100) : 0;

  // Pending activity tasks to verify
  const pendingTasksCount = useMemo(() => {
    return (studentTasks || []).filter(t => !t.verified).length;
  }, [studentTasks]);

  // CCE marks count given by THIS teacher
  const myClassCceCount = useMemo(() => {
    return (cceMarks || []).filter(m => 
      (m.teacherId && m.teacherId === currentUser?.id) || 
      (m.teacherName && currentUser?.name && m.teacherName.toLowerCase() === currentUser.name.toLowerCase())
    ).length;
  }, [cceMarks, currentUser]);

  // Average attendance across assigned mentees
  const avgMenteeAttendance = useMemo(() => {
    if (menteeStudents.length === 0) return 0;
    const total = menteeStudents.reduce((acc, s) => acc + (s.attendance ?? 95), 0);
    return Math.round(total / menteeStudents.length);
  }, [menteeStudents]);

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
        {/* TOP FACULTY HERO HEADER: CLEAN LIGHT THEME */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Campus Logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl shadow-2xs">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'F'}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Faculty Portal
                  </span>
                  {currentUser?.admissionNumber && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono font-bold tracking-wider">
                      Staff ID: {currentUser.admissionNumber}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                    Period: {settings.currentAssessmentMonth || 'Active Month'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {greeting}, {currentUser?.name || 'Faculty Member'}!
                </h1>

                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                  {settings?.name ? `${settings.name} — ` : ''}Faculty Mentorship & CCE Portal. Monitor your assigned mentees' details and review your submitted CCE evaluation status.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setActiveTab('cce-status')}
                className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 ${
                  activeTab === 'cce-status'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                    : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${activeTab === 'cce-status' ? 'text-white' : 'text-emerald-600'}`} />
                <span>CCE Status</span>
              </button>
              <button 
                onClick={() => setActiveTab('cce')}
                className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 ${
                  activeTab === 'cce'
                    ? 'bg-indigo-700 text-white shadow-md shadow-indigo-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                }`}
              >
                <BookOpen className="w-4 h-4 text-white" />
                <span>CCE Marks Entry</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FACULTY METRIC TILES */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">My Mentees</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {menteeStudents.length}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Assigned student protégés
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mentee Attendance</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 truncate">
              {avgMenteeAttendance}%
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Average mentee presence
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('cce-status')}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">My Given CCE Marks</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-slate-900">
                {myClassCceCount}
              </div>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                View Status →
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Evaluations recorded by you (Click for CCE Status)
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DASHBOARD VIEW SWITCHER (MENTEES DETAILS & CCE STATUS) */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs gap-2">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Assigned Mentees</span>
            </button>

            <button
              onClick={() => setActiveTab('cce-status')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'cce-status'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>CCE Status</span>
            </button>

            <button
              onClick={() => setActiveTab('cce')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'cce'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>CCE Marks Entry</span>
            </button>

            <button
              onClick={() => setActiveTab('assessments')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'assessments'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Mentee Assessments</span>
            </button>

            <button
              onClick={() => setActiveTab('activities')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'activities'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Activity Centre</span>
            </button>
          </div>

          <span className="text-xs font-bold text-slate-400 px-3 hidden lg:inline">
            Faculty Workspace
          </span>
        </div>

        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TAB 0: TEACHER DASHBOARD - ONLY MY MENTEES & CCE STATUS */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {dashboardViewMode === 'mentees' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                      <GraduationCap className="w-6 h-6 text-indigo-600" />
                      My Assigned Mentees
                    </h3>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
                      {menteeStudents.length} Students
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Showing only students assigned under your faculty mentorship profile. Track attendance, continuous CCE scores, and monthly evaluations.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Search box */}
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search mentee name, ID..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Class grade filter */}
                  <div className="relative">
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
                    >
                      <option value="">All Classes</option>
                      {Array.from(new Set(menteeStudents.map(s => s.classGrade).filter(Boolean))).sort().map(c => (
                        <option key={c} value={c}>Grade {c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status filter */}
                  <div className="flex items-center bg-slate-200/60 p-1 rounded-xl">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      All ({menteeStudents.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('pending')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === 'pending' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Due ({menteeStudents.length - completedMenteesCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === 'completed' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Done ({completedMenteesCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* Mentee List / Cards */}
              <div className="p-6">
                {filteredMenteeStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredMenteeStudents.map(student => {
                      const existingAssmt = assessments.find(
                        a => a.studentId === student.id && a.assessorId === currentUser?.id && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth)
                      );
                      const hasAssessed = !!existingAssmt;

                      // Mentee CCE marks
                      const studentCceList = (cceMarks || []).filter(m => m.studentId === student.id);
                      const numericCceMarks = studentCceList.filter(m => typeof m.score === 'number' && m.maxScore > 0);
                      const cceAvg = numericCceMarks.length > 0
                        ? Math.round(numericCceMarks.reduce((acc, m) => acc + ((m.score as number) / m.maxScore) * 100, 0) / numericCceMarks.length)
                        : null;

                      return (
                        <div
                          key={student.id}
                          className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                        >
                          <div>
                            {/* Card Top: Avatar, Name, Edit */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black uppercase shadow-xs ${
                                  hasAssessed 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                }`}>
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-900 text-sm tracking-tight">
                                    {student.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-medium">
                                    ID: <span className="font-bold text-slate-700">{student.admissionNumber || 'N/A'}</span>
                                    {student.classGrade && (
                                      <span className="ml-2 font-semibold text-slate-600">• Grade {student.classGrade}{student.section ? `-${student.section}` : ''}</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setEditingStudent(student);
                                  setEditName(student.name);
                                  setEditAdmission(student.admissionNumber || '');
                                  setEditClassGrade(student.classGrade || '');
                                  setEditSection(student.section || '');
                                  setEditPassword(student.password || '');
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Edit Mentee Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Attendance & CCE Stats Pill */}
                            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-100 mb-3 text-xs">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Attendance</span>
                                <span className={`font-black text-xs ${
                                  (student.attendance ?? 95) >= 90 ? 'text-emerald-700' : (student.attendance ?? 95) >= 75 ? 'text-blue-700' : 'text-amber-700'
                                }`}>
                                  {student.attendance ?? 95}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">CCE Avg</span>
                                <span className="font-black text-xs text-indigo-700">
                                  {cceAvg !== null ? `${cceAvg}% (${studentCceList.length} CCEs)` : 'No CCE yet'}
                                </span>
                              </div>
                            </div>

                            {/* CCE Recent Badges */}
                            {studentCceList.length > 0 && (
                              <div className="mb-3 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recent CCE Marks:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {studentCceList.slice(0, 3).map((cm, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold">
                                      {cm.cceLevel}: {cm.score === 'Ab' ? 'Ab' : `${cm.score}/${cm.maxScore}`}
                                    </span>
                                  ))}
                                  {studentCceList.length > 3 && (
                                    <span className="text-[10px] text-slate-400 font-bold self-center">+{studentCceList.length - 3} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Evaluation Status Banner */}
                            <div className="flex items-center justify-between">
                              {hasAssessed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  <Check className="w-3 h-3" /> Evaluated ({settings.currentAssessmentMonth || 'Cycle'})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                  <Clock className="w-3 h-3" /> Evaluation Due
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => navigate(`/report/${student.id}?download=true`)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                title="Download Report"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/report/${student.id}`)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="View Full Report Card"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedStudent(student.id);
                                setActiveTab('assessments');
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                hasAssessed
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
                              }`}
                            >
                              <span>{hasAssessed ? 'Review' : 'Assess Mentee'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">
                      {searchQuery ? `No mentees found matching "${searchQuery}"` : 'No Mentees Assigned to Your Profile'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery 
                        ? 'Try clearing the search query or class filter.' 
                        : 'Students are assigned to faculty mentors by the campus administrator in the Mentor Assignment management section.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* CCE Status Section on Teacher Dashboard - Only CCE given by this teacher */}
            {dashboardViewMode === 'cce' && (
              <div className="space-y-4">
                <CCEMarksSummary 
                  showOnlyTeacher={true} 
                  teacherId={currentUser?.id} 
                  teacherName={currentUser?.name} 
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MENTEE ASSESSMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            {/* Category Selector Tabs */}
            {teacherCategories.length > 1 && (
              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-black uppercase text-slate-400 px-3 tracking-wider">Category:</span>
                {teacherCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* ========================================================================= */}
            {/* ASSESSMENT STUDIO (WHEN A STUDENT IS CLICKED) */}
            {/* ========================================================================= */}
            {selectedStudent && selectedStudentObj ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Navigation and Student Header Banner: Clean Light Theme */}
                <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={() => setSelectedStudent(null)}
                        className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all border border-slate-200 flex items-center gap-2 text-xs font-bold"
                        title="Return to Student Directory"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                        <span className="hidden sm:inline">Back to Directory</span>
                      </button>

                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xl font-black shadow-xs">
                        {selectedStudentObj.name.charAt(0)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                            {activeCategory}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                            Period: {settings.currentAssessmentMonth}
                          </span>
                          {currentMonthAssessment && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Saved Assessment
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                          {selectedStudentObj.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Admission No: <span className="text-slate-800 font-bold">{selectedStudentObj.admissionNumber || 'N/A'}</span>
                          {selectedStudentObj.classGrade && (
                            <span className="ml-3">Class: <span className="text-slate-800 font-bold">{selectedStudentObj.classGrade} - {selectedStudentObj.section || 'A'}</span></span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Mentee Pagination Controls */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                      <button
                        disabled={currentStudentIndex <= 0}
                        onClick={() => {
                          if (currentStudentIndex > 0) {
                            setSelectedStudent(menteeStudents[currentStudentIndex - 1].id);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          currentStudentIndex <= 0 
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border border-slate-200' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </button>

                      <span className="text-xs font-bold text-slate-600 px-2">
                        {currentStudentIndex + 1} of {menteeStudents.length}
                      </span>

                      <button
                        disabled={currentStudentIndex >= menteeStudents.length - 1}
                        onClick={() => {
                          if (currentStudentIndex < menteeStudents.length - 1) {
                            setSelectedStudent(menteeStudents[currentStudentIndex + 1].id);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          currentStudentIndex >= menteeStudents.length - 1 
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border border-slate-200' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigate(`/report/${selectedStudent}?download=true`)}
                        className="ml-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-200"
                        title="Download or Print Report Card"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button
                        onClick={() => navigate(`/report/${selectedStudent}`)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-200"
                      >
                        <FileText className="w-3.5 h-3.5" /> Full Report
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar in Header */}
                  <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-36 sm:w-56 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {answeredCount} of {totalQuestionsCount} questions rated ({completionPercentage}%)
                      </span>
                    </div>

                    {/* Quick helper shortcuts */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Quick Fill:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickFill(100)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-800 transition-all flex items-center gap-1"
                      >
                        🌟 All High
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickFill(70)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-bold text-blue-800 transition-all flex items-center gap-1"
                      >
                        👍 All Good
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScores({});
                          setSaveSuccessMessage(null);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Feedback Banner */}
                {saveSuccessMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black">{saveSuccessMessage}</p>
                        <p className="text-xs text-emerald-600">The evaluation for {selectedStudentObj.name} is saved and up to date.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSaveSuccessMessage(null)}
                      className="text-emerald-700 hover:text-emerald-900 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {/* Question Assessment Form */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                  {categoryQuestions.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-slate-400 font-bold">No questions configured for {activeCategory}.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {(Object.entries(groupedQuestions) as [string, Question[]][]).map(([fieldName, qs]) => (
                        <div key={fieldName} className="space-y-4">
                          <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">{fieldName}</h4>
                          </div>

                          <div className="space-y-4 pl-1 sm:pl-2">
                            {qs.map((q, idx) => {
                              const optionsToRender = q.options && q.options.length > 0 ? q.options : [
                                { label: 'Exceptional (100%)', weight: 100 },
                                { label: 'Good (75%)', weight: 75 },
                                { label: 'Average (50%)', weight: 50 },
                                { label: 'Needs Improvement (25%)', weight: 25 }
                              ];

                              return (
                                <div key={q.id} className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70 hover:border-indigo-200 transition-colors space-y-3">
                                  <label className="block font-bold text-slate-900 text-sm leading-snug">
                                    {idx + 1}. {q.text}
                                  </label>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {optionsToRender.map((opt, optIdx) => {
                                      const val = opt.weight !== undefined ? opt.weight : Math.round(100 - (optIdx * (100 / Math.max(1, optionsToRender.length - 1))));
                                      const isChecked = scores[q.id] === val;

                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() => handleScoreChange(q.id, val)}
                                          className={`p-3 rounded-xl border-2 text-xs font-bold text-left transition-all flex flex-col justify-between min-h-[56px] ${
                                            isChecked 
                                              ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-xs' 
                                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                          }`}
                                        >
                                          <span className="leading-snug">{opt.label}</span>
                                          <span className={`text-[10px] mt-1 font-extrabold ${isChecked ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {val}%
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Action Submission Toolbar */}
                      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 z-20">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(null)}
                            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Return to Directory
                          </button>
                          <span className="text-xs font-bold text-slate-500 hidden md:inline">
                            {answeredCount === totalQuestionsCount 
                              ? '✨ Ready to save evaluation' 
                              : `⚠️ ${totalQuestionsCount - answeredCount} question(s) left`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleSaveEvaluation(false)}
                            className="flex-1 sm:flex-none px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
                          >
                            <Check className="w-4 h-4" /> Save Evaluation
                          </button>

                          {currentStudentIndex < menteeStudents.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleSaveEvaluation(true)}
                              className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
                            >
                              <span>Save & Next</span>
                              <ArrowRight className="w-4 h-4 text-slate-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Chart for Selected Student */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                  <h4 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Historical Growth Trends: {selectedStudentObj.name}
                  </h4>
                  <ProgressChart studentId={selectedStudent} />
                </div>
              </motion.div>
            ) : (
              /* ========================================================================= */
              /* MENTEE DIRECTORY GRID VIEW (CLICK A STUDENT TO START ASSESSMENT) */
              /* ========================================================================= */
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                      <GraduationCap className="w-6 h-6 text-indigo-600" />
                      Mentee Student Protégés
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Click any student below to open and record their <span className="font-bold text-slate-700">{activeCategory}</span> monthly assessment.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    {/* Search box */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search student or ID..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-60 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center bg-slate-200/60 p-1 rounded-xl">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        All ({menteeStudents.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === 'pending' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Pending ({menteeStudents.length - completedMenteesCount})
                      </button>
                      <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${statusFilter === 'completed' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Done ({completedMenteesCount})
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {filteredMenteeStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredMenteeStudents.map(student => {
                        const existingAssmt = assessments.find(
                          a => a.studentId === student.id && a.assessorId === currentUser?.id && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth)
                        );
                        const hasAssessed = !!existingAssmt;

                        return (
                          <div
                            key={student.id}
                            className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                              hasAssessed 
                                ? 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md' 
                                : 'bg-gradient-to-br from-indigo-50/40 via-white to-white border-indigo-200/90 shadow-2xs hover:shadow-md hover:border-indigo-500'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3.5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black uppercase transition-all shadow-2xs ${
                                  hasAssessed 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                }`}>
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-900 text-sm tracking-tight">
                                    {student.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-medium">
                                    ID: <span className="font-bold text-slate-700">{student.admissionNumber || 'N/A'}</span>
                                    {student.classGrade && (
                                      <span className="ml-2 font-semibold text-slate-600">• Class {student.classGrade}{student.section ? `-${student.section}` : ''}</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setEditingStudent(student);
                                  setEditName(student.name);
                                  setEditAdmission(student.admissionNumber || '');
                                  setEditClassGrade(student.classGrade || '');
                                  setEditSection(student.section || '');
                                  setEditPassword(student.password || '');
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Edit Student Profile"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              {hasAssessed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  <Check className="w-3 h-3" /> Evaluated
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                  <Clock className="w-3 h-3" /> Due for Scoring
                                </span>
                              )}

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => navigate(`/report/${student.id}?download=true`)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                  title="Download / Print Report Card"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => navigate(`/report/${student.id}`)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                  title="View Report Card"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedStudent(student.id);
                                    if (existingAssmt && existingAssmt.scores) {
                                      setScores(existingAssmt.scores);
                                    } else {
                                      setScores({});
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    hasAssessed
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
                                  }`}
                                >
                                  <span>{hasAssessed ? 'Review' : 'Assess'}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-600">No mentees found matching "{searchQuery}"</p>
                      <p className="text-xs text-slate-400 mt-1">Check the search query or verify your assigned mentees.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CCE MARKS ENTRY */}
        {/* ========================================================================= */}
        {activeTab === 'cce' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <CCEMarksManager />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CCE STATUS - SHOWS ONLY CCE GIVEN BY THIS TEACHER */}
        {/* ========================================================================= */}
        {activeTab === 'cce-status' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <CCEMarksSummary 
              showOnlyTeacher={true} 
              teacherId={currentUser?.id} 
              teacherName={currentUser?.name} 
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ACTIVITIES VERIFIER */}
        {/* ========================================================================= */}
        {activeTab === 'activities' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <TeacherTaskVerifier />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FACULTY GUIDE & FAQ */}
        {/* ========================================================================= */}
        {activeTab === 'help' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Faculty Guide & Assessment Best Practices</h3>
                <p className="text-xs text-slate-500 font-medium">Clear workflows for mentors, CCE subject evaluation, and student feedback.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> 1. CCE Topic / Portion Box
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When grading CCE in the CCE Marks Entry tab, always type what test portion or assignment was given in the description box. If any student is marked absent (Ab), they will see this portion on their student dashboard so they know what to prepare.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" /> 2. Mentee Behavioral Cycles
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Complete each mentee's behavioral rubrics each month. You can use the "🌟 All High" or "👍 All Good" quick-fill shortcuts and fine-tune individual questions as needed, followed by "Save & Next" to quickly move down the roster.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> 3. Activity Task Verification
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Students upload or mark their co-curricular tasks completed. Visit the Activity Center tab to verify submissions, ensuring student transcripts accurately display their accomplishments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EDITING STUDENT MODAL */}
        {/* ========================================================================= */}
        {editingStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900">Edit Mentee: {editingStudent.name}</h3>
                <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                updateUser(editingStudent.id, {
                  name: editName,
                  admissionNumber: editAdmission,
                  classGrade: editClassGrade,
                  section: editSection,
                  password: editPassword
                });
                setEditingStudent(null);
                alert('Student details updated successfully!');
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editName || ''} 
                    onChange={(e) => setEditName(e.target.value)} 
                    required 
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Admission Number</label>
                  <input 
                    type="text" 
                    value={editAdmission || ''} 
                    onChange={(e) => setEditAdmission(e.target.value)} 
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Class Grade</label>
                    <input 
                      type="text" 
                      value={editClassGrade || ''} 
                      onChange={(e) => setEditClassGrade(e.target.value)} 
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Section</label>
                    <input 
                      type="text" 
                      value={editSection || ''} 
                      onChange={(e) => setEditSection(e.target.value)} 
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
                  <input 
                    type="text" 
                    value={editPassword || ''} 
                    onChange={(e) => setEditPassword(e.target.value)} 
                    required 
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
