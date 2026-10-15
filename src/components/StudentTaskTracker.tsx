import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { CheckSquare, Square, Plus, Trash2, BookOpen, Clock, Activity, Edit3 } from 'lucide-react';
import { matchesMonth } from '../lib/utils';
import { StudentTask } from '../types';

export function StudentTaskTracker() {
  const { currentUser, taskTemplates, studentTasks, addStudentTask, deleteStudentTask, settings } = useStore();
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskQuantity, setCustomTaskQuantity] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState<{id: string, value: string} | null>(null);

  if (!currentUser) return null;

  const currentMonthName = settings.currentAssessmentMonth?.split(' ')[0] || '';
  const activeTemplates = taskTemplates.filter(t => 
    matchesMonth(t.month, currentMonthName) && 
    t.classGrade === currentUser.classGrade &&
    t.enabled !== false
  );
  const myTasks = studentTasks.filter(t => t.studentId === currentUser.id && matchesMonth(t.month, currentMonthName));

  const handleToggleTemplate = (templateId: string, title: string) => {
    const existing = myTasks.find(t => t.templateId === templateId);
    if (existing) {
      deleteStudentTask(existing.id);
    } else {
      addStudentTask({
        studentId: currentUser.id,
        templateId,
        completed: true,
        month: currentMonthName
      });
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskTitle) return;
    
    addStudentTask({
      studentId: currentUser.id,
      customTitle: customTaskTitle,
      quantity: customTaskQuantity,
      completed: true,
      month: currentMonthName
    });
    setCustomTaskTitle('');
    setCustomTaskQuantity('');
    setIsAddingCustom(false);
  };

  const handleUpdateQuantity = (task: StudentTask, newQuantity: string) => {
    addStudentTask({
      ...task,
      quantity: newQuantity
    });
    setEditingQuantity(null);
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Monthly Growth Tasks</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Tasks for {currentMonthName}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
            title="Add other activity"
          >
            {isAddingCustom ? <Trash2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        {isAddingCustom && (
          <form onSubmit={handleAddCustom} className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
            <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Log Other Activity</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">What did you do?</label>
                <input 
                  type="text" 
                  placeholder="e.g. Completed a coding project"
                  value={customTaskTitle}
                  onChange={e => setCustomTaskTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Quantity / Count (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 5 hours, 3 lessons"
                  value={customTaskQuantity}
                  onChange={e => setCustomTaskQuantity(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Save Activity
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {/* Predefined Templates */}
          {activeTemplates.map(template => {
            const completedTask = myTasks.find(t => t.templateId === template.id);
            return (
              <div 
                key={template.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                  completedTask ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleToggleTemplate(template.id, template.title)}
                    className={`shrink-0 transition-transform active:scale-90 ${completedTask ? 'text-indigo-600' : 'text-slate-300'}`}
                  >
                    {completedTask ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                  </button>
                  <div>
                    <p className={`text-sm font-bold ${completedTask ? 'text-indigo-900' : 'text-slate-700'}`}>{template.title}</p>
                    {completedTask && (
                      <div className="flex items-center gap-3 mt-2 bg-white/60 p-2 rounded-xl border border-indigo-100">
                        <label className="text-[9px] font-black uppercase text-indigo-400 tracking-wider shrink-0">Quantity/Count:</label>
                        {editingQuantity?.id === completedTask.id ? (
                          <input 
                            type="text" 
                            autoFocus
                            value={editingQuantity.value}
                            onChange={e => setEditingQuantity({ id: completedTask.id, value: e.target.value })}
                            onBlur={() => handleUpdateQuantity(completedTask, editingQuantity.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateQuantity(completedTask, editingQuantity.value)}
                            className="text-[10px] bg-white border border-indigo-200 rounded px-2 py-1 w-full focus:ring-2 focus:ring-indigo-500 font-bold"
                            placeholder="e.g. 500 pages"
                          />
                        ) : (
                          <button 
                            onClick={() => setEditingQuantity({ id: completedTask.id, value: completedTask.quantity || '' })}
                            className="text-[10px] font-bold text-indigo-700 flex items-center gap-1.5 w-full text-left"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-400" />
                            {completedTask.quantity || 'Tap to add (e.g. 10 lessons)'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Custom Tasks */}
          {myTasks.filter(t => !t.templateId).map(task => (
            <div key={task.id} className="p-4 rounded-2xl border bg-emerald-50 border-emerald-100 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 bg-emerald-600 text-white rounded flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-900">{task.customTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {editingQuantity?.id === task.id ? (
                      <input 
                        type="text" 
                        autoFocus
                        value={editingQuantity.value}
                        onChange={e => setEditingQuantity({ id: task.id, value: e.target.value })}
                        onBlur={() => handleUpdateQuantity(task, editingQuantity.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdateQuantity(task, editingQuantity.value)}
                        className="text-[10px] bg-white border border-emerald-200 rounded px-1.5 py-0.5 w-32 focus:ring-1 focus:ring-emerald-500"
                      />
                    ) : (
                      <button 
                        onClick={() => setEditingQuantity({ id: task.id, value: task.quantity || '' })}
                        className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        {task.quantity || 'No quantity set'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteStudentTask(task.id)}
                className="text-emerald-300 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {activeTemplates.length === 0 && myTasks.length === 0 && (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-xs font-medium">No tasks found for {currentMonthName}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
