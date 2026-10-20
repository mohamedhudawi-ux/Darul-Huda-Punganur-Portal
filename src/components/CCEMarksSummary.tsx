import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle2, AlertCircle, Filter } from 'lucide-react';

export function CCEMarksSummary() {
  const { users, cceMarks } = useStore();
  const [classFilter, setClassFilter] = useState('');

  const summary = useMemo(() => {
    const students = users.filter(u => u.role === 'student');
    const groups: Record<string, {
      classGrade: string;
      section: string;
      subject: string;
      cceLevel: string;
      month: string;
      totalStudents: number;
      marksUploaded: number;
    }> = {};

    // Group marks by (classGrade, section, subject, cceLevel)
    cceMarks.forEach(mark => {
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
          month: mark.month || 'Term',
          totalStudents: classStudents.length,
          marksUploaded: 0
        };
      }
      
      groups[key].marksUploaded += 1;
    });

    return Object.values(groups).sort((a, b) => {
      if (a.classGrade !== b.classGrade) return a.classGrade.localeCompare(b.classGrade);
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return a.cceLevel.localeCompare(b.cceLevel);
    });
  }, [users, cceMarks]);

  const filteredSummary = summary.filter(item => 
    !classFilter || (item.classGrade || '').toLowerCase().includes(classFilter.toLowerCase())
  );

  const classes = Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade))).sort();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            CCE Submission Status
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Summary of marks uploaded across classes, subjects, and levels.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium appearance-none"
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
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.month || 'Term'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isCompleted ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Completed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-100">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Pending ({item.totalStudents - item.marksUploaded} missing)</span>
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
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                  No CCE mark submissions found for the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
