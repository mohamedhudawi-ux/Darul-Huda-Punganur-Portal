import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Plus, Trash2, ListChecks, CheckCircle2, X } from 'lucide-react';
import { matchesMonth, getCanonicalMonth } from '../lib/utils';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function TaskTemplateManager() {
  const { taskTemplates, addTaskTemplate, deleteTaskTemplate, settings, currentUser, users } = useStore();
  const [newTitle, setNewTitle] = useState('');
  const [newMonth, setNewMonth] = useState(settings.currentAssessmentMonth?.split(' ')[0] || 'August');
  const [newGrade, setNewGrade] = useState(currentUser?.role === 'teacher' ? currentUser?.classGrade || '' : '');
  const [showAdd, setShowAdd] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';
  const canManage = isAdmin || isTeacher;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newGrade) return;
    
    try {
      await addTaskTemplate({
        title: newTitle,
        month: getCanonicalMonth(newMonth, settings.currentAssessmentMonth),
        classGrade: newGrade,
        enabled: true
      });
      setNewTitle('');
      setShowAdd(false);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (error) {
      console.error(error);
      alert("Failed to create task template.");
    }
  };

  const studentGrades = Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade as string)));
  const templateGrades = Array.from(new Set(taskTemplates.map(t => t.classGrade)));
  const defaultGrades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const allGrades = Array.from(new Set([...defaultGrades, ...studentGrades, ...templateGrades]));
  
  const grades = allGrades.sort((a, b) => {
    const na = parseInt(a as string), nb = parseInt(b as string);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return (a as string).localeCompare(b as string);
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <ListChecks className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Monthly Task Templates</h3>
            <p className="text-xs text-slate-500 font-medium">Define class-specific tasks for students to track.</p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAdd ? 'Cancel' : 'Add New Task'}
            </button>
            {successMsg && (
              <span className="text-[10px] font-black text-emerald-600 animate-bounce">Task Created Successfully!</span>
            )}
          </div>
        )}
      </div>

      {showAdd && canManage && (
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Task Title</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Read 500 pages of a book"
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Target Class</label>
              <select 
                value={newGrade}
                onChange={e => setNewGrade(e.target.value)}
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm"
                required
              >
                <option value="">Select Grade</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">Target Month</label>
              <select 
                value={newMonth}
                onChange={e => setNewMonth(e.target.value)}
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm"
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              Create Task Template
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grades.sort().map(grade => {
          const gradeTasks = taskTemplates.filter(t => t.classGrade === grade);
          if (gradeTasks.length === 0) return null;

          return (
            <div key={grade} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
              <h4 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center justify-between border-b border-indigo-100 pb-2">
                Class {grade}
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px]">{gradeTasks.length}</span>
              </h4>
              
              <div className="space-y-4">
                {MONTHS.map(month => {
                  const monthTasks = gradeTasks.filter(t => matchesMonth(t.month, month));
                  if (monthTasks.length === 0) return null;

                  return (
                    <div key={month}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">{month}</p>
                      <div className="space-y-2">
                        {monthTasks.map(task => (
                          <div key={task.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center group shadow-sm">
                            <p className="text-sm font-medium text-slate-700">{task.title}</p>
                            {canManage && (
                              <button 
                                type="button"
                                onClick={async () => {
                                  if (confirm('Delete this task template? This will not remove students verified completions.')) {
                                    try {
                                      await deleteTaskTemplate(task.id);
                                    } catch (error) {
                                      console.error(error);
                                      alert("Failed to delete task template.");
                                    }
                                  }
                                }}
                                className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {taskTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No tasks defined yet.</p>
            <p className="text-xs">Add task templates for specific classes and months.</p>
          </div>
        )}
      </div>
    </div>
  );
}
