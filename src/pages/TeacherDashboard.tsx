import React, { useState, useEffect } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { 
  FileText, CheckCircle2, ChevronRight, ChevronLeft, Search, Upload, 
  TrendingUp, HelpCircle, Users, BarChart3, BookOpen, Sparkles, Bot, 
  AlertCircle, Check, RefreshCw, LayoutDashboard, ShieldCheck, GraduationCap, 
  CheckSquare, History, X, UserCheck, Star, ThumbsUp, ArrowRight, RotateCcw, 
  Award, Clock
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
    mentorInsights 
  } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'assessments' | 'cce' | 'activities' | 'help' | null;
  const activeTab = tabParam || 'assessments';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Available teacher assessment categories (excluding student self-assessed Spiritual categories)
  const teacherCategories = (settings.assessmentCategories && settings.assessmentCategories.length > 0)
    ? settings.assessmentCategories.filter(c => !c.toLowerCase().includes('spiritual'))
    : ['Behavioral Wellbeing'];
  const [selectedCategory, setSelectedCategory] = useState<string>(teacherCategories[0] || 'Behavioral Wellbeing');

  useEffect(() => {
    if (teacherCategories.length > 0 && !teacherCategories.includes(selectedCategory)) {
      setSelectedCategory(teacherCategories[0]);
    }
  }, [settings.assessmentCategories, selectedCategory]);

  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editAdmission, setEditAdmission] = useState('');
  const [editClassGrade, setEditClassGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const menteeStudents = users.filter(u => u.role === 'student' && u.mentorId === currentUser?.id);

  const filteredMenteeStudents = menteeStudents.filter(s => 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCategory = selectedCategory || 'Behavioral Wellbeing';
  const categoryQuestions = questions.filter(q => q.category === activeCategory && q.enabled !== false);
  
  // Group questions by field safely
  const groupedQuestions = categoryQuestions.reduce((acc, q) => {
    const fieldKey = (q.field || 'General').trim();
    if (!acc[fieldKey]) acc[fieldKey] = [];
    acc[fieldKey].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

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

  // When a student is chosen or category changes, load any existing scores without wiping during editing
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
  }, [selectedStudent, activeCategory]);

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

  const selectedStudentObj = users.find(u => u.id === selectedStudent);
  const currentStudentIndex = menteeStudents.findIndex(s => s.id === selectedStudent);
  const totalQuestionsCount = categoryQuestions.length;
  const answeredCount = categoryQuestions.filter(q => scores[q.id] !== undefined).length;
  const completionPercentage = totalQuestionsCount > 0 ? Math.round((answeredCount / totalQuestionsCount) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Faculty Portal
              </div>
              {currentUser?.admissionNumber && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider">
                  ID: {currentUser.admissionNumber}
                </div>
              )}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {currentUser?.name || 'Faculty Hub'}
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-1">
              {activeTab === 'assessments' ? 'Mentorship evaluation cycles, behavioral assessments, and student progress tracking.' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('_', ' ')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Completed</p>
                <p className="text-sm font-black text-slate-800 mt-1">
                  {menteeStudents.filter(student => 
                    assessments.some(a => a.studentId === student.id && a.assessorId === currentUser?.id && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth))
                  ).length} / {menteeStudents.length}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Evaluation Window</p>
                <p className="text-sm font-black text-indigo-700 mt-1">{settings.currentAssessmentMonth || 'Active Month'}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'assessments' && (
          <div className="space-y-6">
            {/* Category Selector Tabs */}
            {teacherCategories.length > 1 && (
              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-black uppercase text-slate-400 px-3 tracking-wider">Category:</span>
                {teacherCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                    }}
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
            {/* CASE 1: DIRECT STUDENT ASSESSMENT STUDIO VIEW (WHEN A STUDENT IS CLICKED) */}
            {/* ========================================================================= */}
            {selectedStudent && selectedStudentObj ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Navigation and Student Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={() => setSelectedStudent(null)}
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-2 text-xs font-bold"
                        title="Return to Student Directory"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back to Directory</span>
                      </button>

                      <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-500/30 border border-white/20">
                        {selectedStudentObj.name.charAt(0)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[10px] font-black uppercase tracking-wider">
                            {activeCategory}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-wider">
                            Period: {settings.currentAssessmentMonth}
                          </span>
                          {currentMonthAssessment && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" /> Saved Assessment
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          {selectedStudentObj.name}
                        </h3>
                        <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                          Admission No: <span className="text-white font-bold">{selectedStudentObj.admissionNumber || 'N/A'}</span>
                          {selectedStudentObj.classGrade && (
                            <span className="ml-3">Class: <span className="text-white font-bold">{selectedStudentObj.classGrade} - {selectedStudentObj.section || 'A'}</span></span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Mentee Pagination Controls */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/10">
                      <button
                        disabled={currentStudentIndex <= 0}
                        onClick={() => {
                          if (currentStudentIndex > 0) {
                            setSelectedStudent(menteeStudents[currentStudentIndex - 1].id);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          currentStudentIndex <= 0 
                            ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-400' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </button>

                      <span className="text-xs font-bold text-slate-300 px-2">
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
                            ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-400' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigate(`/report/${selectedStudent}`)}
                        className="ml-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                      >
                        <FileText className="w-3.5 h-3.5" /> Full Report
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar in Header */}
                  <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-36 sm:w-56 h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        {answeredCount} of {totalQuestionsCount} questions rated ({completionPercentage}%)
                      </span>
                    </div>

                    {/* Quick helper shortcuts */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Quick Fill:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickFill(100)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-emerald-300 transition-all flex items-center gap-1"
                      >
                        🌟 All High
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickFill(70)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-indigo-300 transition-all flex items-center gap-1"
                      >
                        👍 All Good
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScores({});
                          setSaveSuccessMessage(null);
                        }}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1"
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
                      <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h4 className="text-base font-bold text-slate-700">No Assessment Questions Configured</h4>
                      <p className="text-xs text-slate-400 mt-1">There are no enabled questions for "{activeCategory}". Please configure questions in the admin panel.</p>
                    </div>
                  ) : !settings.assessmentsActive ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                      <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                      <h4 className="text-lg font-black text-amber-900 mb-1 uppercase tracking-tight">Assessment Window Locked</h4>
                      <p className="text-sm text-amber-700 font-medium">The administration has currently deactivated the evaluation period.</p>
                    </div>
                  ) : !isMonthActive ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h4 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">Window Not Open</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Evaluations for <span className="font-black text-slate-700">{settings.currentAssessmentMonth}</span> are not active.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {(Object.entries(groupedQuestions) as [string, Question[]][]).map(([fieldName, qs]) => (
                        <div key={fieldName} className="space-y-6">
                          {/* Domain / Field Header */}
                          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900">
                              {fieldName}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                              {qs.length} question{qs.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Questions in this Field */}
                          <div className="space-y-8">
                            {qs.map((q, idx) => {
                              const currentScore = scores[q.id];
                              const isAnswered = currentScore !== undefined;

                              // Define options list
                              const optionList = (q.options && q.options.length > 0) ? q.options.map((opt, oIdx) => ({
                                val: q.options!.length === 1 ? 100 : Math.round(100 - (oIdx * (100 / (q.options!.length - 1)))),
                                label: opt
                              })) : [
                                { val: 100, label: 'Excellent (🌟)', color: 'emerald' },
                                { val: 70, label: 'Good (👍)', color: 'indigo' },
                                { val: 40, label: 'Needs Improvement (📈)', color: 'amber' }
                              ];

                              return (
                                <div 
                                  key={q.id} 
                                  className={`p-5 sm:p-6 rounded-2xl border-2 transition-all ${
                                    isAnswered 
                                      ? 'bg-slate-50/70 border-indigo-100 shadow-sm' 
                                      : 'bg-white border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-start gap-3">
                                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                        isAnswered 
                                          ? 'bg-indigo-600 text-white' 
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {idx + 1}
                                      </span>
                                      <p className="font-bold text-slate-900 text-base leading-snug pt-0.5">
                                        {q.text}
                                      </p>
                                    </div>

                                    {isAnswered ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 shrink-0">
                                        <Check className="w-3 h-3" /> Answered
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                                        Pending
                                      </span>
                                    )}
                                  </div>

                                  {/* Radio Options Grid */}
                                  <div className={`grid grid-cols-1 ${optionList.length > 3 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-3 pt-2`}>
                                    {optionList.map((option, oIdx) => {
                                      const isSelected = scores[q.id] === option.val;

                                      return (
                                        <button
                                          key={`${q.id}_opt_${option.val}_${oIdx}`}
                                          type="button"
                                          onClick={() => handleScoreChange(q.id, option.val)}
                                          className={`relative text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                                            isSelected
                                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 ring-2 ring-indigo-300'
                                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-200'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                              isSelected ? 'border-white bg-white text-indigo-600' : 'border-slate-300 bg-white'
                                            }`}>
                                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                                            </div>
                                            <span className={`text-sm font-bold truncate ${isSelected ? 'text-white font-black' : 'text-slate-800'}`}>
                                              {option.label}
                                            </span>
                                          </div>
                                          {isSelected && (
                                            <Check className="w-4 h-4 text-white shrink-0" />
                                          )}
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
                              className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-slate-300 flex items-center justify-center gap-2 active:scale-95"
                            >
                              <span>Save & Next</span>
                              <ArrowRight className="w-4 h-4" />
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
              /* CASE 2: MENTEE DIRECTORY GRID VIEW (CLICK A STUDENT TO START ASSESSMENT) */
              /* ========================================================================= */
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                      <GraduationCap className="w-6 h-6 text-indigo-600" />
                      Mentee Student Directory
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Click any student below to open and record their <span className="font-bold text-slate-700">{activeCategory}</span> monthly assessment.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search by student name or ID..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>
                
                <div className="p-6 sm:p-8">
                  {filteredMenteeStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredMenteeStudents.map(student => {
                        const existingAssmt = assessments.find(
                          a => a.studentId === student.id && a.assessorId === currentUser?.id && a.category === activeCategory && matchesMonth(a.month, settings.currentAssessmentMonth)
                        );
                        const hasAssessed = !!existingAssmt;

                        return (
                          <button
                            key={student.id}
                            onClick={() => {
                              setSelectedStudent(student.id);
                              if (existingAssmt && existingAssmt.scores) {
                                setScores(existingAssmt.scores);
                              } else {
                                setScores({});
                              }
                            }}
                            className="group w-full text-left p-5 rounded-2xl border-2 border-slate-200/80 bg-white hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-base font-black uppercase transition-all ${
                                hasAssessed 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200'
                              }`}>
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                    {student.name}
                                  </p>
                                  {hasAssessed && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                  <span>ID: {student.admissionNumber || 'N/A'}</span>
                                  {student.classGrade && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                      <span>Class {student.classGrade}-{student.section || 'A'}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              {hasAssessed ? (
                                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  Completed
                                </span>
                              ) : (
                                <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  Assess Now
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                            </div>
                          </button>
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

        {/* CCE Marks Tab */}
        {activeTab === 'cce' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <CCEMarksManager />
            <CCEMarksSummary />
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <TeacherTaskVerifier />
          </div>
        )}

        {/* Editing Student Modal */}
        {editingStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Student Details: {editingStudent.name}</h3>
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
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Admission Number</label>
                  <input 
                    type="text" 
                    value={editAdmission || ''} 
                    onChange={(e) => setEditAdmission(e.target.value)} 
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Class Grade</label>
                    <input 
                      type="text" 
                      value={editClassGrade || ''} 
                      onChange={(e) => setEditClassGrade(e.target.value)} 
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Section</label>
                    <input 
                      type="text" 
                      value={editSection || ''} 
                      onChange={(e) => setEditSection(e.target.value)} 
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium"
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
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm"
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
