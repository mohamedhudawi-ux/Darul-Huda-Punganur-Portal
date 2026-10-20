import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle2, FileSpreadsheet, Trash2, Plus, Check, Layers, AlertCircle, Sparkles } from 'lucide-react';
import { CCEMark } from '../types';

export type BaseCceLevel = 'CCE 1' | 'CCE 2' | 'CCE 3' | 'CCE 4' | 'Mid Term';

export interface CceLevelConfig {
  id: BaseCceLevel;
  name: string;
  maxTimes: number; // CCE 1: 3, CCE 2: 2, CCE 3: 1, CCE 4: 1, Mid Term: 1
}

export const CCE_CONFIGS: CceLevelConfig[] = [
  { id: 'CCE 1', name: 'CCE 1', maxTimes: 3 },
  { id: 'CCE 2', name: 'CCE 2', maxTimes: 2 },
  { id: 'CCE 3', name: 'CCE 3', maxTimes: 1 },
  { id: 'CCE 4', name: 'CCE 4', maxTimes: 1 },
  { id: 'Mid Term', name: 'Mid Term', maxTimes: 1 },
];

// Helper to determine base CCE level from string (case & format insensitive)
export function getBaseCceLevel(levelStr: string): BaseCceLevel {
  const clean = (levelStr || '').trim().toLowerCase();
  if (clean.includes('mid')) return 'Mid Term';
  if (clean.includes('cce-4') || clean.includes('cce 4') || clean.includes('cce4')) return 'CCE 4';
  if (clean.includes('cce-3') || clean.includes('cce 3') || clean.includes('cce3')) return 'CCE 3';
  if (clean.includes('cce-2') || clean.includes('cce 2') || clean.includes('cce2')) return 'CCE 2';
  return 'CCE 1';
}

// Maps all student marks for a subject into structured slots: BaseLevel -> Time (1..3) -> CCEMark
export function mapStudentMarksToSlots(marks: CCEMark[]): Record<BaseCceLevel, Record<number, CCEMark>> {
  const result: Record<BaseCceLevel, Record<number, CCEMark>> = {
    'CCE 1': {},
    'CCE 2': {},
    'CCE 3': {},
    'CCE 4': {},
    'Mid Term': {},
  };

  // Group marks by base level
  const byBase: Record<BaseCceLevel, CCEMark[]> = {
    'CCE 1': [],
    'CCE 2': [],
    'CCE 3': [],
    'CCE 4': [],
    'Mid Term': [],
  };

  marks.forEach(m => {
    const base = getBaseCceLevel(m.cceLevel);
    byBase[base].push(m);
  });

  // For each base, resolve time index
  (Object.keys(byBase) as BaseCceLevel[]).forEach(base => {
    const list = byBase[base];
    if (list.length === 0) return;

    if (base === 'CCE 3' || base === 'CCE 4' || base === 'Mid Term') {
      // Only 1 time allowed, take latest or only
      result[base][1] = list[list.length - 1];
      return;
    }

    // For CCE 1 and CCE 2:
    // First, check if any mark has explicit time indicator in cceLevel string
    const unassigned: CCEMark[] = [];
    list.forEach(m => {
      const clean = (m.cceLevel || '').toLowerCase();
      let explicitTime = 0;
      if (clean.includes('time 3') || clean.includes('(3)') || clean.includes('- 3') || clean.includes('-3') || clean.endsWith(' 3')) {
        explicitTime = 3;
      } else if (clean.includes('time 2') || clean.includes('(2)') || clean.includes('- 2') || clean.includes('-2') || clean.endsWith(' 2')) {
        explicitTime = 2;
      } else if (clean.includes('time 1') || clean.includes('(1)') || clean.includes('- 1') || clean.includes('-1') || clean.endsWith(' 1')) {
        explicitTime = 1;
      }

      const maxAllowed = base === 'CCE 1' ? 3 : 2;
      if (explicitTime >= 1 && explicitTime <= maxAllowed && !result[base][explicitTime]) {
        result[base][explicitTime] = m;
      } else {
        unassigned.push(m);
      }
    });

    // For remaining unassigned marks (e.g. legacy marks that were simply named "CCE-1" with different dates/months),
    // sort by date/month and assign to empty slots 1, 2, 3 so NO marks are ever lost!
    unassigned.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const maxAllowed = base === 'CCE 1' ? 3 : 2;
    unassigned.forEach(m => {
      for (let t = 1; t <= maxAllowed; t++) {
        if (!result[base][t]) {
          result[base][t] = m;
          break;
        }
      }
    });
  });

  return result;
}

