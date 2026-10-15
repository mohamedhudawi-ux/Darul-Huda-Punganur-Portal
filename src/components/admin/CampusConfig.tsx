import React from 'react';
import { useStore } from '../../lib/store';
import { Calendar, Layers, Clock, CheckCircle2, Zap, RefreshCw } from 'lucide-react';
import { getAcademicMonthForDate } from '../../lib/utils';

export function CampusConfig() {
  const { settings, updateSettings } = useStore();

  const currentAcademicMonth = getAcademicMonthForDate(new Date(), settings.academicYear);

  const handleMonthToggle = (month: string) => {
    const yearParts = settings.academicYear?.split('-') || [];
    const startYear = yearParts[0] || new Date().getFullYear().toString();
    const endYear = yearParts[1] || (parseInt(startYear) + 1).toString();
    
    const monthsInNextYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
    const yearToUse = monthsInNextYear.includes(month) ? endYear : startYear;
    const fullMonth = `${month} ${yearToUse}`;

    const isActive = (settings.activeAssessmentMonths || []).includes(month);
    const updated = isActive ? [] : [month];
    
    updateSettings({ 
      activeAssessmentMonths: updated,
      currentAssessmentMonth: isActive ? '' : fullMonth,
      reportMonth: isActive ? '' : fullMonth
    });
  };

  const handleYearChange = (newYear: string) => {
    const updates: any = { academicYear: newYear };
    
    if (settings.activeAssessmentMonths?.[0]) {
      const month = settings.activeAssessmentMonths[0];
      const parts = newYear.split('-');
      const startYear = parts[0];
      const endYear = parts[1];
      const monthsInNextYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
      const yearToUse = monthsInNextYear.includes(month) ? endYear : startYear;
      
      if (yearToUse) {
        const fullMonth = `${month} ${yearToUse}`;
        updates.currentAssessmentMonth = fullMonth;
        updates.reportMonth = fullMonth;
      }
    }
    updateSettings(updates);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Year Selection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Academic Session</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Year Config</p>
              </div>
            </div>
            
            <select 
              value={settings.academicYear || ''} 
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full rounded-xl border-slate-200 border-2 p-3 text-sm font-bold focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white transition-colors cursor-pointer"
            >
              <option value="">Select Academic Year</option>
              {Array.from({ length: 2050 - 2023 }, (_, i) => 2024 + i).map(y => (
                <option key={y} value={`${y}-${y+1}`}>{y} - {y+1}</option>
              ))}
            </select>
            <p className="mt-3 text-[10px] text-slate-400 font-medium italic">Changes propagate instantly to all student profiles.</p>
          </div>
        </div>

        {/* Semester Selection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Active Semester</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Term State</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {['Rabee Sem', 'Ramadan Sem'].map(sem => (
                <button
                  key={sem}
                  onClick={() => updateSettings({ currentSemester: sem })}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                    settings.currentSemester === sem 
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-200' 
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-400 font-medium italic">Current term: <span className="text-indigo-600 font-bold">{settings.currentSemester || 'Not Set'}</span></p>
          </div>
        </div>
      </div>

      {/* Global Active Assessment Month */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Active Assessment Cycle</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Global Month Synchronization</p>
              </div>
            </div>
            {settings.currentAssessmentMonth && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest">{settings.currentAssessmentMonth}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => {
              const isActive = (settings.activeAssessmentMonths || []).includes(month);
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthToggle(month)}
                  className={`group relative px-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 overflow-hidden ${
                    isActive 
                      ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 scale-105 z-10' 
                      : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className="relative z-10">{month.substring(0, 3)}</span>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Auto Advance Month Setting */}
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mt-0.5 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">Automatic Month Rollover</h5>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {settings.autoAdvanceMonth !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automatically moves to the new month once the current month is over (Current Calendar Month: <strong className="text-slate-200">{currentAcademicMonth.fullMonth}</strong>).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  updateSettings({
                    currentAssessmentMonth: currentAcademicMonth.fullMonth,
                    reportMonth: currentAcademicMonth.fullMonth,
                    activeAssessmentMonths: [currentAcademicMonth.monthName]
                  });
                }}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/10"
                title="Sync now with current calendar month"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync to Current ({currentAcademicMonth.monthName.substring(0, 3)})</span>
              </button>

              <button
                type="button"
                onClick={() => updateSettings({ autoAdvanceMonth: settings.autoAdvanceMonth === false ? true : false })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.autoAdvanceMonth !== false ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoAdvanceMonth !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed font-medium">
            Selecting a month here instantly switches the entire portal's context. Teachers will submit marks for this month, and student report cards will automatically pull data from the synchronized <span className="text-white font-bold">{settings.currentAssessmentMonth || 'Active Month'}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
