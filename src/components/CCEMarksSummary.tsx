import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle2, AlertCircle, Filter } from 'lucide-react';

export interface CCEMarksSummaryProps {
  teacherId?: string;
  teacherName?: string;
  showOnlyTeacher?: boolean;
}

export function CCEMarksSummary({ teacherId, teacherName, showOnlyTeacher = false }: CCEMarksSummaryProps = {}) {
  const { users, cceMarks } = useStore();
  const [classFilter, setClassFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const relevantMarks = useMemo(() => {
    if (!showOnlyTeacher && !teacherId) return cceMarks;
    return (cceMarks || []).filter(mark => {
      if (teacherId && mark.teacherId) {
        return mark.teacherId === teacherId;
      }
      if (teacherName && mark.teacherName) {
        return mark.teacherName.toLowerCase() === teacherName.toLowerCase();
      }
      return false;
    });
  }, [cceMarks, showOnlyTeacher, teacherId, teacherName]);

  const summary = useMemo(() => {
    const students = users.filter(u => u.role === 'student');
    const groups: Record<string, {
      classGrade: string;
      section: string;
      subject: string;
      cceLevel: string;
      month: string;
      description?: string;
      absentCount: number;
      totalStudents: number;
      marksUploaded: number;
      teacherName?: string;
    }> = {};

    // Group marks by (classGrade, section, subject, cceLevel)
    relevantMarks.forEach(mark => {
      const student = students.find(s => s.id === mark.studentId);
      if (!student || !student.classGrade) return;

      const key = `${student.classGrade}-${student.section || 'All'}-${mark.subject}-${mark.cceLevel}`;
      
      if (!groups[key]) {
        // Find total students in this class/section
        const classStudents = students.filter(s => 
          s.classGrade === student.classGrade && 
          (student.section ? s.section === student.section : true)
        );

        groups[key] = {
          classGrade: student.classGrade,
          section: student.section || 'All',
          subject: mark.subject,
          cceLevel: mark.cceLevel,
          description: mark.description || '',
          absentCount: 0,
          month: mark.month || 'Term',
          totalStudents: classStudents.length,
          marksUploaded: 0,
          teacherName: mark.teacherName
        };
      }
      
      if (mark.description && !groups[key].description) {
        groups[key].description = mark.description;
      }
      if (mark.teacherName && !groups[key].teacherName) {
        groups[key].teacherName = mark.teacherName;
      }
      if (mark.score === 'Ab') {
        groups[key].absentCount += 1;
      }
      groups[key].marksUploaded += 1;
    });

    return Object.values(groups).sort((a, b) => {
      if (a.classGrade !== b.classGrade) return a.classGrade.localeCompare(b.classGrade);
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return a.cceLevel.localeCompare(b.cceLevel);
    });
  }, [users, relevantMarks]);

  const filteredSummary = summary.filter(item => {
    const matchesClass = !classFilter || (item.classGrade || '').toLowerCase().includes(classFilter.toLowerCase());
    const matchesLevel = !levelFilter || (item.cceLevel || '').toLowerCase() === levelFilter.toLowerCase();
    return matchesClass && matchesLevel;
  });

  const classes = Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade))).sort();
  const cceLevels = ['CCE 1', 'CCE 2', 'CCE 3', 'CCE 4', 'Mid Term Exam'];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {showOnlyTeacher 
                ? (teacherName ? `CCE Status — Given by ${teacherName}` : 'My CCE Submission Status') 
                : 'CCE Submission Status'}
            </h3>
            {showOnlyTeacher && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                My Evaluated CCE Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {showOnlyTeacher 
              ? `Review all continuous evaluation marks and portions you have submitted across your classes.` 
              : `Summary of continuous evaluation marks uploaded across classes, subjects, and levels.`}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Level Filter */}
          <div className="relative">
            <select 
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold appearance-none text-slate-700"
            >
              <option value="">All CCE Levels</option>
              {cceLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
          </div>

          {/* Class Filter */}
          <div className="relative flex-1 sm:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold appearance-none text-slate-700"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>Grade {c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class & Section</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CCE Level</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CCE Topic / Portion</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period / Month</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submission Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSummary.length > 0 ? (
              filteredSummary.map((item, idx) => {
                const isCompleted = item.marksUploaded >= item.totalStudents;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-700">Grade {item.classGrade}</span>
                      <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">{item.section}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-600">{item.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-tighter">
                        {item.cceLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.description ? (
                        <span className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                          {item.description}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.month || 'Term'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isCompleted ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Completed {item.absentCount > 0 ? `(${item.absentCount} Ab)` : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-100">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Pending ({item.totalStudents - item.marksUploaded} missing)
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-400">
                        <span className={isCompleted ? 'text-emerald-700 font-black' : 'text-slate-700 font-black'}>{item.marksUploaded}</span> / {item.totalStudents}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {showOnlyTeacher 
                        ? (teacherName ? `No CCE marks recorded by ${teacherName} yet.` : 'No CCE marks recorded by you yet.')
                        : 'No CCE mark submissions found for the selected criteria.'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {showOnlyTeacher 
                        ? 'Select "CCE Marks Entry" from the menu bar to enter marks for CCE 1, CCE 2, CCE 3, CCE 4, or Mid Term Exam.'
                        : 'Try adjusting the class or CCE level filter above.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
