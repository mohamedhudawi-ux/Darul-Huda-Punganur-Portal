import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../lib/store';
import { 
  FileSpreadsheet, Trash2, Plus, Check, Layers, AlertCircle, 
  Sparkles, FileText, Info, HelpCircle, PenLine, X, AlertTriangle, 
  RotateCcw, BookOpen, Clock, CheckCircle2
} from 'lucide-react';
import { CCEMark } from '../types';

export const ALLOWED_CCE_LEVELS = ['CCE 1', 'CCE 2', 'CCE 3', 'CCE 4', 'Mid Term Exam'] as const;
export type AllowedCCELevel = typeof ALLOWED_CCE_LEVELS[number];

export function isMatchingCCELevel(cceLevel: string | undefined, target: string) {
  if (!cceLevel) return false;
  const a = cceLevel.trim().toLowerCase().replace(/[-_]/g, ' ');
  const b = target.trim().toLowerCase().replace(/[-_]/g, ' ');
  if (a === b) return true;
  if ((a.includes('mid term') || a.includes('midterm')) && (b.includes('mid term') || b.includes('midterm'))) return true;
  return false;
}

export function CCEMarksManager() {
  const { currentUser, users, subjects, cceMarks, addCCEMarks, deleteCCEMark } = useStore();
  
  // Selection filters
  const [cceClassFilters, setCceClassFilters] = useState({ 
    classGrade: '', 
    section: '', 
    subject: '' 
  });

  // Active selected assessment name (strictly CCE 1, CCE 2, CCE 3, CCE 4, or Mid Term Exam)
  const [selectedAssessment, setSelectedAssessment] = useState<string>('CCE 1');

  // Modal / dialog state for "+ Add Assessment"
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssessmentName, setNewAssessmentName] = useState<string>('CCE 1');
  const [newAssessmentMaxScore, setNewAssessmentMaxScore] = useState('25');
  const [newAssessmentPortion, setNewAssessmentPortion] = useState('');

  // Quick batch fill helper for max score
  const [quickMaxScore, setQuickMaxScore] = useState<string>('25');

  // Assessment Description / Topic Box: Mention what CCE was given so absent students see on their portal
  const [cceDescription, setCceDescription] = useState<string>('');

  // Input state for current table: studentId -> { score, maxScore, notes }
  const [cceInputData, setCceInputData] = useState<Record<string, { score: string; maxScore: string; notes?: string }>>({});

  // Feedback message
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Filter students by selected class grade and section
  const filteredCceStudents = useMemo(() => {
    return users.filter(u => 
      u.role === 'student' && 
      u.classGrade === cceClassFilters.classGrade && 
      (cceClassFilters.section ? u.section === cceClassFilters.section : true)
    ).sort((a, b) => {
      const numA = parseInt(a.admissionNumber || '0', 10);
      const numB = parseInt(b.admissionNumber || '0', 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [users, cceClassFilters.classGrade, cceClassFilters.section]);

  // Assessment levels: strictly CCE 1, CCE 2, CCE 3, CCE 4, and Mid Term Exam as requested
  const availableAssessments = useMemo(() => {
    return [...ALLOWED_CCE_LEVELS];
  }, []);

  // Ensure selected assessment is always valid
  useEffect(() => {
    if (availableAssessments.length > 0 && !availableAssessments.includes(selectedAssessment as any)) {
      setSelectedAssessment(availableAssessments[0]);
    }
  }, [availableAssessments, selectedAssessment]);

  // Pre-fill cceDescription when assessment, subject or class changes
  useEffect(() => {
    if (!cceClassFilters.subject || !selectedAssessment) {
      setCceDescription('');
      return;
    }

    const studentIds = new Set(filteredCceStudents.map(s => s.id));
    const existingMark = (cceMarks || []).find(m => 
      studentIds.has(m.studentId) && 
      m.subject.toLowerCase() === cceClassFilters.subject.toLowerCase() &&
      m.cceLevel.toLowerCase() === selectedAssessment.toLowerCase() &&
      m.description
    );

    if (existingMark?.description) {
      setCceDescription(existingMark.description);
    } else {
      setCceDescription('');
    }
    setSaveSuccessMessage(null);
  }, [cceClassFilters.subject, selectedAssessment, filteredCceStudents, cceMarks]);

  // Handle student input change
  const handleCceInputChange = (studentId: string, field: 'score' | 'maxScore', value: string) => {
    setCceInputData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: field === 'score' ? value : (prev[studentId]?.score ?? ''),
        maxScore: field === 'maxScore' ? value : (prev[studentId]?.maxScore ?? quickMaxScore),
      }
    }));
    setSaveSuccessMessage(null);
  };

  // Toggle absent ('Ab') for a specific student
  const handleToggleAbsent = (studentId: string, currentMark?: CCEMark) => {
    const currentInput = cceInputData[studentId];
    const currentVal = currentInput?.score !== undefined 
      ? currentInput.score 
      : (currentMark ? String(currentMark.score) : '');

    const nextScore = currentVal === 'Ab' ? '' : 'Ab';

    setCceInputData(prev => ({
      ...prev,
      [studentId]: {
        score: nextScore,
        maxScore: prev[studentId]?.maxScore ?? (currentMark ? String(currentMark.maxScore) : quickMaxScore),
      }
    }));
    setSaveSuccessMessage(null);
  };

  // Apply quick max score to all students in table
  const applyQuickMaxScoreToAll = () => {
    if (!quickMaxScore || isNaN(Number(quickMaxScore))) {
      alert('Please enter a valid max score number.');
      return;
    }
    const nextInputs: Record<string, { score: string; maxScore: string }> = { ...cceInputData };
    filteredCceStudents.forEach(st => {
      const existing = (cceMarks || []).find(m => 
        m.studentId === st.id && 
        m.subject.toLowerCase() === cceClassFilters.subject.toLowerCase() &&
        m.cceLevel.toLowerCase() === selectedAssessment.toLowerCase()
      );

      nextInputs[st.id] = {
        score: nextInputs[st.id]?.score ?? (existing ? String(existing.score) : ''),
        maxScore: quickMaxScore,
      };
    });
    setCceInputData(nextInputs);
    setSaveSuccessMessage(null);
  };

  // Quick fill default score for all
  const handleFillAllScores = (scoreValue: string) => {
    const nextInputs: Record<string, { score: string; maxScore: string }> = { ...cceInputData };
    filteredCceStudents.forEach(st => {
      const existing = (cceMarks || []).find(m => 
        m.studentId === st.id && 
        m.subject.toLowerCase() === cceClassFilters.subject.toLowerCase() &&
        m.cceLevel.toLowerCase() === selectedAssessment.toLowerCase()
      );

      nextInputs[st.id] = {
        score: scoreValue,
        maxScore: nextInputs[st.id]?.maxScore ?? (existing ? String(existing.maxScore) : quickMaxScore),
      };
    });
    setCceInputData(nextInputs);
  };

  // Create & add new assessment (strictly CCE 1, CCE 2, CCE 3, CCE 4, or Mid Term Exam)
  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAssessmentName.trim();
    if (!cleanName || !ALLOWED_CCE_LEVELS.includes(cleanName as any)) {
      alert('Please select one of the allowed assessment types: CCE 1, CCE 2, CCE 3, CCE 4, or Mid Term Exam.');
      return;
    }

    setSelectedAssessment(cleanName);
    if (newAssessmentPortion.trim()) {
      setCceDescription(newAssessmentPortion.trim());
    }
    if (newAssessmentMaxScore.trim() && !isNaN(Number(newAssessmentMaxScore))) {
      setQuickMaxScore(newAssessmentMaxScore.trim());
    }

    setIsAddModalOpen(false);
    setNewAssessmentPortion('');
    setCceInputData({});
  };

  // Submit and save marks to Firestore
  const handleCceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cceClassFilters.classGrade || !cceClassFilters.subject) {
      alert("Please select Class Grade and Subject first.");
      return;
    }

    const marksToSubmit: (Omit<CCEMark, 'id'> & { existingId?: string })[] = [];
    const finalDescription = cceDescription.trim();

    for (const student of filteredCceStudents) {
      const inputs = cceInputData[student.id];
      const existingMark = (cceMarks || []).find(m => 
        m.studentId === student.id && 
        m.subject.toLowerCase() === cceClassFilters.subject.toLowerCase() &&
        m.cceLevel.toLowerCase() === selectedAssessment.toLowerCase()
      );

      const scoreVal = inputs?.score !== undefined 
        ? inputs.score 
        : (existingMark ? String(existingMark.score) : '');

      const maxVal = inputs?.maxScore !== undefined 
        ? inputs.maxScore 
        : (existingMark ? String(existingMark.maxScore) : quickMaxScore);

      if (scoreVal !== '' && maxVal !== '') {
        marksToSubmit.push({
          studentId: student.id,
          subject: cceClassFilters.subject,
          cceLevel: selectedAssessment,
          description: finalDescription,
          month: existingMark?.month || '',
          date: new Date().toISOString(),
          score: scoreVal === 'Ab' ? 'Ab' : Number(scoreVal),
          maxScore: Number(maxVal),
          existingId: existingMark?.id,
          teacherId: currentUser?.id,
          teacherName: currentUser?.name,
        });
      }
    }

    if (marksToSubmit.length > 0) {
      try {
        await addCCEMarks(marksToSubmit);
        setSaveSuccessMessage(`Successfully saved ${marksToSubmit.length} marks for "${selectedAssessment}"!`);
        setCceInputData({});
      } catch (error) {
        console.error(error);
        alert("Failed to save CCE marks. Please check connection.");
      }
    } else {
      alert("No marks were entered. Please enter student scores before saving.");
    }
  };

  // Delete all marks for this assessment level
  const handleDeleteAssessment = async () => {
    const studentIds = new Set(filteredCceStudents.map(s => s.id));
    const matchingMarks = (cceMarks || []).filter(m => 
      studentIds.has(m.studentId) && 
      m.subject.toLowerCase() === cceClassFilters.subject.toLowerCase() &&
      m.cceLevel.toLowerCase() === selectedAssessment.toLowerCase()
    );

    if (matchingMarks.length === 0) {
      setCceInputData({});
      return;
    }

    if (confirm(`Are you sure you want to delete all marks for "${selectedAssessment}" in ${cceClassFilters.subject}? This will remove ${matchingMarks.length} student scores.`)) {
      try {
        for (const m of matchingMarks) {
          await deleteCCEMark(m.id);
        }
        setCceInputData({});
        alert(`Successfully deleted marks for "${selectedAssessment}".`);
      } catch (err) {
        console.error(err);
        alert("Failed to delete assessment.");
      }
    }
  };

  // Preset assessment names: strictly CCE 1, CCE 2, CCE 3, CCE 4, Mid Term Exam
  const presetAssessmentNames = [...ALLOWED_CCE_LEVELS];

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Continuous Evaluation & Marks Manager
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Record marks for CCE 1, CCE 2, CCE 3, CCE 4, or Mid Term Exam with tested syllabus portions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewAssessmentName('CCE 1');
            setNewAssessmentPortion('');
            setIsAddModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 flex items-center gap-2 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add CCE / Mid Term</span>
        </button>
      </div>
      
      {/* Primary Selection Controls (Class, Section, Subject) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div>
          <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Class Grade</label>
          <select 
            value={cceClassFilters.classGrade}
            onChange={e => {
              setCceClassFilters(p => ({ ...p, classGrade: e.target.value, subject: '' }));
              setCceInputData({});
            }}
            className="w-full rounded-xl border-slate-300 border p-2.5 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">Select Class Grade</option>
            {(Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade as string))) as string[]).sort((a, b) => {
              const numA = parseInt(a || '0', 10);
              const numB = parseInt(b || '0', 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return (a || '').localeCompare(b || '');
            }).map(grade => (
              <option key={grade} value={grade}>Class / Grade {grade}</option>
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
            className="w-full rounded-xl border-slate-300 border p-2.5 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Sections</option>
            {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade === cceClassFilters.classGrade && u.section).map(u => u.section))).sort().map(sec => (
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
            className="w-full rounded-xl border-slate-300 border p-2.5 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

      {/* DYNAMIC ASSESSMENT TABS WITH "+ ADD ASSESSMENT" BUTTON */}
      {cceClassFilters.classGrade && cceClassFilters.subject ? (
        <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-blue-50/70 p-4 sm:p-5 rounded-2xl border border-indigo-100 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Assessments for {cceClassFilters.subject} (Class {cceClassFilters.classGrade}):
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewAssessmentName('');
                setNewAssessmentPortion('');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add CCE / Mid Term</span>
            </button>
          </div>

          {/* Assessment Pills List */}
          <div className="flex flex-wrap items-center gap-2">
            {availableAssessments.map(name => {
              const isSelected = selectedAssessment === name;
              const hasMarksRecorded = (cceMarks || []).some(m => 
                m.subject.toLowerCase() === cceClassFilters.subject.toLowerCase() &&
                m.cceLevel.toLowerCase() === name.toLowerCase() &&
                filteredCceStudents.some(s => s.id === m.studentId)
              );

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setSelectedAssessment(name);
                    setCceInputData({});
                  }}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' 
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{name}</span>
                  {hasMarksRecorded && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`} title="Marks recorded" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 mb-6">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600">Please select Class Grade and Subject to view and enter CCE marks.</p>
        </div>
      )}

      {/* Main Student Entry Table */}
      {filteredCceStudents.length > 0 && cceClassFilters.subject ? (
        <form onSubmit={handleCceSubmit}>
          {/* Assessment Topic / Portion Box: Teacher mentions what CCE was given */}
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 p-4 rounded-2xl border border-blue-200/80 mb-5 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    CCE Topic / Portion Mention Box ({selectedAssessment})
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Mention what test portion or assignment was given so absent students can see on their portal what was tested.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg">
                  Visible to Students
                </span>
                <button
                  type="button"
                  onClick={handleDeleteAssessment}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 p-1 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete this assessment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Assessment</span>
                </button>
              </div>
            </div>

            <input
              type="text"
              value={cceDescription}
              onChange={(e) => setCceDescription(e.target.value)}
              placeholder={`E.g. Unit 3: Trigonometry & Circle Theorems, or Notebook assignment ch 4`}
              className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Quick Toolbar: Max Score & Presets */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>{filteredCceStudents.length} Students in Roster</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400 pl-2">Max Marks:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={quickMaxScore}
                  onChange={(e) => setQuickMaxScore(e.target.value)}
                  className="w-14 px-2 py-1 text-xs font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-lg text-center"
                />
                <button
                  type="button"
                  onClick={applyQuickMaxScoreToAll}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg transition-colors"
                >
                  Apply to All
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleFillAllScores(quickMaxScore)}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-xl transition-colors border border-emerald-200/60"
              >
                Set All Max Score
              </button>

              <button
                type="button"
                onClick={() => setCceInputData({})}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 font-bold text-[11px]"
              >
                Clear Inputs
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {saveSuccessMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMessage}</span>
              </div>
              <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Table of Students */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-black text-[10px]">
                  <th className="px-4 py-3">Roll / ID</th>
                  <th className="px-4 py-3">Student Full Name</th>
                  <th className="px-4 py-3 text-center">Score ({selectedAssessment})</th>
                  <th className="px-4 py-3 text-center">Absent?</th>
                  <th className="px-4 py-3 text-center">Max Marks</th>
                  <th className="px-4 py-3 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCceStudents.map(student => {
                  const existingMark = (cceMarks || []).find(m => 
                    m.studentId === student.id && 
                    m.subject.toLowerCase() === cceClassFilters.subject.toLowerCase() &&
                    m.cceLevel.toLowerCase() === selectedAssessment.toLowerCase()
                  );

                  const inputs = cceInputData[student.id];
                  const currentScore = inputs?.score !== undefined 
                    ? inputs.score 
                    : (existingMark ? String(existingMark.score) : '');

                  const currentMax = inputs?.maxScore !== undefined 
                    ? inputs.maxScore 
                    : (existingMark ? String(existingMark.maxScore) : quickMaxScore);

                  const isAbsent = currentScore === 'Ab';
                  const numericScore = typeof currentScore === 'string' && !isNaN(Number(currentScore)) && currentScore !== ''
                    ? Number(currentScore)
                    : null;
                  const numericMax = Number(currentMax) || 25;
                  const percentage = numericScore !== null && numericMax > 0
                    ? Math.round((numericScore / numericMax) * 100)
                    : null;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">
                        {student.admissionNumber || 'N/A'}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-black text-slate-900 text-sm">{student.name}</span>
                        {student.section && (
                          <span className="ml-2 text-[10px] text-slate-400 font-semibold">
                            Sec {student.section}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          value={currentScore}
                          onChange={(e) => handleCceInputChange(student.id, 'score', e.target.value)}
                          placeholder="Score or Ab"
                          className={`w-24 text-center font-black rounded-xl p-2 text-xs border transition-all ${
                            isAbsent
                              ? 'bg-rose-50 text-rose-700 border-rose-300 font-black'
                              : 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          }`}
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAbsent(student.id, existingMark)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                            isAbsent
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isAbsent ? 'Absent (Ab)' : 'Mark Ab'}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={currentMax}
                          onChange={(e) => handleCceInputChange(student.id, 'maxScore', e.target.value)}
                          className="w-16 text-center font-bold text-slate-700 bg-white border border-slate-300 rounded-xl p-2 text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isAbsent ? (
                          <span className="text-rose-600 font-black text-xs">Absent</span>
                        ) : percentage !== null ? (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                              <div 
                                className={`h-full rounded-full ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="font-black text-slate-800 text-xs">{percentage}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sticky Save Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-xl">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-300">
                Ready to Commit Scores
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Saving will record marks for <strong>{selectedAssessment}</strong> in <strong>{cceClassFilters.subject}</strong>.
              </p>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Marks for {selectedAssessment}</span>
            </button>
          </div>
        </form>
      ) : null}

      {/* MODAL: ADD ANY TYPE OF CCE OR MID TERM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add CCE / Mid Term Exam</h3>
                  <p className="text-xs text-slate-500">Configure evaluation: CCE 1, CCE 2, CCE 3, CCE 4, or Mid Term Exam</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4">
              {/* Allowed Levels Selector */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Select Evaluation Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presetAssessmentNames.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewAssessmentName(preset)}
                      className={`p-3 rounded-2xl text-xs font-black transition-all border text-center flex items-center justify-center gap-1.5 ${
                        newAssessmentName === preset
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 ring-2 ring-indigo-600 ring-offset-1'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assessment Level Dropdown Confirmation */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Selected Assessment
                </label>
                <select
                  value={newAssessmentName}
                  onChange={(e) => setNewAssessmentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ALLOWED_CCE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Default Max Score */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Default Maximum Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={newAssessmentMaxScore}
                  onChange={(e) => setNewAssessmentMaxScore(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Portion / What CCE was given */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  CCE Portion / Topics Tested (Optional)
                </label>
                <input
                  type="text"
                  value={newAssessmentPortion}
                  onChange={(e) => setNewAssessmentPortion(e.target.value)}
                  placeholder="E.g. Chapters 1 & 2, or Term 1 Syllabus"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Absent students will see this description on their portal so they know what was conducted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 active:scale-95"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
