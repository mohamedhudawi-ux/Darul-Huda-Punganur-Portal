import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle2, Trophy, Trash2, Search } from 'lucide-react';
import { matchesMonth, getCanonicalMonth } from '../lib/utils';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function SkillClubManager() {
  const { users, skillClubMarks, addSkillClubMarks, deleteSkillClubMark, currentUser, settings } = useStore();
  
  const currentMonthName = settings.currentAssessmentMonth?.split(' ')[0] || 'August';
  const [filters, setFilters] = useState({ classGrade: '', section: '', month: currentMonthName });
  const [inputData, setInputData] = useState<Record<string, {score: string}>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';
  const canEdit = isAdmin || isTeacher;

  const myStudents = users.filter(u => 
    u.role === 'student' && (
      (isTeacher ? (u.mentorId === currentUser?.id || (u.classGrade === currentUser?.classGrade && u.section === currentUser?.section)) : true)
    )
  );

  const filteredStudents = (filters.classGrade || searchQuery.length >= 1) ? myStudents.filter(u => 
    (filters.classGrade ? u.classGrade === filters.classGrade : true) && 
    (filters.section ? u.section === filters.section : true) &&
    (
      searchQuery === '' || 
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.admissionNumber && (u.admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase()))
    )
  ) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!filters.month) {
      alert("Please select month.");
      return;
    }
    
    const marksToSubmit = [];
    for (const student of filteredStudents) {
      const inputs = inputData[student.id];
      if (inputs && (inputs.score !== undefined && inputs.score !== '')) {
        marksToSubmit.push({
          studentId: student.id,
          month: filters.month,
          date: new Date().toISOString(),
          score: Number(inputs.score)
        });
      }
    }

    if (marksToSubmit.length > 0) {
      try {
        const canonicalMonth = getCanonicalMonth(filters.month, settings.currentAssessmentMonth);
        await addSkillClubMarks(marksToSubmit.map(m => ({ ...m, month: canonicalMonth })));
        alert(`Successfully submitted ${marksToSubmit.length} skill club records!`);
        setInputData({});
      } catch (error) {
        console.error(error);
        alert("Failed to save club points.");
      }
    } else {
      alert("No marks were entered.");
    }
  };

  const handleInputChange = (studentId: string, field: 'score', value: string) => {
    if (!canEdit) return;
    setInputData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" /> Skill Club Points
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wider">
              {canEdit ? 'Academic Entry Portal' : 'View Only Mode'}
            </span>
            {isTeacher && (
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                Showing My Students
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Class Grade</label>
          <select 
            value={filters.classGrade}
            onChange={e => setFilters(p => ({ ...p, classGrade: e.target.value }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="">Select Class</option>
            {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade))).sort((a, b) => {
              const na = parseInt((a as string) || '0'), nb = parseInt((b as string) || '0');
              return na - nb;
            }).map(grade => (
              <option key={(grade as string) ?? 'unknown'} value={(grade as string)}>{grade as string}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Section</label>
          <select 
            value={filters.section}
            onChange={e => setFilters(p => ({ ...p, section: e.target.value }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="">All Sections</option>
            {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade === filters.classGrade && u.section).map(u => u.section))).map(sec => (
              <option key={(sec as string) ?? 'unknown'} value={(sec as string)}>{sec as string}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Month</label>
          <select 
            value={filters.month}
            onChange={e => setFilters(p => ({ ...p, month: e.target.value }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-amber-500 focus:border-amber-500 font-medium"
          >
            <option value="">Select Month</option>
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
           <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-amber-500 rounded-xl text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 font-bold text-slate-900 shadow-sm"
              autoFocus
            />
          </div>
        </div>
      </div>

      {filters.month ? (
        <form onSubmit={handleSubmit}>
          {filteredStudents.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 border-r border-slate-200 z-10">Student</th>
                      <th className="px-4 py-3 text-[11px] font-black text-amber-700 uppercase bg-amber-50/50 text-center border-r border-slate-200">
                        Monthly Points
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase text-center">Total Points (Cumulative)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(student => {
                      const studentMarks = skillClubMarks.filter(m => m.studentId === student.id);
                      const currentMark = studentMarks.find(m => matchesMonth(m.month, filters.month));
                      const totalScore = studentMarks.reduce((acc, m) => acc + (m.score === 'Ab' ? 0 : m.score), 0);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-200 z-10">
                            <p className="text-sm font-bold text-slate-800">{student.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{student.admissionNumber || 'N/A'}</p>
                          </td>
                          <td className="px-4 py-3 bg-amber-50/10 border-r border-slate-200">
                            <div className="flex items-center justify-center gap-2">
                              <input 
                                type="number"
                                min="0"
                                disabled={!canEdit}
                                value={inputData[student.id]?.score ?? currentMark?.score ?? ''}
                                onChange={(e) => handleInputChange(student.id, 'score', e.target.value)}
                                className="w-full max-w-[120px] rounded-lg border-slate-300 border p-2 text-sm focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-400 text-center font-bold"
                                placeholder="0"
                              />
                              {currentMark && canEdit && (
                                <button 
                                  type="button"
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this mark?')) {
                                      try {
                                        await deleteSkillClubMark(currentMark.id);
                                      } catch (error) {
                                        console.error(error);
                                        alert("Failed to delete mark.");
                                      }
                                    }
                                  }}
                                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                  title="Delete marks"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-slate-600">
                            {totalScore} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {canEdit && (
                <div className="flex justify-between items-center bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-900 font-medium">
                    Saving club points for <span className="font-black underline">{filteredStudents.length} student(s)</span> for <span className="font-black">{filters.month}</span>.
                  </p>
                  <button 
                    type="submit"
                    className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 flex items-center gap-2 uppercase tracking-wider text-xs"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Save Club Points
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-1">Search to Begin Entry</h4>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Type a student's <strong>Name</strong> or <strong>Admission Number</strong> above to enter their skill club points.</p>
            </div>
          )}
        </form>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="font-bold text-slate-600 mb-1">Month Required</p>
          <p className="text-sm">Please select a month to view or enter skill club points.</p>
        </div>
      )}
    </div>
  );
}
