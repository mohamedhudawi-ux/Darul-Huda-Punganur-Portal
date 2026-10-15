import React, { useState, useMemo } from 'react';
import { useStore } from '../../lib/store';
import { 
  BookOpen, Search, Filter, CheckCircle2, AlertTriangle, Eye, 
  Download, Printer, X, Calendar, GraduationCap, Award, BarChart3, 
  Layers, Users, Check, PenLine
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { CCEMark, User } from '../../types';

interface GroupedCCE {
  key: string;
  classGrade: string;
  section: string;
  subject: string;
  cceLevel: string;
  date: string;
  description: string;
  maxScore: number;
  totalClassStudents: number;
  assessedCount: number;
  absentCount: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  studentRecords: {
    student: User;
    mark: CCEMark;
  }[];
}

export function ClassCCEInspector() {
  const navigate = useNavigate();
  const { users, cceMarks, subjects } = useStore();

  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewingMarksSheet, setViewingMarksSheet] = useState<GroupedCCE | null>(null);

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);

  // Extract all available class grades from students
  const availableGrades = useMemo(() => {
    const grades = Array.from(new Set(students.map(s => s.classGrade).filter(Boolean))) as string[];
    return grades.sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [students]);

  // Extract all available sections for the selected grade
  const availableSections = useMemo(() => {
    const classStudents = selectedGrade 
      ? students.filter(s => s.classGrade === selectedGrade)
      : students;
    return Array.from(new Set(classStudents.map(s => s.section).filter(Boolean))).sort() as string[];
  }, [students, selectedGrade]);

  // Extract all unique subjects
  const allSubjectNames = useMemo(() => {
    const fromSubjects = (subjects || []).map(s => s.name);
    const fromMarks = (cceMarks || []).map(m => m.subject);
    return Array.from(new Set([...fromSubjects, ...fromMarks].filter(Boolean))).sort();
  }, [subjects, cceMarks]);

  // Group all CCE records by (classGrade, section, subject, cceLevel)
  const groupedCCEs = useMemo(() => {
    const groups: Record<string, GroupedCCE> = {};

    cceMarks.forEach(mark => {
      const student = students.find(s => s.id === mark.studentId);
      if (!student || !student.classGrade) return;

      const classGrade = student.classGrade;
      const section = student.section || 'All';
      const key = `${classGrade}-${section}-${mark.subject}-${mark.cceLevel}`;

      if (!groups[key]) {
        const classStudents = students.filter(s => 
          s.classGrade === classGrade && (section === 'All' || s.section === section)
        );

        groups[key] = {
          key,
          classGrade,
          section,
          subject: mark.subject,
          cceLevel: mark.cceLevel,
          date: mark.date,
          description: mark.description || '',
          maxScore: mark.maxScore || 25,
          totalClassStudents: classStudents.length,
          assessedCount: 0,
          absentCount: 0,
          averageScore: 0,
          averagePercentage: 0,
          highestScore: 0,
          lowestScore: mark.maxScore || 25,
          studentRecords: [],
        };
      }

      if (mark.description && !groups[key].description) {
        groups[key].description = mark.description;
      }
      if (new Date(mark.date) > new Date(groups[key].date)) {
        groups[key].date = mark.date;
      }

      groups[key].studentRecords.push({ student, mark });

      if (mark.score === 'Ab') {
        groups[key].absentCount += 1;
      } else if (typeof mark.score === 'number') {
        groups[key].assessedCount += 1;
        groups[key].highestScore = Math.max(groups[key].highestScore, mark.score);
        groups[key].lowestScore = Math.min(groups[key].lowestScore, mark.score);
      }
    });

    // Compute averages for each group
    Object.values(groups).forEach(g => {
      const validScores = g.studentRecords
        .filter(r => typeof r.mark.score === 'number')
        .map(r => r.mark.score as number);

      if (validScores.length > 0) {
        const sum = validScores.reduce((acc, score) => acc + score, 0);
        g.averageScore = parseFloat((sum / validScores.length).toFixed(1));
        g.averagePercentage = g.maxScore > 0 ? Math.round((g.averageScore / g.maxScore) * 100) : 0;
      } else {
        g.lowestScore = 0;
      }
    });

    return Object.values(groups).sort((a, b) => {
      if (a.classGrade !== b.classGrade) {
        const numA = parseInt(a.classGrade, 10);
        const numB = parseInt(b.classGrade, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.classGrade.localeCompare(b.classGrade);
      }
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return a.cceLevel.localeCompare(b.cceLevel);
    });
  }, [cceMarks, students]);

  // Filter groups according to current selections
  const filteredCCEs = useMemo(() => {
    return groupedCCEs.filter(g => {
      if (selectedGrade && g.classGrade !== selectedGrade) return false;
      if (selectedSection && g.section !== selectedSection) return false;
      if (selectedSubject && g.subject.toLowerCase() !== selectedSubject.toLowerCase()) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSubj = g.subject.toLowerCase().includes(query);
        const matchesLevel = g.cceLevel.toLowerCase().includes(query);
        const matchesDesc = (g.description || '').toLowerCase().includes(query);
        const matchesClass = `grade ${g.classGrade}`.toLowerCase().includes(query) || `class ${g.classGrade}`.toLowerCase().includes(query);
        if (!matchesSubj && !matchesLevel && !matchesDesc && !matchesClass) return false;
      }
      return true;
    });
  }, [groupedCCEs, selectedGrade, selectedSection, selectedSubject, searchQuery]);

  // Overall metrics across filtered CCEs
  const totalAssessmentsHeld = filteredCCEs.length;
  const totalClassesCount = new Set(filteredCCEs.map(g => `${g.classGrade}-${g.section}`)).size;
  const totalSubjectsCount = new Set(filteredCCEs.map(g => g.subject)).size;
  const totalAbsentCount = filteredCCEs.reduce((sum, g) => sum + g.absentCount, 0);

  // Export marks sheet for viewing CCE to Excel
  const handleExportMarksSheet = (group: GroupedCCE) => {
    const data = group.studentRecords.map(r => ({
      'Roll / Admission ID': r.student.admissionNumber || 'N/A',
      'Student Full Name': r.student.name || 'N/A',
      'Class Grade': group.classGrade,
      'Section': group.section,
      'Subject': group.subject,
      'Assessment Name': group.cceLevel,
      'CCE Topic / Portion': group.description || 'N/A',
      'Score': r.mark.score,
      'Max Score': r.mark.maxScore,
      'Percentage': typeof r.mark.score === 'number' && r.mark.maxScore > 0 
        ? `${Math.round((r.mark.score / r.mark.maxScore) * 100)}%` 
        : '0%',
      'Status': r.mark.score === 'Ab' ? 'Absent' : 'Attended',
      'Evaluation Date': r.mark.date ? new Date(r.mark.date).toLocaleDateString() : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CCE Marks Sheet');
    const filename = `CCE_${group.classGrade}_${group.section}_${group.subject}_${group.cceLevel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" /> Administrative Academic Inspector
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold">
                Campus-wide Audit
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              CCE Evaluations Held Across Every Subject & Class
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1 max-w-2xl">
              Inspect all continuous comprehensive evaluations, mid terms, syllabus portions assigned by teachers, participation rates, and marks sheets for every class.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Held</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalAssessmentsHeld}</p>
              <p className="text-[10px] text-indigo-300 font-semibold mt-0.5">CCE Sessions</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Classes</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalClassesCount}</p>
              <p className="text-[10px] text-indigo-300 font-semibold mt-0.5">Active Cohorts</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subjects</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalSubjectsCount}</p>
              <p className="text-[10px] text-indigo-300 font-semibold mt-0.5">Curriculum Units</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Absences</p>
              <p className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5">{totalAbsentCount}</p>
              <p className="text-[10px] text-rose-300/80 font-semibold mt-0.5">Recorded (Ab)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          {/* Class Grade Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Class Grade
            </label>
            <select
              value={selectedGrade}
              onChange={e => {
                setSelectedGrade(e.target.value);
                setSelectedSection('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Classes</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>Class / Grade {g}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sections</option>
              {availableSections.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Subjects</option>
              {allSubjectNames.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search topic, CCE or portion..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table of Held CCEs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              CCE Assessment Records Matrix ({filteredCCEs.length} Held)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Detailed log of evaluations, assigned topics/portions, participation counts, and average scores.
            </p>
          </div>

          {(selectedGrade || selectedSubject || selectedSection || searchQuery) && (
            <button
              onClick={() => {
                setSelectedGrade('');
                setSelectedSection('');
                setSelectedSubject('');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear All Filters
            </button>
          )}
        </div>

        {filteredCCEs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-black text-[10px]">
                  <th className="px-5 py-3.5">Class & Section</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-4 py-3.5">CCE / Assessment</th>
                  <th className="px-5 py-3.5">What CCE Was Given (Topic / Portion)</th>
                  <th className="px-4 py-3.5 text-center">Participation</th>
                  <th className="px-4 py-3.5 text-center">Class Average</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCCEs.map(group => {
                  return (
                    <tr key={group.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">Class {group.classGrade}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-extrabold text-[10px]">
                            {group.section}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {group.totalClassStudents} Total Enrolled
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 text-sm">{group.subject}</span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 font-black text-[11px] uppercase tracking-wide">
                          {group.cceLevel}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          Max: <strong className="text-slate-700">{group.maxScore}</strong> marks
                        </p>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        {group.description ? (
                          <div className="flex items-start gap-1.5">
                            <PenLine className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="font-semibold text-slate-800 leading-snug line-clamp-2">
                              {group.description}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No portion description specified</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center gap-1 text-slate-800 font-black text-xs">
                            <span className="text-emerald-700">{group.assessedCount} Scored</span>
                            {group.absentCount > 0 && (
                              <span className="text-rose-600">· {group.absentCount} Ab</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            of {group.studentRecords.length} records
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-black text-slate-900 text-sm">
                            {group.averageScore} <span className="text-slate-400 font-normal text-xs">/ {group.maxScore}</span>
                          </span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded mt-0.5 ${
                            group.averagePercentage >= 75 ? 'bg-emerald-50 text-emerald-700' :
                            group.averagePercentage >= 50 ? 'bg-blue-50 text-blue-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {group.averagePercentage}% Avg
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setViewingMarksSheet(group)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto shadow-xs active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Marks</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-50/50">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No CCE evaluations found matching your filters</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your Class, Subject, or Search filter above to see other evaluations held.
            </p>
          </div>
        )}
      </div>

      {/* DETAILED MARKS SHEET MODAL */}
      {viewingMarksSheet && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[10px] font-black uppercase">
                    Class {viewingMarksSheet.classGrade} - {viewingMarksSheet.section}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-black uppercase">
                    {viewingMarksSheet.subject}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-black uppercase">
                    {viewingMarksSheet.cceLevel}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">
                  CCE Marks Sheet: {viewingMarksSheet.subject} ({viewingMarksSheet.cceLevel})
                </h3>
                {viewingMarksSheet.description && (
                  <p className="text-xs text-indigo-200 mt-1 flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                    <span>Portion: <strong>{viewingMarksSheet.description}</strong></span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportMarksSheet(viewingMarksSheet)}
                  className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                  title="Export to Excel"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Export Excel</span>
                </button>
                <button
                  onClick={() => setViewingMarksSheet(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Quick Stats Bar in Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-50 border-b border-slate-200 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-black uppercase text-slate-400">Class Average</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {viewingMarksSheet.averageScore} / {viewingMarksSheet.maxScore}
                </p>
                <p className="text-[10px] font-bold text-indigo-600">{viewingMarksSheet.averagePercentage}%</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-black uppercase text-slate-400">Highest Mark</p>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {viewingMarksSheet.highestScore} / {viewingMarksSheet.maxScore}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-black uppercase text-slate-400">Lowest Mark</p>
                <p className="text-lg font-black text-amber-700 mt-0.5">
                  {viewingMarksSheet.lowestScore} / {viewingMarksSheet.maxScore}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-black uppercase text-slate-400">Absentees</p>
                <p className="text-lg font-black text-rose-600 mt-0.5">
                  {viewingMarksSheet.absentCount} Student(s)
                </p>
              </div>
            </div>

            {/* Student Marks Table */}
            <div className="max-h-[500px] overflow-y-auto p-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-black text-[10px]">
                    <th className="px-4 py-3">Admission ID</th>
                    <th className="px-4 py-3">Student Full Name</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Score / Max</th>
                    <th className="px-4 py-3 text-right">Percentage</th>
                    <th className="px-4 py-3 text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingMarksSheet.studentRecords.map(({ student, mark }) => {
                    const isAb = mark.score === 'Ab';
                    const pct = !isAb && typeof mark.score === 'number' && mark.maxScore > 0 
                      ? Math.round((mark.score / mark.maxScore) * 100) 
                      : 0;

                    return (
                      <tr key={mark.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-600">
                          {student.admissionNumber || 'N/A'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-black text-slate-900 text-sm">{student.name}</span>
                          <span className="ml-2 text-[10px] text-slate-400 font-semibold">
                            Sec {student.section || 'A'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isAb ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[10px] uppercase">
                              <AlertTriangle className="w-3 h-3 text-rose-500" /> Absent (Ab)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px] uppercase">
                              <Check className="w-3 h-3 text-emerald-600" /> Scored
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isAb ? (
                            <span className="font-black text-rose-600 text-sm">Ab</span>
                          ) : (
                            <span className="font-black text-slate-900 text-sm">
                              {mark.score} <span className="text-slate-400 font-normal text-xs">/ {mark.maxScore}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isAb ? (
                            <span className="text-rose-500 font-bold text-xs">0%</span>
                          ) : (
                            <span className={`font-black text-xs ${
                              pct >= 75 ? 'text-emerald-700' : pct >= 50 ? 'text-blue-700' : 'text-amber-700'
                            }`}>
                              {pct}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/report/${student.id}?download=true`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-black transition-colors"
                              title="Download or Print Report Card"
                            >
                              <Download className="w-3 h-3" /> Download Card
                            </button>
                            <button
                              onClick={() => navigate(`/report/${student.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-[11px] font-bold transition-colors"
                              title="View Report Card Preview"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingMarksSheet(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
