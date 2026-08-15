import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle2, FileSpreadsheet, Trash2, FileText } from 'lucide-react';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function CCEMarksManager() {
  const { users, subjects, cceMarks, addCCEMarks, deleteCCEMark, currentUser, updateSettings, settings } = useStore();
  
  const [cceClassFilters, setCceClassFilters] = useState({ classGrade: '', section: '', subject: '', cceLevel: '', month: '' });
  const [cceInputData, setCceInputData] = useState<Record<string, {score: string, maxScore: string}>>({});

  const filteredCceStudents = users.filter(u => 
    u.role === 'student' && 
    u.classGrade === cceClassFilters.classGrade && 
    (cceClassFilters.section ? u.section === cceClassFilters.section : true)
  );

  const handleCceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cceClassFilters.subject || !cceClassFilters.cceLevel || !cceClassFilters.month) {
      alert("Please select subject, month, and CCE level.");
      return;
    }
    
    const marksToSubmit = [];
    for (const student of filteredCceStudents) {
      const inputs = cceInputData[student.id];
      if (inputs && inputs.score && inputs.maxScore) {
        marksToSubmit.push({
          studentId: student.id,
          subject: cceClassFilters.subject,
          cceLevel: cceClassFilters.cceLevel,
          month: cceClassFilters.month,
          date: new Date().toISOString(),
          score: Number(inputs.score),
          maxScore: Number(inputs.maxScore)
        });
      }
    }

    if (marksToSubmit.length > 0) {
      addCCEMarks(marksToSubmit);
      alert(`Successfully submitted ${marksToSubmit.length} CCE records!`);
      // Optional: Clear just the inputs for this submission so they can see what they just submitted
      setCceInputData({});
    } else {
      alert("No marks were entered.");
    }
  };

  const handleCceInputChange = (studentId: string, field: 'score' | 'maxScore', value: string) => {
    setCceInputData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const allCceLevels = ["CCE-1", "CCE-2", "CCE-3", "CCE-4"];
  const otherLevels = allCceLevels.filter(lvl => lvl !== cceClassFilters.cceLevel);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-700" /> Enter CCE Marks
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">All Classes Access</span>
        </div>
        
        {currentUser?.role === 'admin' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
            <select 
              value={settings.reportMonth || ''}
              onChange={e => updateSettings({ reportMonth: e.target.value })}
              className="rounded border-indigo-200 p-2 text-sm text-indigo-900 font-bold bg-white"
            >
              <option value="">Select Month to Release</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={() => {
                if (!settings.reportMonth) {
                  alert("Please select a month to release first.");
                  return;
                }
                updateSettings({ isReportGenerated: true, isTotalReportGenerated: false, reportCardsActive: true });
                alert(`Monthly Report Generated and Released for ${settings.reportMonth}!`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 transition-colors shadow-sm text-sm"
            >
              <FileText className="w-4 h-4" /> Generate Monthly
            </button>
            <button
              onClick={() => {
                updateSettings({ isTotalReportGenerated: true, reportCardsActive: true });
                alert(`Total Semester Report Published!`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition-colors shadow-sm text-sm"
            >
              <FileText className="w-4 h-4" /> Publish Total
            </button>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Class Grade</label>
          <select 
            value={cceClassFilters.classGrade}
            onChange={e => setCceClassFilters(p => ({ ...p, classGrade: e.target.value, subject: '' }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 font-medium"
          >
            <option value="">Select Class</option>
            {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade))).map(grade => (
              <option key={grade ?? 'unknown'} value={grade}>{grade}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Section</label>
          <select 
            value={cceClassFilters.section}
            onChange={e => setCceClassFilters(p => ({ ...p, section: e.target.value }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 font-medium"
          >
            <option value="">All Sections</option>
            {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade === cceClassFilters.classGrade && u.section).map(u => u.section))).map(sec => (
              <option key={sec ?? 'unknown'} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Subject</label>
          <select 
            value={cceClassFilters.subject}
            onChange={e => setCceClassFilters(p => ({ ...p, subject: e.target.value }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 font-medium"
            disabled={!cceClassFilters.classGrade}
          >
            <option value="">Select Subject</option>
            {(subjects || [])
              .filter(s => s.classGrade === cceClassFilters.classGrade)
              .map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Month</label>
          <select 
            value={cceClassFilters.month}
            onChange={e => setCceClassFilters(p => ({ ...p, month: e.target.value }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 font-medium"
          >
            <option value="">Select Month</option>
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">CCE Level (Entry)</label>
          <select 
            value={cceClassFilters.cceLevel}
            onChange={e => setCceClassFilters(p => ({ ...p, cceLevel: e.target.value }))}
            className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 font-medium bg-blue-50 border-blue-200"
          >
            <option value="">Select Level</option>
            {allCceLevels.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredCceStudents.length > 0 && cceClassFilters.subject && cceClassFilters.cceLevel ? (
        <form onSubmit={handleCceSubmit}>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 border-r border-slate-200 z-10">Student</th>
                  {/* Current Entry columns */}
                  <th colSpan={2} className="px-4 py-3 text-[11px] font-black text-blue-700 uppercase bg-blue-50/50 text-center border-r border-slate-200">
                    {cceClassFilters.cceLevel} (Entry)
                  </th>
                  
                  {/* Previous/Other Levels */}
                  {otherLevels.map(lvl => (
                    <th key={lvl} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase text-center border-r border-slate-200">
                      {lvl}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-2 text-[10px] text-slate-400 border-b border-slate-200 sticky left-0 bg-slate-50 border-r border-slate-200 z-10">Name & Admission No</th>
                  <th className="px-4 py-2 text-[10px] text-slate-500 border-b border-slate-200 bg-blue-50/50">Score</th>
                  <th className="px-4 py-2 text-[10px] text-slate-500 border-b border-slate-200 bg-blue-50/50 border-r border-slate-200">Max</th>
                  
                  {otherLevels.map(lvl => (
                    <th key={lvl} className="px-4 py-2 text-[10px] text-slate-400 border-b border-r border-slate-200 text-center font-normal">
                      Score / Max
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCceStudents.map(student => {
                  
                  // Find all marks for this student + subject
                  const studentMarks = cceMarks.filter(m => m.studentId === student.id && m.subject === cceClassFilters.subject);
                  
                  // Look up existing mark for the CURRENT active level and month (if they want to overwrite)
                  const currentLevelMark = studentMarks.find(m => m.cceLevel === cceClassFilters.cceLevel && m.month === cceClassFilters.month);
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-200 z-10">
                        <p className="text-sm font-bold text-slate-800">{student.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{student.admissionNumber || 'N/A'}</p>
                      </td>
                      
                      {/* Entry Fields */}
                      <td className="px-4 py-3 bg-blue-50/10">
                        <input 
                          type="number"
                          min="0"
                          step="0.5"
                          value={cceInputData[student.id]?.score ?? currentLevelMark?.score ?? ''}
                          onChange={(e) => handleCceInputChange(student.id, 'score', e.target.value)}
                          className="w-20 rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Score"
                        />
                      </td>
                      <td className="px-4 py-3 bg-blue-50/10 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="1"
                            step="0.5"
                            value={cceInputData[student.id]?.maxScore ?? currentLevelMark?.maxScore ?? ''}
                            onChange={(e) => handleCceInputChange(student.id, 'maxScore', e.target.value)}
                            className="w-20 rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Max"
                          />
                          {currentLevelMark && (
                            <button 
                              type="button" 
                              onClick={() => {
                                if (window.confirm('Delete this mark?')) {
                                  deleteCCEMark(currentLevelMark.id);
                                  // Clear input so it doesn't immediately re-save
                                  setCceInputData(prev => {
                                    const next = {...prev};
                                    delete next[student.id];
                                    return next;
                                  });
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Delete existing mark"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Display Other Levels */}
                      {otherLevels.map(lvl => {
                        const mark = studentMarks.find(m => m.cceLevel === lvl && m.month === cceClassFilters.month);
                        return (
                          <td key={lvl} className="px-4 py-3 text-center border-r border-slate-100 text-sm">
                            {mark ? (
                              <span className="font-bold text-slate-700">
                                {mark.score} <span className="text-slate-400 font-normal text-[11px]">/ {mark.maxScore}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-xs">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              Entering marks for <span className="font-bold text-blue-700">{cceClassFilters.cceLevel}</span>. Existing values will be updated if changed.
            </p>
            <button 
              type="submit"
              className="bg-blue-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-md flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> Save CCE Marks
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="font-bold text-slate-600 mb-1">Incomplete Selection</p>
          <p className="text-sm">Please select Class Grade, Section, Subject, and CCE Level to enter or view marks.</p>
        </div>
      )}
    </div>
  );
}
