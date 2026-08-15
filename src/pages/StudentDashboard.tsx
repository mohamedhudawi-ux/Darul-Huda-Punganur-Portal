import React, { useState, useEffect } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { FileText, CheckCircle2, UserCircle, Upload, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Question } from '../types';
import { ProgressChart } from '../components/ProgressChart';

export default function StudentDashboard() {
  const { currentUser, questions, assessments, addAssessment, settings, updateUser } = useStore();
  const navigate = useNavigate();
  const [scores, setScores] = useState<Record<string, number>>({});
  
  const spiritualQuestions = questions.filter(q => q.category === 'spiritual');
  
  // Group questions by field
  const groupedQuestions = spiritualQuestions.reduce((acc, q) => {
    if (!acc[q.field]) acc[q.field] = [];
    acc[q.field].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const hasAssessed = assessments.some(
    a => a.studentId === currentUser?.id && a.category === 'spiritual'
  );

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
      category: 'spiritual',
      scores
    });
    
    alert('Self-assessment submitted successfully!');
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {currentUser?.photoUrl ? (
                <img src={currentUser.photoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-md">
                  <UserCircle className="w-10 h-10 text-blue-400" />
                </div>
              )}
              <label className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <h2 className="text-sm text-slate-400 uppercase font-bold tracking-wider">Student Portal</h2>
              <h3 className="text-2xl font-bold text-slate-800">My Dashboard</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
          <div className="mb-4 border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Academic Report Card</h3>
              <p className="text-sm text-slate-500 mt-1">Official performance report and CCE grades.</p>
            </div>
            <FileText className="w-8 h-8 text-amber-500/20" />
          </div>

          {settings.reportCardsActive ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-emerald-900 mb-1">Report Card Approved & Released</h4>
              <p className="text-sm text-emerald-700 mb-5">Your official report card has been approved by the administration. You can now view, print, or download it.</p>
              <button 
                onClick={() => navigate(`/report/${currentUser?.id}`)}
                className="inline-flex items-center justify-center gap-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
              >
                <FileText className="w-5 h-5" /> View & Download Report Card
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-600">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="font-bold mb-1 text-slate-800 text-lg">Pending Admin Approval</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto">Report cards are currently being processed or are awaiting final review. You will be able to download your report here once the administration approves its release.</p>
            </div>
          )}
        </div>

        {currentUser && (
          <div className="space-y-2">
            <h3 className="text-sm text-slate-400 uppercase font-bold tracking-wider px-1">Performance Analytics</h3>
            <ProgressChart studentId={currentUser.id} />
          </div>
        )}

        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
          <div className="mb-8 border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Spiritual Wellbeing Assessment</h3>
              <p className="text-sm text-slate-500 mt-1">Self-evaluation questionnaire regarding spiritual progress.</p>
            </div>
          </div>

          {!settings.assessmentsActive ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800">
              <p className="font-bold mb-1">Assessments Locked</p>
              <p className="text-sm">The assessment window is currently closed. You cannot submit self-assessments at this time.</p>
            </div>
          ) : hasAssessed ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-green-900 mb-1">Assessment Complete</h4>
              <p className="text-sm text-green-700">You have already submitted your spiritual wellbeing assessment for this period.</p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { val: 100, label: 'Always / Excellent' },
                            { val: 70, label: 'Sometimes / Good' },
                            { val: 40, label: 'Rarely / Needs Improvement' }
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
      </div>
    </Layout>
  );
}
