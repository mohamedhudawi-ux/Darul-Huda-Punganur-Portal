import React, { useState, useEffect } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { FileText, CheckCircle2, UserCircle, Upload, TrendingUp, HelpCircle, X, Info, LayoutDashboard, Sparkles, GraduationCap, ShieldCheck, CheckSquare, History, Users, BookOpen, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { matchesMonth } from '../lib/utils';
import { Question } from '../types';
import { ProgressChart } from '../components/ProgressChart';

export default function StudentDashboard() {
  const { currentUser, questions, assessments, addAssessment, settings, updateUser, taskTemplates, studentTasks } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const month = settings.reportMonth || settings.currentAssessmentMonth || 'August';
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
  const assessmentsCompleted = studentAssessments.length > 0 || requiredCategories.every(cat => 
    teacherAssessedCategories.has(cat) || selfAssessedCategories.has(cat)
  );

  const isReportReady = assessmentsCompleted && tasksCompleted;

  const tabParam = searchParams.get('tab') as 'report' | 'spiritual' | null;
  const activeTab = tabParam || 'report';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showTutorial, setShowTutorial] = useState(false);
  
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

  const activeMonths = settings.activeAssessmentMonths || [];
  const isMonthActive = activeMonths.length === 0 || 
    (settings.currentAssessmentMonth && activeMonths.some(m => settings.currentAssessmentMonth?.toLowerCase().includes(m.toLowerCase())));

  const [isEditing, setIsEditing] = useState(false);

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {currentUser?.photoUrl ? (
                <img src={currentUser.photoUrl} alt="Profile" className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-xl" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center border-4 border-white shadow-xl">
                  <UserCircle className="w-10 h-10 text-indigo-400" />
                </div>
              )}
              <label className="absolute inset-0 bg-slate-900/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-[2px]">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3" /> Student Portal
                </div>
                {currentUser?.admissionNumber && (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    ID: {currentUser.admissionNumber}
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentUser?.name || 'My Success Hub'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {activeTab === 'report' ? 'CCE & Academic Records' : 'Spiritual Self-Assessment'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('spiritual')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
            >
              Take Assessment
            </button>
            <button 
              onClick={() => setShowTutorial(!showTutorial)}
              className={`p-2 rounded-xl transition-all ${showTutorial ? 'bg-slate-200 text-slate-900' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
            >
              {showTutorial ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {showTutorial && (
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl animate-in slide-in-from-top-4 duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <Info className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Student Quick Guide</h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">Everything you need to know about your digital records.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
                    <UserCircle className="w-4 h-4 text-blue-400" /> My Profile
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Ensure your name and admission number are correct. Click your avatar to upload an official photo.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Spiritual Journey
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Complete your self-assessment monthly. Your honest reflections help teachers guide your development.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-emerald-400" /> Digital ARC
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">View and print your Monthly Report Cards. Wellbeing scores are now prioritized at the top of your report.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                    <BookOpen className="w-3 h-3" /> Academic Record
                  </div>
                  <h3 className="text-3xl font-black leading-tight">Official Academic Transcript</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                      View your verified marks, attendance records, and faculty behavioural evaluations for the current term.
                    </p>
                    {!isReportReady && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 border border-rose-500/30 rounded-xl animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-200">Report Pending: Data Incomplete</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={() => navigate(`/report/${currentUser?.id}`)}
                    className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center gap-3 active:scale-95 ${isReportReady ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20' : 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'}`}
                  >
                    <FileText className="w-4 h-4" /> 
                    {isReportReady ? 'View Full Report Card' : 'Report Incomplete'}
                  </button>
                  {!isReportReady && (
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Requires finalized assessments & tasks</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" /> Behavioral Progress
                  </h4>
                </div>
                <ProgressChart studentId={currentUser?.id || ''} />
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800">Need Details?</h4>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">Click the "View Full Report Card" button above to access your detailed grade-wise breakdown.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'spiritual' && (
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
            <div className="mb-8 border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Spiritual Wellbeing</h3>
                <p className="text-sm text-slate-500 mt-1">Self-evaluation for <span className="font-bold text-blue-700">{settings.currentAssessmentMonth}</span>.</p>
              </div>
            </div>

            {!settings.assessmentsActive ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800">
                <p className="font-bold mb-1">Assessments Locked</p>
                <p className="text-sm">The assessment window is currently closed. You cannot submit self-assessments at this time.</p>
              </div>
            ) : !isMonthActive ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1">Assessment Inactive</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Spiritual assessments for <span className="font-bold">{settings.currentAssessmentMonth}</span> are not scheduled for submission at this time. Please check the academic calendar for active reporting periods.
                </p>
              </div>
            ) : hasAssessed && !isEditing ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h4 className="text-lg font-bold text-green-900 mb-1">Assessment Complete</h4>
                <p className="text-sm text-green-700 mb-5">You have already submitted your spiritual wellbeing assessment for <span className="font-bold">{settings.currentAssessmentMonth}</span>.</p>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-blue-700 font-bold text-sm hover:underline"
                >
                  Edit My Submission
                </button>
              </div>
            ) : spiritualQuestions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No questions are currently available for this category.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {(Object.entries(groupedQuestions) as [string, Question[]][]).map(([fieldName, qs]) => (
                  <div key={fieldName} className="space-y-6">
                    <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{fieldName}</h4>
                    </div>
                    <div className="space-y-8 pl-2">
                      {qs.map((q, idx) => (
                        <div key={q.id} className="space-y-4">
                          <label className="block font-medium text-slate-800 text-base">
                            {idx + 1}. {q.text}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { val: 100, label: 'Always' },
                              { val: 75, label: 'Often' },
                              { val: 50, label: 'Sometimes' },
                              { val: 25, label: 'Rarely' }
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
                                <div className="text-center p-3 text-sm rounded-xl border-2 border-slate-100 bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-800 hover:border-slate-300 transition-all font-medium">
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
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    type="submit"
                    className="bg-blue-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-800 transition-colors shadow-sm"
                  >
                    Submit Spiritual Assessment
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
