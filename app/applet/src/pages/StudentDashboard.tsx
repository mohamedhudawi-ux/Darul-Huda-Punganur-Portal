import React, { useState, useMemo } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { 
  FileText, UserCircle, Upload, BookOpen, AlertTriangle, PenLine, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { 
    currentUser, 
    users, 
    subjects,
    updateUser, 
    cceMarks 
  } = useStore();
  const navigate = useNavigate();

  // Mentor details
  const mentor = users.find(u => u.id === currentUser?.mentorId);

  // Student CCE Marks
  const myCceMarks = useMemo(() => {
    return (cceMarks || []).filter(m => m.studentId === currentUser?.id);
  }, [cceMarks, currentUser?.id]);

  // All allowed CCE levels
  const cceLevels = ['CCE 1', 'CCE 2', 'CCE 3', 'CCE 4', 'Mid Term Exam'];

  // Student class subjects sorted in order
  const studentSubjects = useMemo(() => {
    const matched = subjects.filter(s => String(s.classGrade) === String(currentUser?.classGrade));
    if (matched.length > 0) {
      return [...matched].sort((a, b) => a.name.localeCompare(b.name));
    }
    const uniqueSubjNames = Array.from(new Set(myCceMarks.map(m => m.subject))).sort();
    if (uniqueSubjNames.length > 0) {
      return uniqueSubjNames.map((name, idx) => ({ id: `sub_${idx}`, classGrade: currentUser?.classGrade || '10', name }));
    }
    return [
      { id: 'sub1', classGrade: '10', name: 'English' },
      { id: 'sub2', classGrade: '10', name: 'Mathematics' },
      { id: 'sub3', classGrade: '10', name: 'Science' }
    ].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, currentUser?.classGrade, myCceMarks]);

  // Build matrix of all subject + cceLevel combinations in ordered sequence
  const allEvaluations = useMemo(() => {
    const list: {
      subject: string;
      cceLevel: string;
      mark?: typeof myCceMarks[0];
      status: 'scored' | 'ab_or_zero' | 'incomplete';
      scoreDisplay: string;
      description?: string;
    }[] = [];

    studentSubjects.forEach(subj => {
      cceLevels.forEach(level => {
        const found = myCceMarks.find(m => 
          m.subject.toLowerCase() === subj.name.toLowerCase() && 
          m.cceLevel.toLowerCase() === level.toLowerCase()
        );

        if (found) {
          const isAb = found.score === 'Ab';
          const isZero = typeof found.score === 'number' && found.score === 0;
          if (isAb || isZero) {
            list.push({
              subject: subj.name,
              cceLevel: level,
              mark: found,
              status: 'ab_or_zero',
              scoreDisplay: isAb ? 'Absent (Ab)' : '0 / ' + found.maxScore,
              description: found.description
            });
          } else {
            list.push({
              subject: subj.name,
              cceLevel: level,
              mark: found,
              status: 'scored',
              scoreDisplay: `${found.score} / ${found.maxScore}`,
              description: found.description
            });
          }
        } else {
          list.push({
            subject: subj.name,
            cceLevel: level,
            status: 'incomplete',
            scoreDisplay: 'Incomplete CCE',
            description: undefined
          });
        }
      });
    });

    return list;
  }, [studentSubjects, cceLevels, myCceMarks]);

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

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* HERO BANNER */}
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
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> Student Dashboard
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
                  Welcome, {currentUser?.name || 'Student'}!
                </h1>

                <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1 flex flex-wrap items-center gap-2">
                  <span>View all your CCE marks, test portions, and academic evaluations below.</span>
                  {mentor && (
                    <span className="text-indigo-300 font-semibold inline-flex items-center gap-1">
                      • Mentor: {mentor.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STUDENT DASHBOARD CCE MARKS SECTION (ALL SUBJECTS IN ORDER) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                My CCE Marks & Evaluations
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Every subject is listed in order with all CCE levels. If ab or 0, shown in yellow. If no marks uploaded and blank, shown as Incomplete CCE.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Scored Marks
              </span>
              <span className="inline-flex items-center gap-1.5 ml-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Ab / 0 / Incomplete CCE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allEvaluations.map((item, idx) => {
              const isScored = item.status === 'scored';
              const isAbOrZero = item.status === 'ab_or_zero';
              const isIncomplete = item.status === 'incomplete';

              return (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                    isScored 
                      ? 'bg-white border-slate-200 hover:border-indigo-300' 
                      : isAbOrZero 
                      ? 'bg-yellow-50 border-yellow-400' 
                      : 'bg-yellow-50/60 border-yellow-300 border-dashed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900">{item.subject}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                      isScored 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'bg-yellow-200 text-yellow-900 border border-yellow-400'
                    }`}>
                      {item.cceLevel}
                    </span>
                  </div>

                  {item.description && (
                    <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200 text-xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 flex items-center gap-1">
                        <PenLine className="w-3 h-3 text-indigo-600" /> Tested Portion:
                      </p>
                      <p className="font-semibold text-slate-800 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">Status / Score:</span>
                    {isScored && (
                      <span className="font-black text-slate-900 text-sm bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                        {item.scoreDisplay}
                      </span>
                    )}
                    {isAbOrZero && (
                      <span className="font-black text-yellow-900 text-xs bg-yellow-200 px-3 py-1 rounded-xl border border-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-700" /> {item.scoreDisplay}
                      </span>
                    )}
                    {isIncomplete && (
                      <span className="font-black text-yellow-900 text-xs bg-yellow-200 px-3 py-1 rounded-xl border border-yellow-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-700" /> Incomplete CCE
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