export function CCEMarksManager() {
  const { users, subjects, cceMarks, addCCEMarks, deleteCCEMark } = useStore();
  
  // Selection filters (MONTH SELECTION HAS BEEN REMOVED)
  const [cceClassFilters, setCceClassFilters] = useState({ classGrade: '', section: '', subject: '' });
  const [selectedLevel, setSelectedLevel] = useState<BaseCceLevel>('CCE 1');
  const [selectedTime, setSelectedTime] = useState<number>(1);

  // Tracks explicitly user-added times for each level beyond Time 1
  const [userAddedTimes, setUserAddedTimes] = useState<Record<BaseCceLevel, number>>({
    'CCE 1': 1,
    'CCE 2': 1,
    'CCE 3': 1,
    'CCE 4': 1,
    'Mid Term': 1,
  });

  // Quick batch fill helper for max score
  const [quickMaxScore, setQuickMaxScore] = useState<string>('25');

  // Input state for current table: studentId -> { score, maxScore }
  const [cceInputData, setCceInputData] = useState<Record<string, { score: string; maxScore: string }>>({});

  const filteredCceStudents = useMemo(() => {
    return users.filter(u => 
      u.role === 'student' && 
      u.classGrade === cceClassFilters.classGrade && 
      (cceClassFilters.section ? u.section === cceClassFilters.section : true)
    );
  }, [users, cceClassFilters.classGrade, cceClassFilters.section]);

  // Determine which times exist for each level in the database for this class & subject
  // This guarantees all marks added previously are visible immediately!
  const existingMaxTimesByLevel = useMemo(() => {
    const counts: Record<BaseCceLevel, number> = {
      'CCE 1': 1,
      'CCE 2': 1,
      'CCE 3': 1,
      'CCE 4': 1,
      'Mid Term': 1,
    };

    if (!cceClassFilters.subject) return counts;

    filteredCceStudents.forEach(student => {
      const studentMarks = cceMarks.filter(m => m.studentId === student.id && m.subject === cceClassFilters.subject);
      const slots = mapStudentMarksToSlots(studentMarks);
      
      [1, 2, 3].forEach(t => {
        if (slots['CCE 1'][t]) counts['CCE 1'] = Math.max(counts['CCE 1'], t);
      });
      [1, 2].forEach(t => {
        if (slots['CCE 2'][t]) counts['CCE 2'] = Math.max(counts['CCE 2'], t);
      });
    });

    return counts;
  }, [filteredCceStudents, cceMarks, cceClassFilters.subject]);

  // Effective available times for each level is the maximum of user-added or database existing
  const availableTimesForLevel = (level: BaseCceLevel): number[] => {
    const maxConfigured = CCE_CONFIGS.find(c => c.id === level)?.maxTimes || 1;
    const effectiveCount = Math.min(
      maxConfigured, 
      Math.max(userAddedTimes[level] || 1, existingMaxTimesByLevel[level] || 1)
    );
    const times: number[] = [];
    for (let t = 1; t <= effectiveCount; t++) {
      times.push(t);
    }
    return times;
  };

  const currentLevelConfig = CCE_CONFIGS.find(c => c.id === selectedLevel)!;
  const currentAvailableTimes = availableTimesForLevel(selectedLevel);
  const canAddNextTime = currentAvailableTimes.length < currentLevelConfig.maxTimes;

  // Add the next time for the active CCE level
  const handleAddNextCce = () => {
    if (!canAddNextTime) return;
    const nextTime = currentAvailableTimes.length + 1;
    setUserAddedTimes(prev => ({
      ...prev,
      [selectedLevel]: Math.max(prev[selectedLevel] || 1, nextTime),
    }));
    setSelectedTime(nextTime);
  };

  // Helper to get formatted cceLevel string for saving
  const formatSaveLevelString = (level: BaseCceLevel, time: number): string => {
    if (level === 'CCE 1') {
      return time === 1 ? 'CCE-1' : `CCE 1 - ${time}`;
    }
    if (level === 'CCE 2') {
      return time === 1 ? 'CCE-2' : `CCE 2 - ${time}`;
    }
    if (level === 'CCE 3') return 'CCE-3';
    if (level === 'CCE 4') return 'CCE-4';
    return 'Mid-term';
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

  // Apply quick max score to all students in table
  const applyQuickMaxScoreToAll = () => {
    if (!quickMaxScore || isNaN(Number(quickMaxScore))) {
      alert('Please enter a valid max score number.');
      return;
    }
    const nextInputs: Record<string, { score: string; maxScore: string }> = { ...cceInputData };
    filteredCceStudents.forEach(st => {
      const studentMarks = cceMarks.filter(m => m.studentId === st.id && m.subject === cceClassFilters.subject);
      const slots = mapStudentMarksToSlots(studentMarks);
      const existing = slots[selectedLevel][selectedTime];
      nextInputs[st.id] = {
        score: nextInputs[st.id]?.score ?? (existing ? String(existing.score) : ''),
        maxScore: quickMaxScore,
      };
    });
    setCceInputData(nextInputs);
  };

  const handleCceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cceClassFilters.classGrade || !cceClassFilters.subject) {
      alert("Please select Class Grade and Subject first.");
      return;
    }

    const marksToSubmit: (Omit<CCEMark, 'id'> & { existingId?: string })[] = [];
    const saveLevel = formatSaveLevelString(selectedLevel, selectedTime);

    for (const student of filteredCceStudents) {
      const inputs = cceInputData[student.id];
      const studentMarks = cceMarks.filter(m => m.studentId === student.id && m.subject === cceClassFilters.subject);
      const slots = mapStudentMarksToSlots(studentMarks);
      const existingSlotMark = slots[selectedLevel][selectedTime];

      const scoreVal = inputs?.score !== undefined ? inputs.score : (existingSlotMark ? String(existingSlotMark.score) : '');
      const maxVal = inputs?.maxScore !== undefined ? inputs.maxScore : (existingSlotMark ? String(existingSlotMark.maxScore) : '');

      if (scoreVal !== '' && maxVal !== '') {
        marksToSubmit.push({
          studentId: student.id,
          subject: cceClassFilters.subject,
          cceLevel: saveLevel,
          month: existingSlotMark?.month || '', // preserve existing month metadata without requiring user selection
          date: new Date().toISOString(),
          score: scoreVal === 'Ab' ? 'Ab' : Number(scoreVal),
          maxScore: Number(maxVal),
          existingId: existingSlotMark?.id,
        });
      }
    }

    if (marksToSubmit.length > 0) {
      try {
        await addCCEMarks(marksToSubmit);
        alert(`Successfully saved ${marksToSubmit.length} marks for ${selectedLevel}${selectedLevel === 'CCE 1' || selectedLevel === 'CCE 2' ? ` (Time ${selectedTime})` : ''}!`);
        setCceInputData({});
      } catch (error) {
        console.error(error);
        alert("Failed to save CCE marks. Please check connection.");
      }
    } else {
      alert("No marks were entered.");
    }
  };

  // Build the list of all column slots for the table view
  // Shows active entry column and all other unlocked/configured levels side-by-side!
  const allOtherColumnSlots = useMemo(() => {
    const list: { level: BaseCceLevel; time: number; label: string }[] = [];
    CCE_CONFIGS.forEach(cfg => {
      const times = availableTimesForLevel(cfg.id);
      times.forEach(t => {
        // Skip current active entry slot
        if (cfg.id === selectedLevel && t === selectedTime) return;
        const label = (cfg.id === 'CCE 1' || cfg.id === 'CCE 2') 
          ? `${cfg.name} (T${t})` 
          : cfg.name;
        list.push({ level: cfg.id, time: t, label });
      });
    });
    return list;
  }, [selectedLevel, selectedTime, userAddedTimes, existingMaxTimesByLevel]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                CCE Marks Portal
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Record and manage Continuous Comprehensive Evaluation marks across terms.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-black">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>All Existing Marks Kept & Preserved</span>
        </div>
      </div>
      
      {/* Primary Selection Controls (Class, Section, Subject) - Month removed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Class Grade</label>
          <select 
            value={cceClassFilters.classGrade}
            onChange={e => {
              setCceClassFilters(p => ({ ...p, classGrade: e.target.value, subject: '' }));
              setCceInputData({});
            }}
            className="w-full rounded-xl border-slate-300 border p-2.5 text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Class Grade</option>
            {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade))).map(grade => (
              <option key={grade ?? 'unknown'} value={grade}>Grade {grade}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Section</label>
          <select 
            value={cceClassFilters.section}
            onChange={e => {
              setCceClassFilters(p => ({ ...p, section: e.target.value }));
              setCceInputData({});
            }}
            className="w-full rounded-xl border-slate-300 border p-2.5 text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Sections</option>
            {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade === cceClassFilters.classGrade && u.section).map(u => u.section))).map(sec => (
              <option key={sec ?? 'unknown'} value={sec}>Section {sec}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Subject</label>
          <select 
            value={cceClassFilters.subject}
            onChange={e => {
              setCceClassFilters(p => ({ ...p, subject: e.target.value }));
              setCceInputData({});
            }}
            className="w-full rounded-xl border-slate-300 border p-2.5 text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      </div>

      {/* CCE LEVEL SELECTION & ADD BUTTON - USER REQUESTED DESIGN */}
      {/* "So only show the cce 1, 2, 3, 4, and mid term option side of that show add button so that they can add the next cce" */}
      <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/70 p-5 rounded-2xl border border-blue-100/80 mb-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          {/* Left: The 5 Options (CCE 1, CCE 2, CCE 3, CCE 4, Mid Term) */}
          <div className="flex-1 w-full lg:w-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Select Assessment Level
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                (CCE 1: 1-3 times, CCE 2: 1-2 times, CCE 3, CCE 4 & Mid Term: 1 time)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {CCE_CONFIGS.map(cfg => {
                const isSelected = selectedLevel === cfg.id;
                const timesCount = availableTimesForLevel(cfg.id).length;
                return (
                  <button
                    key={cfg.id}
                    type="button"
                    onClick={() => {
                      setSelectedLevel(cfg.id);
                      setSelectedTime(1);
                      setCceInputData({});
                    }}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-blue-700 text-white shadow-md shadow-blue-200 ring-2 ring-blue-700 ring-offset-2' 
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{cfg.name}</span>
                    {cfg.maxTimes > 1 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                        isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {timesCount}/{cfg.maxTimes}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Side of that show add button so that they can add the next cce */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-3 lg:pt-0 lg:pl-5">
            {canAddNextTime ? (
              <button
                type="button"
                onClick={handleAddNextCce}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                title={`Add next occurrence for ${selectedLevel}`}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Next {selectedLevel} ({currentAvailableTimes.length + 1} of {currentLevelConfig.maxTimes})</span>
              </button>
            ) : (
              <div className="bg-slate-100 text-slate-500 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {currentLevelConfig.maxTimes === 1 
                    ? `${selectedLevel}: Single Entry Only` 
                    : `${selectedLevel} Max (${currentLevelConfig.maxTimes}/${currentLevelConfig.maxTimes}) Added`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sub-selector for Levels that have multiple times (CCE 1: 1-3 times, CCE 2: 1-2 times) */}
        {currentAvailableTimes.length > 1 && (
          <div className="mt-4 pt-3 border-t border-blue-100/60 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-slate-500 mr-1">
              Select Time / Attempt:
            </span>
            {currentAvailableTimes.map(t => {
              const isTimeSelected = selectedTime === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedTime(t);
                    setCceInputData({});
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${
                    isTimeSelected
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
                  }`}
                >
                  <span>Time {t} ({t === 1 ? '1st' : t === 2 ? '2nd' : '3rd'})</span>
                  {isTimeSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Student Entry Table or Instruction Callout */}
      {filteredCceStudents.length > 0 && cceClassFilters.subject ? (
        <form onSubmit={handleCceSubmit}>
          {/* Quick Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            <div className="text-xs font-bold text-slate-600">
              Grading <span className="font-black text-blue-700">{filteredCceStudents.length}</span> students for{' '}
              <span className="font-black text-slate-800">{cceClassFilters.subject}</span> &bull;{' '}
              <span className="font-black text-blue-700">
                {selectedLevel} {currentAvailableTimes.length > 1 ? `(Time ${selectedTime})` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Fill Max Score:</span>
              <input 
                type="number"
                min="1"
                step="0.5"
                value={quickMaxScore}
                onChange={e => setQuickMaxScore(e.target.value)}
                className="w-16 rounded-lg border-slate-300 border p-1 text-xs font-bold text-center bg-white"
                placeholder="25"
              />
              <button
                type="button"
                onClick={applyQuickMaxScoreToAll}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Apply to All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-[11px] font-black text-slate-600 uppercase sticky left-0 bg-slate-50 border-r border-slate-200 z-10 min-w-[180px]">
                    Student
                  </th>
                  
                  {/* Current Active Entry columns */}
                  <th colSpan={2} className="px-4 py-3.5 text-[11px] font-black text-blue-800 uppercase bg-blue-100/60 text-center border-r-2 border-blue-400">
                    {selectedLevel} {currentAvailableTimes.length > 1 ? `(Time ${selectedTime})` : ''} [Active Entry]
                  </th>
                  
                  {/* Other Levels / Times Overview Columns */}
                  {allOtherColumnSlots.map(slot => (
                    <th key={`${slot.level}-${slot.time}`} className="px-3 py-3.5 text-[11px] font-black text-slate-500 uppercase text-center border-r border-slate-200 min-w-[90px]">
                      {slot.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="px-4 py-2 text-[10px] font-bold text-slate-400 border-b border-slate-200 sticky left-0 bg-slate-50 border-r border-slate-200 z-10">
                    Name & Admission ID
                  </th>
                  <th className="px-3 py-2 text-[10px] font-black text-blue-700 border-b border-slate-200 bg-blue-100/40 text-center">
                    Score / Ab
                  </th>
                  <th className="px-3 py-2 text-[10px] font-black text-blue-700 border-b border-r-2 border-blue-400 bg-blue-100/40 text-center">
                    Max Mark
                  </th>
                  
                  {allOtherColumnSlots.map(slot => (
                    <th key={`${slot.level}-${slot.time}`} className="px-2 py-2 text-[10px] text-slate-400 border-b border-r border-slate-200 text-center font-bold">
                      Saved / Max
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCceStudents.map(student => {
                  const studentMarks = cceMarks.filter(m => m.studentId === student.id && m.subject === cceClassFilters.subject);
                  const slots = mapStudentMarksToSlots(studentMarks);
                  const activeMark = slots[selectedLevel][selectedTime];
                  const currentInput = cceInputData[student.id];

                  const displayScore = currentInput?.score !== undefined 
                    ? currentInput.score 
                    : (activeMark ? String(activeMark.score) : '');

                  const displayMax = currentInput?.maxScore !== undefined 
                    ? currentInput.maxScore 
                    : (activeMark ? String(activeMark.maxScore) : '');

                  const isAbsent = displayScore === 'Ab';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-200 z-10">
                        <p className="text-sm font-black text-slate-800">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase">
                          ID: {student.admissionNumber || 'N/A'} {student.section ? `• Sec ${student.section}` : ''}
                        </p>
                      </td>
                      
                      {/* Active Entry: Score input with Ab toggle */}
                      <td className="px-3 py-3 bg-blue-50/20 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input 
                            type={isAbsent ? 'text' : 'number'}
                            min="0"
                            step="0.5"
                            value={displayScore}
                            onChange={(e) => handleCceInputChange(student.id, 'score', e.target.value)}
                            className={`w-18 rounded-lg border-slate-300 border p-2 text-sm font-black text-center focus:ring-2 focus:ring-blue-500 ${
                              isAbsent ? 'bg-rose-100 text-rose-700 font-black border-rose-300' : 'bg-white'
                            }`}
                            placeholder="Score"
                            readOnly={isAbsent}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleCceInputChange(student.id, 'score', isAbsent ? '' : 'Ab');
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                              isAbsent
                                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600'
                            }`}
                            title="Toggle Absent"
                          >
                            Ab
                          </button>
                        </div>
                      </td>

                      {/* Active Entry: Max score input and Delete action */}
                      <td className="px-3 py-3 bg-blue-50/20 border-r-2 border-blue-400 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input 
                            type="number"
                            min="1"
                            step="0.5"
                            value={displayMax}
                            onChange={(e) => handleCceInputChange(student.id, 'maxScore', e.target.value)}
                            className="w-16 rounded-lg border-slate-300 border p-2 text-sm font-bold text-center bg-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Max"
                          />
                          {activeMark && (
                            <button 
                              type="button" 
                              onClick={async () => {
                                if (window.confirm(`Delete ${selectedLevel} mark for ${student.name}?`)) {
                                  try {
                                    await deleteCCEMark(activeMark.id);
                                    setCceInputData(prev => {
                                      const next = { ...prev };
                                      delete next[student.id];
                                      return next;
                                    });
                                  } catch (error) {
                                    console.error(error);
                                    alert("Failed to delete CCE mark.");
                                  }
                                }
                              }}
                              className="text-rose-400 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete this mark"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Other Levels/Times Overview Columns */}
                      {allOtherColumnSlots.map(slot => {
                        const m = slots[slot.level][slot.time];
                        return (
                          <td key={`${slot.level}-${slot.time}`} className="px-2 py-3 text-center border-r border-slate-100 text-xs">
                            {m ? (
                              <span className={`font-black ${m.score === 'Ab' ? 'text-rose-600' : 'text-slate-800'}`}>
                                {m.score} <span className="text-slate-400 font-normal text-[10px]">/ {m.maxScore}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">-</span>
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

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <p className="text-sm font-bold text-slate-700">
                Saving marks for <span className="font-black text-blue-700">{selectedLevel}</span>
                {currentAvailableTimes.length > 1 && (
                  <span> &bull; Time {selectedTime}</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Existing entries will be updated without altering marks in other levels or times.
              </p>
            </div>

            <button 
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-200 flex items-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" /> Save CCE Marks
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-14 px-4 bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h4 className="text-base font-black text-slate-800 mb-1">Select Class Grade & Subject</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose a Class Grade and Subject above to begin viewing and entering CCE marks for students. Month selection is no longer required.
          </p>
        </div>
      )}
    </div>
  );
}
