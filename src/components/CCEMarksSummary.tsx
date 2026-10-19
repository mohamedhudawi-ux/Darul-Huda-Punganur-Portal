import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { CheckCircle2, AlertCircle, Filter, BookOpen, ChevronDown, ChevronUp, AlertTriangle, Clock, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CCEMarksSummaryProps {
  teacherId?: string;
  teacherName?: string;
  showOnlyTeacher?: boolean;
}

const STANDARD_CCE_LEVELS = ['CCE 1', 'CCE 2', 'CCE 3', 'CCE 4', 'Mid Term Exam'];

export function CCEMarksSummary({ teacherId, teacherName, showOnlyTeacher = false }: CCEMarksSummaryProps = {}) {
  const { users, cceMarks, subjects, currentUser } = useStore();
  const navigate = useNavigate();
  const [classFilter, setClassFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);

  // Determine which subjects and classes to show
  // User Requirement: "Only show the status that subjects which they upload"
  const teacherUploadedMarks = useMemo(() => {
    if (!showOnlyTeacher && !teacherId) return cceMarks || [];

    return (cceMarks || []).filter(mark => {
      if (teacherId && mark.teacherId === teacherId) return true;
      if (teacherName && mark.teacherName?.trim().toLowerCase() === teacherName.trim().toLowerCase()) return true;
      return false;
    });
  }, [cceMarks, showOnlyTeacher, teacherId, teacherName]);

  // Distinct (subject, classGrade, section) pairs uploaded by this teacher (or all if admin)
  const targetSubjectClasses = useMemo(() => {
    const map = new Map<string, { subject: string; classGrade: string; section: string; teacherName?: string }>();

    if (showOnlyTeacher) {
      // Find all distinct subjects and classes where this teacher uploaded marks
      teacherUploadedMarks.forEach(mark => {
        const student = students.find(s => s.id === mark.studentId);
        if (!student || !student.classGrade) return;

        const sec = student.section || 'All';
        const key = `${student.classGrade}__${sec}__${(mark.subject || '').trim()}`;
        if (!map.has(key)) {
          map.set(key, {
            subject: mark.subject,
            classGrade: student.classGrade,
            section: sec,
            teacherName: mark.teacherName || teacherName
          });
        }
      });
    } else {
      // Admin view: all subjects from marks or configured subjects
      (cceMarks || []).forEach(mark => {
        const student = students.find(s => s.id === mark.studentId);
        if (!student || !student.classGrade) return;

        const sec = student.section || 'All';
        const key = `${student.classGrade}__${sec}__${(mark.subject || '').trim()}`;
        if (!map.has(key)) {
          map.set(key, {
            subject: mark.subject,
            classGrade: student.classGrade,
            section: sec,
            teacherName: mark.teacherName
          });
        }
      });
    }

    return Array.from(map.values());
  }, [showOnlyTeacher, teacherUploadedMarks, cceMarks, students, teacherName]);

  // Build the complete status summary
  // User Requirement: "Show all the cce in cce status for teachers"
  // For each uploaded subject, generate entries for ALL CCE levels (CCE 1, CCE 2, CCE 3, CCE 4, Mid Term Exam)
  const summary = useMemo(() => {
    const list: Array<{
      key: string;
      classGrade: string;
      section: string;
      subject: string;
      cceLevel: string;
      description?: string;
      month?: string;
      teacherName?: string;
      totalStudents: number;
      marksUploaded: number;
      scoredCount: number;
      yellowCount: number; // Ab or 0
      incompleteCount: number; // blank / missing
      isCompleted: boolean;
      studentsStatus: Array<{
        studentId: string;
        studentName: string;
        admissionNumber?: string;
        score: number | 'Ab' | '';
        maxScore: number;
        isBlank: boolean;
        isAb: boolean;
        isZero: boolean;
        isScored: boolean;
      }>;
    }> = [];

    targetSubjectClasses.forEach(item => {
      // Find all students in this class/section
      const classStudents = students.filter(s => 
        s.classGrade === item.classGrade && 
        (item.section === 'All' ? true : (!s.section || s.section === item.section))
      );

      // Show all standard CCE levels for this subject
      STANDARD_CCE_LEVELS.forEach(level => {
        const rowKey = `${item.classGrade}-${item.section}-${item.subject}-${level}`;

        // Find existing marks for this subject & CCE level
        const marksForThisCCE = (cceMarks || []).filter(m => 
          m.subject === item.subject && 
          m.cceLevel === level
        );

        let commonDescription = '';
        let commonMonth = '';
        let commonTeacher = item.teacherName || '';
        let marksUploaded = 0;
        let scoredCount = 0;
        let yellowCount = 0;
        let incompleteCount = 0;

        const studentsStatus = classStudents.map(student => {
          const mark = marksForThisCCE.find(m => m.studentId === student.id);

          if (mark?.description && !commonDescription) {
            commonDescription = mark.description;
          }
          if (mark?.month && !commonMonth) {
            commonMonth = mark.month;
          }
          if (mark?.teacherName && !commonTeacher) {
            commonTeacher = mark.teacherName;
          }

          const isBlank = !mark || mark.score === '' || mark.score === null || mark.score === undefined;
          const isAb = !isBlank && mark.score === 'Ab';
          const isZero = !isBlank && !isAb && (mark.score === 0 || mark.score === '0');
          const isScored = !isBlank && !isAb && !isZero;

          if (isBlank) {
            incompleteCount += 1;
          } else {
            marksUploaded += 1;
            if (isAb || isZero) {
              yellowCount += 1;
            } else if (isScored) {
              scoredCount += 1;
            }
          }

          return {
            studentId: student.id,
            studentName: student.name,
            admissionNumber: student.admissionNumber,
            score: isBlank ? '' : mark.score,
            maxScore: mark?.maxScore || 25,
            isBlank,
            isAb,
            isZero,
            isScored
          };
        });

        const isCompleted = marksUploaded >= classStudents.length && classStudents.length > 0;

        list.push({
          key: rowKey,
          classGrade: item.classGrade,
          section: item.section,
          subject: item.subject,
          cceLevel: level,
          description: commonDescription,
          month: commonMonth || 'Term',
          teacherName: commonTeacher,
          totalStudents: classStudents.length,
          marksUploaded,
          scoredCount,
          yellowCount,
          incompleteCount,
          isCompleted,
          studentsStatus
        });
      });
    });

    return list.sort((a, b) => {
      if (a.classGrade !== b.classGrade) return a.classGrade.localeCompare(b.classGrade);
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return STANDARD_CCE_LEVELS.indexOf(a.cceLevel) - STANDARD_CCE_LEVELS.indexOf(b.cceLevel);
    });
  }, [targetSubjectClasses, students, cceMarks]);

  const filteredSummary = summary.filter(item => {
    const matchesClass = !classFilter || (item.classGrade || '').toLowerCase().includes(classFilter.toLowerCase());
    const matchesLevel = !levelFilter || (item.cceLevel || '').toLowerCase() === levelFilter.toLowerCase();
    return matchesClass && matchesLevel;
  });

  const classes = Array.from(new Set(students.filter(u => u.classGrade).map(u => u.classGrade))).sort();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header bar */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {showOnlyTeacher 
                ? (teacherName ? `CCE Status — Subjects Uploaded by ${teacherName}` : 'My CCE Submission Status') 
                : 'CCE Continuous Evaluation Status'}
            </h3>
            {showOnlyTeacher && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
                My Uploaded Subjects Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {showOnlyTeacher 
              ? 'Showing status of all CCE levels (CCE 1 to Mid Term) strictly for the subjects you upload. If marks are missing/blank, it shows as Incomplete CCE.' 
              : 'Summary of continuous evaluation marks across classes, subjects, and CCE levels.'}
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
              {STANDARD_CCE_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
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

      {/* Legend & Instructions */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Legend:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed (All scored)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Incomplete CCE (Blank / Missing)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-700" /> Yellow (Ab or 0)
          </span>
        </div>
        <span className="text-[11px] text-slate-500 italic">
          Click any row to view individual student marks
        </span>
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
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Breakdown / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSummary.length > 0 ? (
              filteredSummary.map((item) => {
                const isExpanded = expandedRow === item.key;

                return (
                  <React.Fragment key={item.key}>
                    <tr 
                      onClick={() => setExpandedRow(isExpanded ? null : item.key)}
                      className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-slate-900">Grade {item.classGrade}</span>
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase">{item.section}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-800">{item.subject}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-tighter">
                          {item.cceLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.description ? (
                          <span className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md max-w-xs truncate inline-block">
                            {item.description}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending portion</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {item.month || 'Term'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.isCompleted ? (
                          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              Completed {item.yellowCount > 0 ? `(${item.yellowCount} Ab/0)` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-800 bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              Incomplete CCE ({item.incompleteCount} missing)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-bold text-slate-500">
                            <span className={item.isCompleted ? 'text-emerald-700 font-black' : 'text-slate-900 font-black'}>{item.marksUploaded}</span> / {item.totalStudents}
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
                            title={isExpanded ? "Collapse student marks" : "View student marks"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDABLE STUDENT ROSTER BREAKDOWN */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-y border-slate-200">
                        <td colSpan={7} className="px-6 py-5">
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-600" />
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                  Student Evaluation Roster — Grade {item.classGrade} ({item.section}) • {item.subject} • {item.cceLevel}
                                </h4>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-emerald-700 font-bold">
                                  {item.scoredCount} Scored
                                </span>
                                {item.yellowCount > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-900 font-bold border border-yellow-300 text-[10px]">
                                    {item.yellowCount} Ab / 0 (Yellow)
                                  </span>
                                )}
                                {item.incompleteCount > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[10px]">
                                    {item.incompleteCount} Incomplete CCE
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.studentsStatus.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {item.studentsStatus.map(st => (
                                  <div 
                                    key={st.studentId}
                                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 truncate">{st.studentName}</p>
                                      {st.admissionNumber && (
                                        <p className="text-[10px] text-slate-400 font-mono">ID: {st.admissionNumber}</p>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                      {st.isBlank ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-black text-[10px] uppercase">
                                          <Clock className="w-3 h-3 text-amber-600" /> Incomplete CCE
                                        </span>
                                      ) : st.isAb ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-900 border border-yellow-300 font-black text-xs">
                                          <AlertTriangle className="w-3 h-3 text-yellow-700" /> Absent (Ab)
                                        </span>
                                      ) : st.isZero ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-900 border border-yellow-300 font-black text-xs">
                                          <AlertTriangle className="w-3 h-3 text-yellow-700" /> 0 / {st.maxScore}
                                        </span>
                                      ) : (
                                        <span className="text-sm font-black text-slate-900">
                                          <span className="text-emerald-700">{st.score}</span>
                                          <span className="text-slate-400 text-xs font-normal"> / {st.maxScore}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic py-2">No students enrolled in this class.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <BookOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 mb-1">
                        {showOnlyTeacher 
                          ? (teacherName ? `No CCE Marks Uploaded by ${teacherName} Yet` : 'No CCE Marks Uploaded by You Yet')
                          : 'No CCE Submissions Found'}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {showOnlyTeacher 
                          ? 'Once you enter marks under "CCE Marks Entry", all continuous assessment levels for your subjects will appear here with full status tracking.' 
                          : 'No CCE mark records matched your filter criteria.'}
                      </p>
                    </div>
                    {showOnlyTeacher && (
                      <button
                        onClick={() => navigate('/teacher?tab=cce')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs"
                      >
                        <BookOpen className="w-4 h-4 text-white" />
                        Enter CCE Marks Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
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
