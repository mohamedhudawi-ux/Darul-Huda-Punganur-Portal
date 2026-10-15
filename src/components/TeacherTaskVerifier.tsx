import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle2, Circle, Search, Filter, Save, X } from 'lucide-react';
import { matchesMonth, getCanonicalMonth } from '../lib/utils';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function TeacherTaskVerifier() {
  const { users, taskTemplates, studentTasks, addStudentTask, addStudentTasks, deleteStudentTask, deleteStudentTasks, settings, currentUser } = useStore();
  
  const currentMonthName = settings.currentAssessmentMonth?.split(' ')[0] || 'August';
  const [filters, setFilters] = useState({ classGrade: '', section: '', month: currentMonthName });
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({}); // key: `${studentId}_${templateId}`
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, string>>({}); // key: `${studentId}_${templateId}`
  const [isSaving, setIsSaving] = useState(false);

  const isTeacher = currentUser?.role === 'teacher';
  const isAdmin = currentUser?.role === 'admin';

  const accessibleStudents = users.filter(u => 
    u.role === 'student' && (
      isTeacher ? (u.mentorId === currentUser?.id) : true
    )
  );

  const filteredStudents = accessibleStudents.filter(u => 
    (filters.classGrade ? u.classGrade === filters.classGrade : true) && 
    (filters.section ? u.section === filters.section : true) &&
    (searchQuery ? (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  const activeTemplates = taskTemplates.filter(t => 
    matchesMonth(t.month, filters.month) && 
    (filters.classGrade ? t.classGrade === filters.classGrade : true)
  );

  const handleToggle = (studentId: string, templateId: string) => {
    if (!isAdmin && !isTeacher) return;
    const key = `${studentId}_${templateId}`;
    const existing = studentTasks.find(t => 
      t.studentId === studentId && t.templateId === templateId && matchesMonth(t.month, filters.month)
    );
    
    setPendingChanges(prev => {
      const currentVal = prev[key] !== undefined ? prev[key] : !!existing;
      return { ...prev, [key]: !currentVal };
    });
  };

  const handleQuantityChange = (studentId: string, templateId: string, val: string) => {
    const key = `${studentId}_${templateId}`;
    setPendingQuantities(prev => ({ ...prev, [key]: val }));
    
    // Auto-enable if quantity is set and not already enabled
    const existing = studentTasks.find(t => 
      t.studentId === studentId && t.templateId === templateId && matchesMonth(t.month, filters.month)
    );
    const isCurrentlyEnabled = pendingChanges[key] !== undefined ? pendingChanges[key] : !!existing;
    
    if (val && !isCurrentlyEnabled) {
      setPendingChanges(prev => ({ ...prev, [key]: true }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const canonicalMonth = getCanonicalMonth(filters.month, settings.currentAssessmentMonth);
      const tasksToAdd: any[] = [];
      const taskIdsToDelete: string[] = [];

      filteredStudents.forEach(student => {
        activeTemplates.forEach(template => {
          const key = `${student.id}_${template.id}`;
          const existing = studentTasks.find(t => 
            t.studentId === student.id && t.templateId === template.id && matchesMonth(t.month, filters.month)
          );

          const isCompleted = pendingChanges[key] !== undefined ? pendingChanges[key] : !!existing;
          const quantity = pendingQuantities[key] !== undefined ? pendingQuantities[key] : (existing?.quantity || '');

          if (isCompleted) {
            tasksToAdd.push({
              studentId: student.id,
              templateId: template.id,
              completed: true,
              month: canonicalMonth,
              quantity
            });
          } else if (existing) {
            taskIdsToDelete.push(existing.id);
          }
        });
      });

      if (tasksToAdd.length > 0) {
        await addStudentTasks(tasksToAdd);
      }
      if (taskIdsToDelete.length > 0) {
        await deleteStudentTasks(taskIdsToDelete);
      }

      setPendingChanges({});
      setPendingQuantities({});
      alert('Task completion saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to discard unsaved changes?')) {
      setPendingChanges({});
      setPendingQuantities({});
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Task Completion Verification</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 font-medium">Verify and tick completed tasks for students.</p>
              {isTeacher && (
                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">
                  Showing My Students
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Class Grade</label>
          <select 
            value={filters.classGrade}
            onChange={e => setFilters(p => ({ ...p, classGrade: e.target.value }))}
            className="w-full rounded-lg border-slate-200 border p-2 text-sm font-bold bg-white"
          >
            <option value="">Select Class</option>
            {Array.from(new Set(accessibleStudents.filter(u => u.classGrade).map(u => u.classGrade))).sort((a, b) => {
              const na = parseInt((a as string) || '0'), nb = parseInt((b as string) || '0');
              return na - nb;
            }).map(grade => (
              <option key={(grade as string) ?? 'unknown'} value={(grade as string)}>{grade as string}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Section</label>
          <select 
            value={filters.section}
            disabled={!filters.classGrade}
            onChange={e => setFilters(p => ({ ...p, section: e.target.value }))}
            className="w-full rounded-lg border-slate-200 border p-2 text-sm font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">All Sections</option>
            {Array.from(new Set(accessibleStudents.filter(u => u.classGrade === filters.classGrade && u.section).map(u => u.section))).map(sec => (
              <option key={(sec as string) ?? 'unknown'} value={(sec as string)}>{sec as string}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Verification Month</label>
          <select 
            value={filters.month}
            onChange={e => setFilters(p => ({ ...p, month: e.target.value }))}
            className="w-full rounded-lg border-slate-200 border p-2 text-sm font-bold bg-white"
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {filters.classGrade ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[100px] w-[100px]">Student</th>
                {activeTemplates.length > 0 ? (
                  activeTemplates.map(template => (
                    <th key={template.id} className="px-4 py-3 text-[10px] font-black text-indigo-700 uppercase tracking-widest text-center min-w-[150px]">
                      {template.title}
                    </th>
                  ))
                ) : (
                  <th className="px-4 py-3 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center italic">
                    No tasks defined for {filters.month}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-200 min-w-[100px] w-[100px]">
                      <p className="text-[11px] font-bold text-slate-800 leading-tight break-words">{student.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{student.admissionNumber}</p>
                    </td>
                      {activeTemplates.length > 0 ? (
                        activeTemplates.map(template => {
                          const key = `${student.id}_${template.id}`;
                          const existingTask = studentTasks.find(t => t.studentId === student.id && t.templateId === template.id && matchesMonth(t.month, filters.month));
                          const isCompleted = pendingChanges[key] !== undefined ? pendingChanges[key] : !!existingTask;
                          const quantity = pendingQuantities[key] !== undefined ? pendingQuantities[key] : (existingTask?.quantity || '');
                          
                          return (
                            <td key={template.id} className="px-4 py-3 text-center border-r border-slate-100 last:border-r-0">
                              <div className="flex flex-col items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => handleToggle(student.id, template.id)}
                                  className={`transition-all transform active:scale-90 p-2 rounded-xl border-2 ${
                                    isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-200'
                                  }`}
                                  title={isCompleted ? 'Click to unverify' : 'Click to verify'}
                                >
                                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                </button>
                                {isCompleted && (
                                  <input 
                                    type="text" 
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(student.id, template.id, e.target.value)}
                                    placeholder="Qty/Count"
                                    className="w-full max-w-[100px] text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-center font-bold focus:ring-1 focus:ring-indigo-500"
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })
                    ) : (
                      <td className="px-4 py-3 text-center text-[10px] text-slate-400 italic">
                        Select Month with active tasks
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Math.max(1, activeTemplates.length) + 1} className="px-4 py-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    No students found in this selection
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Filter className="w-12 h-12 mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold">Please select a Class Grade to view student list.</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Verification requires class selection first.</p>
        </div>
      )}
      
      {filters.classGrade && (
        <div className="mt-6 flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Task Completion Verification</p>
              <p className="text-xs text-slate-500 font-medium">
                {Object.keys(pendingChanges).length > 0 || Object.keys(pendingQuantities).length > 0
                  ? `${Array.from(new Set([...Object.keys(pendingChanges), ...Object.keys(pendingQuantities)])).length} unsaved verification changes`
                  : 'All verification changes saved'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {(Object.keys(pendingChanges).length > 0 || Object.keys(pendingQuantities).length > 0) && (
              <button 
                onClick={handleClear}
                className="px-4 py-2 text-slate-500 font-bold text-xs uppercase hover:bg-slate-100 rounded-lg transition-colors"
              >
                Discard
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Submit Verification'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
