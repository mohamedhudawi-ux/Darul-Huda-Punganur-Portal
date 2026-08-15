import React, { useState } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { FileText, CheckCircle2, ChevronRight, Search, Upload, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { CCEMarksManager } from '../components/CCEMarksManager';
import { Question } from '../types';
import { ProgressChart } from '../components/ProgressChart';

export default function TeacherDashboard() {
  const { currentUser, users, questions, assessments, addAssessment, settings } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'assessments' | 'cce'>('assessments');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const myStudents = users.filter(u => u.role === 'student' && (
    (u.classGrade === currentUser?.classGrade && u.section === currentUser?.section && currentUser?.classGrade) || 
    u.mentorId === currentUser?.id
  ));
  
  const filteredStudents = myStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const behaviouralQuestions = questions.filter(q => q.category === 'behavioural');
  
  // Group questions by field
  const groupedQuestions = behaviouralQuestions.reduce((acc, q) => {
    if (!acc[q.field]) acc[q.field] = [];
    acc[q.field].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const handleScoreChange = (qId: string, val: number) => {
    setScores(prev => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !currentUser) return;
    
    addAssessment({
      studentId: selectedStudent,
      assessorId: currentUser.id,
      category: 'behavioural',
      scores
    });
    
    setSelectedStudent(null);
    setScores({});
    alert('Assessment saved successfully!');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-sm text-slate-400 uppercase font-bold tracking-wider">Teacher Portal</h2>
            <h3 className="text-2xl font-bold text-slate-800">
              {currentUser?.classGrade ? `Grade ${currentUser.classGrade}${currentUser.section ? ` - ${currentUser.section}` : ''}` : 'Teacher'} Dashboard
            </h3>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">CCE Access: All Classes</p>
          </div>
        </div>

        <div className="flex space-x-2 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('assessments')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'assessments' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            My Class & Mentees
          </button>
          <button 
            onClick={() => setActiveTab('cce')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'cce' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            CCE Marks (All Classes)
          </button>
        </div>

        {activeTab === 'assessments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search students..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
              {filteredStudents.map(student => {
                const hasAssessed = assessments.some(
                  a => a.studentId === student.id && a.assessorId === currentUser?.id && a.category === 'behavioural'
                );
                
                const isMentee = student.mentorId === currentUser?.id;
                const isClassStudent = student.classGrade === currentUser?.classGrade && student.section === currentUser?.section;

                return (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student.id);
                      setScores({});
                    }}
                    className={`w-full text-left p-3 rounded-xl mb-2 flex items-center justify-between transition-all ${
                      selectedStudent === student.id 
                        ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                        : 'bg-white hover:bg-slate-50 border border-slate-100'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-slate-800 text-sm truncate">{student.name}</p>
                        <div className="flex gap-1 shrink-0">
                          {isMentee && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded uppercase tracking-tighter" title="Mentee">MNT</span>
                          )}
                          {isClassStudent && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.5 rounded uppercase tracking-tighter" title="Class Student">CLS</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">ID: {student.admissionNumber || 'N/A'}</p>
                    </div>
                    {hasAssessed && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
              {filteredStudents.length === 0 && (
                <p className="text-center text-sm text-slate-500 mt-8">No students found in your assigned class or mentees list.</p>
              )}
            </div>
          </div>

          {/* Assessment Form or Report Action */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="bg-white p-6 rounded-xl shadow-md shadow-blue-100 border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-700"></div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      {users.find(u => u.id === selectedStudent)?.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Behavioural Conduct Assessment</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/report/${selectedStudent}`)}
                    className="flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4" /> View Report Card
                  </button>
                </div>

                <div className="mb-8">
                  <ProgressChart studentId={selectedStudent} />
                </div>

                {behaviouralQuestions.length === 0 ? (
                  <p className="text-slate-500 text-sm">No behavioural questions configured by the academic office.</p>
                ) : !settings.assessmentsActive ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800">
                    <p className="font-bold mb-1">Assessments Locked</p>
                    <p className="text-sm">The academic office has currently deactivated the assessment window.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-10">
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
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                  { val: 100, label: 'Excellent (🌟)' },
                                  { val: 70, label: 'Good (👍)' },
                                  { val: 40, label: 'Needs Improvement (📈)' }
                                ].map(option => (
                                  <label key={option.val} className="cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name={`q_${q.id}`} 
                                      className="peer sr-only"
                                      required
                                      checked={scores[q.id] === option.val}
                                      onChange={() => handleScoreChange(q.id, option.val)}
                                    />
                                    <div className="text-center p-3 text-sm rounded-xl border-2 border-slate-100 bg-white peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-800 hover:border-blue-300 transition-all font-bold">
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
                    <div className="pt-4 flex justify-end">
                      <button 
                        type="submit"
                        className="bg-blue-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-md"
                      >
                        Submit Behavioural Assessment
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[400px]">
                <ChevronRight className="w-12 h-12 mb-4 text-blue-200" />
                <p className="text-lg font-bold text-slate-600">Select a student</p>
                <p className="text-sm mt-1 font-medium text-slate-500">Choose a student from the list to evaluate their behavioural conduct or view their report card.</p>
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'cce' && (
          <CCEMarksManager />
        )}
      </div>
    </Layout>
  );
}
