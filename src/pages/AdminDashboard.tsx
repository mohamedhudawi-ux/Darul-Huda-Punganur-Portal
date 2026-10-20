import React, { useState, useEffect } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { Upload, Plus, Trash2, Edit2, Check, X, FileSpreadsheet, Users, UserPlus, Eye, EyeOff, FileText, Settings as SettingsIcon, Printer, Cloud, RefreshCw, Search, BookOpen, HelpCircle, History, Sparkles, TrendingUp, ShieldCheck, CheckCircle2, GraduationCap, CheckSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CCEMarksManager } from '../components/CCEMarksManager';
import { CCEMarksSummary } from '../components/CCEMarksSummary';
import { SkillClubManager } from '../components/SkillClubManager';
import { TaskTemplateManager } from '../components/TaskTemplateManager';
import { TeacherTaskVerifier } from '../components/TeacherTaskVerifier';
import { CampusConfig } from '../components/admin/CampusConfig';
import { User } from '../types';
import { matchesMonth } from '../lib/utils';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminDashboard() {
  const { currentUser, questions, addQuestion, deleteQuestion, toggleQuestion, updateQuestion, users, addUser, addUsers, updateUser, deleteUsers, impersonate, settings, updateSettings, subjects, addSubject, addSubjects, deleteSubject, deleteSubjects, assessments, cceMarks, taskTemplates, studentTasks, assessmentLogs, loading, forceCloudRefresh } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const tabParam = searchParams.get('tab') as 'overview' | 'assessments' | 'users' | 'cce' | 'reports' | 'activities' | 'settings' | 'help' | 'logs' | 'mentors' | null;
  const activeTab = tabParam || 'overview';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [cceClassFilters, setCceClassFilters] = useState({ classGrade: '', section: '', subject: '', cceLevel: '' });
  const [reportType, setReportType] = useState<'all' | 'cce' | string>('all');

  // Mentorship assignment state
  const [assignMentorId, setAssignMentorId] = useState('');
  const [assignClassGrade, setAssignClassGrade] = useState('');
  const [assignSection, setAssignSection] = useState('');
  const [selectedMenteeIds, setSelectedMenteeIds] = useState<Set<string>>(new Set());
  const [expandedMentorId, setExpandedMentorId] = useState<string | null>(null);

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState<string>('');
  const [newQuestionField, setNewQuestionField] = useState('');
  const [newFieldText, setNewFieldText] = useState('');
  const [newFieldCategory, setNewFieldCategory] = useState<string>('');
  const [newCategoryText, setNewCategoryText] = useState('');

  useEffect(() => {
    if (settings.assessmentCategories && settings.assessmentCategories.length > 0) {
      if (!newQuestionCategory) setNewQuestionCategory(settings.assessmentCategories[0]);
      if (!newFieldCategory) setNewFieldCategory(settings.assessmentCategories[0]);
    }
  }, [settings.assessmentCategories, newQuestionCategory, newFieldCategory]);
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectGrade, setNewSubjectGrade] = useState('');
  const [newSubjectSection, setNewSubjectSection] = useState('');
  
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // User form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password123');
  const [newUserRole, setNewUserRole] = useState<'teacher' | 'student'>('student');
  const [newUserAdmission, setNewUserAdmission] = useState('');
  const [newUserClassGrade, setNewUserClassGrade] = useState('');
  const [newUserSection, setNewUserSection] = useState('');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [editAdmission, setEditAdmission] = useState('');

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editQuestionOptions, setEditQuestionOptions] = useState('');
  const [editClassGrade, setEditClassGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const exportToExcel = () => {
    let headers = ['Student Name', 'Admission Number', 'Status'];
    let rows: (string | number)[][] = [];

    if (reportType === 'all') {
      const categories = settings.assessmentCategories || [];
      headers = ['Student Name', 'Admission Number', 'Status', 'CCE %', ...categories.map(c => `${c} %`)];
      rows = filteredCceStudents.map(student => {
        const studentMarks = cceMarks.filter(m => m.studentId === student.id);
        const totalScore = studentMarks.reduce((sum, m) => sum + (m.score === 'Ab' ? 0 : Number(m.score) || 0), 0);
        const totalMax = studentMarks.reduce((sum, m) => sum + m.maxScore, 0);
        const ccePerc = totalMax > 0 ? `${((totalScore / totalMax) * 100).toFixed(1)}%` : '-';

        const month = settings.reportMonth || settings.currentAssessmentMonth || 'August';
        const requiredCategories = settings.assessmentCategories || [];
        const studentAssessments = assessments.filter(a => a.studentId === student.id && matchesMonth(a.month, month));
        const teacherAssessments = studentAssessments.filter(a => a.assessorId === student.mentorId);
        const selfAssessments = studentAssessments.filter(a => a.assessorId === student.id);
        const teacherAssessedCategories = new Set(teacherAssessments.map(a => a.category));
        const selfAssessedCategories = new Set(selfAssessments.map(a => a.category));
        const assessmentsCompleted = studentAssessments.length > 0 || requiredCategories.every(cat => 
          teacherAssessedCategories.has(cat) || selfAssessedCategories.has(cat)
        );
        const studentTemplates = taskTemplates.filter(t => String(t.classGrade) === String(student.classGrade) && matchesMonth(t.month, month));
        const completedTasks = studentTasks.filter(t => t.studentId === student.id && t.completed && matchesMonth(t.month, month));
        const tasksCompleted = studentTemplates.length === 0 || completedTasks.length > 0 || studentTemplates.every(template => 
          completedTasks.some(t => t.templateId === template.id)
        );
        const status = (assessmentsCompleted && tasksCompleted) ? 'Complete' : 'Incomplete';

        const catAvgs = categories.map(cat => {
          const catAssessments = assessments.filter(a => a.studentId === student.id && a.category === cat);
          if (catAssessments.length === 0) return '-';
          const latest = catAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          const scores = Object.values(latest.scores) as number[];
          if (scores.length === 0) return '-';
          return `${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}%`;
        });

        return [student.name, student.admissionNumber || 'N/A', status, ccePerc, ...catAvgs];
      });
    } else if (reportType === 'cce') {
      const filteredGradeSubs = subjects
        .filter(s => s.classGrade === cceClassFilters.classGrade && (cceClassFilters.section ? s.section === cceClassFilters.section : true))
        .map(s => s.name);
      const allSubs = subjects.map(s => s.name);
      const markSubs = cceMarks
        .filter(m => filteredCceStudents.some(st => st.id === m.studentId))
        .map(m => m.subject);
      const classSubjects = Array.from(new Set([
        ...(filteredGradeSubs.length > 0 ? filteredGradeSubs : allSubs),
        ...markSubs
      ])).sort();
      headers = ['Student Name & ID', ...classSubjects, 'Total Marks'];
      rows = filteredCceStudents.map(student => {
        const studentMarks = cceMarks.filter(m => m.studentId === student.id);
        const subVals = classSubjects.map(sub => {
          const subMarks = studentMarks.filter(m => m.subject === sub);
          const sTotal = subMarks.reduce((a, b) => a + (b.score === 'Ab' ? 0 : b.score), 0);
          const sMax = subMarks.reduce((a, b) => a + b.maxScore, 0);
          const sOut30 = sMax > 0 ? (sTotal / sMax) * 30 : 0;
          return sMax > 0 ? sOut30.toFixed(1) : '-';
        });

        const totalOutOf30 = classSubjects.reduce<number>((sum, sub) => {
          const subMarks = studentMarks.filter(m => m.subject === sub);
          const sTotal = subMarks.reduce<number>((a, b: any) => a + (b.score === 'Ab' ? 0 : (b.score || 0)), 0);
          const sMax = subMarks.reduce<number>((a, b: any) => a + (b.maxScore || 0), 0);
          return sum + (sMax > 0 ? (sTotal / sMax) * 30 : 0);
        }, 0);
        const maxTotal = classSubjects.length * 30;
        const totalVal = maxTotal > 0 ? `${totalOutOf30.toFixed(1)} / ${maxTotal}` : '-';

        return [
          `${student.name}${student.admissionNumber ? ` (${student.admissionNumber})` : ''}`,
          ...subVals,
          totalVal
        ];
      });
    } else {
      const fields = (settings.categoryFields || {})[reportType] || [];
      headers = ['Student Name', 'Admission Number', 'Status', ...fields];
      rows = filteredCceStudents.map(student => {
        const month = settings.reportMonth || settings.currentAssessmentMonth || 'August';
        const requiredCategories = settings.assessmentCategories || [];
        const studentAssessments = assessments.filter(a => a.studentId === student.id && matchesMonth(a.month, month));
        const teacherAssessments = studentAssessments.filter(a => a.assessorId === student.mentorId);
        const selfAssessments = studentAssessments.filter(a => a.assessorId === student.id);
        const teacherAssessedCategories = new Set(teacherAssessments.map(a => a.category));
        const selfAssessedCategories = new Set(selfAssessments.map(a => a.category));
        const assessmentsCompleted = studentAssessments.length > 0 || requiredCategories.every(cat => 
          teacherAssessedCategories.has(cat) || selfAssessedCategories.has(cat)
        );
        const studentTemplates = taskTemplates.filter(t => String(t.classGrade) === String(student.classGrade) && matchesMonth(t.month, month));
        const completedTasks = studentTasks.filter(t => t.studentId === student.id && t.completed && matchesMonth(t.month, month));
        const tasksCompleted = studentTemplates.length === 0 || completedTasks.length > 0 || studentTemplates.every(template => 
          completedTasks.some(t => t.templateId === template.id)
        );
        const status = (assessmentsCompleted && tasksCompleted) ? 'Complete' : 'Incomplete';

        const fieldVals = fields.map(field => {
          const fieldQuestionIds = questions.filter(q => 
            q.category === reportType && 
            q.field.trim().toLowerCase() === field.trim().toLowerCase()
          ).map(q => q.id);
          const categoryAssessments = assessments.filter(a => a.studentId === student.id && a.category === reportType);
          if (categoryAssessments.length === 0 || fieldQuestionIds.length === 0) return '-';
          const latest = categoryAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          const fieldScores = fieldQuestionIds.map(id => latest.scores[id]).filter(s => s !== undefined);
          const fAvg = fieldScores.length > 0 ? fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length : 0;
          return fAvg > 0 ? `${fAvg.toFixed(1)}%` : '-';
        });

        return [student.name, student.admissionNumber || 'N/A', status, ...fieldVals];
      });
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${(String(cell || '')).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `class_report_grade_${cceClassFilters.classGrade}_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const teachers = users.filter(u => u.role === 'teacher');

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      alert('Please enter question text.');
      return;
    }
    if (!newQuestionCategory) {
      alert('Please select or add a category first.');
      return;
    }
    if (!newQuestionField) {
      alert('Please select a field first. If you just added a field, it should be selected automatically.');
      return;
    }
    addQuestion({ 
      text: newQuestionText, 
      category: newQuestionCategory,
      field: newQuestionField,
      enabled: true,
      options: newQuestionOptions.split(',').map(o => o.trim()).filter(Boolean).length > 0 
        ? newQuestionOptions.split(',').map(o => o.trim()).filter(Boolean) 
        : undefined
    });
    setNewQuestionText('');
    setNewQuestionOptions('');
    alert('Question added successfully!');
  };

  const handleUpdateQuestion = (id: string) => {
    if (!editQuestionText.trim()) return;
    updateQuestion(id, { 
      text: editQuestionText,
      options: editQuestionOptions.split(',').map(o => o.trim()).filter(Boolean).length > 0 
        ? editQuestionOptions.split(',').map(o => o.trim()).filter(Boolean) 
        : undefined
    });
    setEditingQuestionId(null);
    alert('Question updated.');
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryText.trim()) return;
    const catName = newCategoryText.trim();
    const currentCats = settings.assessmentCategories || [];
    if (!currentCats.includes(catName)) {
      updateSettings({ 
        assessmentCategories: [...currentCats, catName]
      });
      if (!newQuestionCategory) setNewQuestionCategory(catName);
      if (!newFieldCategory) setNewFieldCategory(catName);
      alert(`Category "${catName}" added.`);
    }
    setNewCategoryText('');
  };

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Delete category "${cat}" and ALL its fields? Questions will be hidden.`)) {
      const currentCats = (settings.assessmentCategories || []).filter(c => c !== cat);
      const currentFields = { ...(settings.categoryFields || {}) };
      delete currentFields[cat];
      
      updateSettings({ 
        assessmentCategories: currentCats,
        categoryFields: currentFields
      });
      
      if (newQuestionCategory === cat) setNewQuestionCategory(currentCats[0] || '');
      if (newFieldCategory === cat) setNewFieldCategory(currentCats[0] || '');
      alert(`Category "${cat}" removed.`);
    }
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldText.trim()) {
      alert('Please enter a field name.');
      return;
    }
    if (!newFieldCategory) {
      alert('Please select or add a category first.');
      return;
    }
    
    const catFields = settings.categoryFields || {};
    const currentFields = catFields[newFieldCategory] || [];
    const trimmedField = newFieldText.trim();
    
    if (!currentFields.includes(trimmedField)) {
      updateSettings({ 
        categoryFields: {
          ...catFields,
          [newFieldCategory]: [...currentFields, trimmedField]
        }
      });
      alert(`Field "${trimmedField}" added to ${newFieldCategory}.`);
    } else {
      alert(`Field "${trimmedField}" already exists in this category.`);
    }
    
    setNewQuestionField(trimmedField);
    setNewQuestionCategory(newFieldCategory);
    setNewFieldText('');
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !newSubjectGrade.trim()) return;
    addSubject({ name: newSubjectName, classGrade: newSubjectGrade, section: newSubjectSection || undefined });
    setNewSubjectName('');
    setNewSubjectGrade('');
    setNewSubjectSection('');
    alert('Subject added successfully!');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    addUser({
      name: newUserName,
      password: newUserPassword,
      role: newUserRole,
      admissionNumber: newUserRole === 'student' ? newUserAdmission : undefined,
      classGrade: newUserClassGrade,
      section: newUserSection
    });
    setNewUserName('');
    setNewUserAdmission('');
    setNewUserClassGrade('');
    setNewUserSection('');
    alert('User added successfully!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Reading file...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const newUsersToBulkAdd = json.map(row => {
          const findVal = (keys: string[]) => {
            for (const k of keys) {
              if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                return String(row[k]).trim();
              }
              const foundKey = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''));
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
                return String(row[foundKey]).trim();
              }
            }
            return undefined;
          };

          return {
            name: findVal(['Name', 'StudentName', 'FullName']) || 'Unknown',
            role: (findVal(['Role', 'UserRole']) || 'student').toLowerCase() as 'student' | 'teacher' | 'admin',
            password: findVal(['Password', 'Pass']) || 'password123',
            classGrade: findVal(['ClassGrade', 'Class', 'Grade', 'Standard']),
            section: findVal(['Section', 'Sec', 'Division']),
            admissionNumber: findVal(['AdmissionNumber', 'AdmissionNo', 'AdmNo', 'ID', 'StudentId', 'Admission']),
          };
        });

        const validUsers = newUsersToBulkAdd.filter(u => u.role === 'student' || u.role === 'teacher');
        
        if (validUsers.length > 0) {
          addUsers(validUsers);
          alert(`Successfully imported ${validUsers.length} users!`);
        } else {
          alert('No valid users found in the Excel file. Please ensure columns include Name and Role.');
        }
      } catch (err) {
        console.error(err);
        alert('Error parsing Excel file. Please check the format.');
      } finally {
        setUploadStatus(null);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadSubjectTemplate = () => {
    const templateData = [
      { Class: "10", Section: "A", Subject: "Mathematics" },
      { Class: "10", Section: "A", Subject: "Physics" },
      { Class: "9", Section: "B", Subject: "English" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SubjectsTemplate");
    XLSX.writeFile(wb, "Subjects_Import_Template.xlsx");
  };

  const handleSubjectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Reading subjects file...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const findVal = (row: any, keys: string[]) => {
          for (const k of keys) {
            for (const rk of Object.keys(row)) {
              if (rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, '')) {
                return row[rk];
              }
            }
          }
          return undefined;
        };

        const newSubjectsToBulkAdd = json.map(row => {
          const name = findVal(row, ['subject', 'subjectname', 'name', 'coursename', 'title']);
          const classGrade = findVal(row, ['classgrade', 'class', 'grade', 'standard']);
          const section = findVal(row, ['section', 'sec', 'div', 'division']);

          return {
            name: name ? String(name).trim() : 'Unknown Subject',
            classGrade: classGrade ? String(classGrade).trim() : 'Unknown Grade',
            section: section ? String(section).trim() : undefined,
          };
        });

        const validSubjects = newSubjectsToBulkAdd.filter(s => s.name !== 'Unknown Subject' && s.classGrade !== 'Unknown Grade');
        
        if (validSubjects.length > 0) {
          addSubjects(validSubjects);
          alert(`Successfully imported ${validSubjects.length} subjects!`);
        } else {
          alert('No valid subjects found in the Excel file. Please ensure columns include Class/ClassGrade and Subject/SubjectName.');
        }
      } catch (err) {
        console.error(err);
        alert('Error parsing Excel file. Please check the format.');
      } finally {
        setUploadStatus(null);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [dirClassFilter, setDirClassFilter] = useState('');
  const [dirSectionFilter, setDirSectionFilter] = useState('');
  const [dirRoleFilter, setDirRoleFilter] = useState<string>('all');

  const allVisibleUsers = users.filter(u => u.role !== 'admin');
  const availableClasses = Array.from(new Set(allVisibleUsers.map(u => u.classGrade).filter(Boolean))) as string[];
  const availableSections = Array.from(new Set(allVisibleUsers.map(u => u.section).filter(Boolean))) as string[];

  const isFilterOrSearchActive = dirSearchQuery.trim() !== '' || dirClassFilter !== '' || dirSectionFilter !== '' || dirRoleFilter !== 'all';

  const visibleUsers = isFilterOrSearchActive 
    ? allVisibleUsers.filter(u => {
        const matchesSearch = dirSearchQuery === '' || 
          (u.name || '').toLowerCase().includes(dirSearchQuery.toLowerCase()) || 
          (u.admissionNumber && (u.admissionNumber || '').toLowerCase().includes(dirSearchQuery.toLowerCase()));
        const matchesClass = dirClassFilter === '' || u.classGrade === dirClassFilter;
        const matchesSection = dirSectionFilter === '' || u.section === dirSectionFilter;
        const matchesRole = dirRoleFilter === 'all' || u.role === dirRoleFilter;
        return matchesSearch && matchesClass && matchesSection && matchesRole;
      })
    : [];
  
  const handleToggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.size === visibleUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(visibleUsers.map(u => u.id)));
    }
  };

  const handleBulkDeleteUsers = () => {
    if (selectedUserIds.size === 0) return;
    deleteUsers(Array.from(selectedUserIds));
    setSelectedUserIds(new Set());
  };

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [subjectClassFilter, setSubjectClassFilter] = useState('');
  const [subjectSectionFilter, setSubjectSectionFilter] = useState('');

  const availableSubjectClasses = Array.from(new Set((subjects || []).map(s => s.classGrade).filter(Boolean))) as string[];
  const availableSubjectSections = Array.from(new Set((subjects || []).map(s => s.section).filter(Boolean))) as string[];

  const filteredSubjects = (subjects || []).filter(s => {
    const matchesSearch = subjectSearchQuery === '' || (s.name || '').toLowerCase().includes(subjectSearchQuery.toLowerCase());
    const matchesClass = subjectClassFilter === '' || s.classGrade === subjectClassFilter;
    const matchesSection = subjectSectionFilter === '' || s.section === subjectSectionFilter;
    return matchesSearch && matchesClass && matchesSection;
  });

  const handleToggleSubjectSelection = (subjectId: string) => {
    const newSelection = new Set(selectedSubjectIds);
    if (newSelection.has(subjectId)) {
      newSelection.delete(subjectId);
    } else {
      newSelection.add(subjectId);
    }
    setSelectedSubjectIds(newSelection);
  };

  const handleSelectAllSubjects = () => {
    if (selectedSubjectIds.size === filteredSubjects.length) {
      setSelectedSubjectIds(new Set());
    } else {
      setSelectedSubjectIds(new Set(filteredSubjects.map(s => s.id)));
    }
  };

  const handleBulkDeleteSubjects = () => {
    if (selectedSubjectIds.size === 0) return;
    deleteSubjects(Array.from(selectedSubjectIds));
    setSelectedSubjectIds(new Set());
  };

  const filteredCceStudents = users.filter(u => 
    u.role === 'student' && 
    u.classGrade === cceClassFilters.classGrade && 
    (cceClassFilters.section ? u.section === cceClassFilters.section : true)
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {currentUser?.admissionNumber && (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                  ID: {currentUser.admissionNumber}
                </div>
              )}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {currentUser?.name || 'Command Center'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('settings')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              title="System Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <div className="h-10 w-px bg-slate-200 mx-1"></div>
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Session</p>
                <p className="text-xs font-bold text-slate-700 mt-1">{settings.academicYear}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <History className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Executive Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{users.filter(u => u.role === 'student').length}</h4>
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                    <CheckCircle2 className="w-3 h-3" /> Active Enrollment
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Faculty</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{users.filter(u => u.role === 'teacher').length}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 italic">Monitoring {subjects.length} Subjects</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessments</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{assessments.length}</h4>
                  <p className="text-[10px] font-bold text-amber-600 mt-2 uppercase tracking-tighter">Current: {settings.currentAssessmentMonth}</p>
                </div>
              </div>

              {/* Mentors Access Card */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-[2rem] text-white shadow-lg shadow-amber-200 relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('mentors')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-100">Mentorship</p>
              <h4 className="text-2xl font-black mt-1">Mentor Assignment</h4>
              <p className="text-[10px] font-bold text-amber-50 mt-2 flex items-center gap-1">
                Assign teachers as mentors <Plus className="w-3 h-3" />
              </p>
            </div>
          </div>
        </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* System Status & Window */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                        <Sparkles className="w-3 h-3" /> System Status
                      </div>
                      <h3 className="text-3xl font-black leading-tight">Campus Assessment Window is {settings.assessmentsActive ? 'OPEN' : 'LOCKED'}</h3>
                      <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                        Currently monitoring <span className="text-white font-bold">{settings.currentAssessmentMonth}</span> performance data across {users.filter(u => u.role === 'student').length} students.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                          <span key={m} className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${
                            (settings.activeAssessmentMonths || []).includes(m) ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-500'
                          }`}>
                            {m.substring(0, 3)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 flex md:flex-col gap-3">
                      <button 
                        onClick={() => updateSettings({ assessmentsActive: !settings.assessmentsActive })}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                          settings.assessmentsActive 
                            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                        }`}
                      >
                        {settings.assessmentsActive ? 'Lock Assessments' : 'Open Assessments'}
                      </button>
                      <button 
                        onClick={() => setActiveTab('settings')}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all border border-white/10"
                      >
                        Configure Cycle
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" /> Academic Setup
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-500 font-medium">Configured Subjects</span>
                        <span className="text-sm font-bold text-slate-800">{subjects.length}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-500 font-medium">Active Sections</span>
                        <span className="text-sm font-bold text-slate-800">{new Set(users.filter(u => u.section).map(u => u.section)).size}</span>
                      </div>
                      <button 
                        onClick={() => setActiveTab('assessments')}
                        className="w-full mt-2 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors"
                      >
                        Manage Subjects
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-emerald-600" /> Report Release
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-500 font-medium">Release Status</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${settings.reportCardsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {settings.reportCardsActive ? 'Released' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-xs text-slate-500 font-medium">Target Month</span>
                        <span className="text-sm font-bold text-slate-800">{settings.reportMonth || 'Not Set'}</span>
                      </div>
                      <button 
                        onClick={() => setActiveTab('reports')}
                        className="w-full mt-2 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors"
                      >
                        Release Center
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Sidebar */}
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Recent Activity</h4>
                    <History className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="space-y-6 flex-1">
                    {assessmentLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).map((log, i) => (
                      <div key={log.id} className="relative pl-6 pb-6 border-l border-slate-100 last:pb-0 last:border-0">
                        <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm shadow-blue-200"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString()}</p>
                        <p className="text-xs font-bold text-slate-800">{log.adminName}</p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{log.details}</p>
                      </div>
                    ))}
                    {assessmentLogs.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-xs text-slate-400 italic">No recent activity logs.</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className="mt-6 w-full py-3 border border-slate-100 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all"
                  >
                    View All Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-700"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-700" /> Add New User
                </h3>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                    <select 
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input type="text" value={newUserName || ''} onChange={(e) => setNewUserName(e.target.value)} required className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  {newUserRole === 'student' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Admission Number</label>
                      <input type="text" value={newUserAdmission || ''} onChange={(e) => setNewUserAdmission(e.target.value)} required className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. ADM-001" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                    <input type="text" value={newUserPassword || ''} onChange={(e) => setNewUserPassword(e.target.value)} required className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Class Grade</label>
                      <input type="text" value={newUserClassGrade || ''} onChange={(e) => setNewUserClassGrade(e.target.value)} className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. 10" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Section</label>
                      <input type="text" value={newUserSection || ''} onChange={(e) => setNewUserSection(e.target.value)} className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. A" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors mt-2">
                    Create User
                  </button>
                </form>
              </div>

              {/* Bulk Upload Feature */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-600" /> Bulk Import
                </h3>
                <p className="text-xs text-slate-500 mb-4">Upload an Excel (.xlsx) file with columns: Name, Role (student/teacher), ClassGrade, Section, AdmissionNumber, Password.</p>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-xl p-4 text-center hover:bg-emerald-100 transition-colors">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span className="text-sm font-bold text-emerald-700 block">
                      {uploadStatus || 'Click or drag Excel file here'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Campus Directory</h3>
                  </div>
                  {selectedUserIds.size > 0 && (
                    <button 
                      onClick={handleBulkDeleteUsers}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Selected ({selectedUserIds.size})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60">
                  <div className="relative sm:col-span-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={dirSearchQuery}
                      onChange={(e) => setDirSearchQuery(e.target.value)}
                      placeholder="Search candidate name or ID..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <select
                      value={dirClassFilter}
                      onChange={(e) => setDirClassFilter(e.target.value)}
                      className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Classes</option>
                      {availableClasses.map(c => (
                        <option key={c} value={c}>Grade {c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={dirRoleFilter}
                      onChange={(e) => setDirRoleFilter(e.target.value)}
                      className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Roles</option>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 w-10">
                        <input 
                          type="checkbox" 
                          checked={selectedUserIds.size === visibleUsers.length && visibleUsers.length > 0}
                          onChange={handleSelectAllUsers}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">User</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Role / Class</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!isFilterOrSearchActive ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs italic bg-slate-50/50">
                          Student and teacher names are hidden by default. Please enter a search query or select a class filter above to view candidates.
                        </td>
                      </tr>
                    ) : visibleUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 bg-slate-50/50 italic">
                          No matching candidates found.
                        </td>
                      </tr>
                    ) : (
                      visibleUsers.map(u => (
                        <tr key={u.id} className={selectedUserIds.has(u.id) ? 'bg-blue-50/50' : ''}>
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              checked={selectedUserIds.has(u.id)}
                              onChange={() => handleToggleUserSelection(u.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                            {u.admissionNumber && <p className="text-[10px] text-slate-500 font-bold tracking-wider">ID: {u.admissionNumber}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role}
                            </span>
                            <span className="ml-2 text-xs text-slate-600 font-bold">{u.classGrade ? `Grade ${u.classGrade}` : ''} {u.section ? `Sec ${u.section}` : ''}</span>
                            {u.role === 'student' && (
                              <div className="mt-2">
                                <select 
                                  value={u.mentorId || ''}
                                  onChange={(e) => updateUser(u.id, { mentorId: e.target.value })}
                                  className="text-xs border-slate-200 rounded p-1 w-full max-w-[140px] focus:ring-blue-500"
                                >
                                  <option value="">No Mentor Assigned</option>
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button 
                              onClick={() => {
                                setEditingUser(u);
                                setEditName(u.name);
                                setEditRole(u.role);
                                setEditAdmission(u.admissionNumber || '');
                                setEditClassGrade(u.classGrade || '');
                                setEditSection(u.section || '');
                                setEditPassword(u.password || 'password123');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold transition-colors"
                              title="Edit Details"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                impersonate(u.id);
                                navigate(`/${u.role}`);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors"
                              title="View Portal"
                            >
                              <Eye className="w-3 h-3" /> Portal
                            </button>
                            {u.role === 'student' && (
                              <>
                                <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-xs font-bold transition-colors cursor-pointer">
                                  <Upload className="w-3 h-3" /> Photo
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          updateUser(u.id, { photoUrl: reader.result as string });
                                          alert('Photo updated successfully!');
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                                <button 
                                  onClick={() => navigate(`/report/${u.id}`)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded text-xs font-bold transition-colors"
                                >
                                  <FileText className="w-3 h-3" /> Generate Report
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${u.name}? This cannot be undone.`)) {
                                  deleteUsers([u.id]);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <div className="space-y-6">
              {/* Category Management */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-slate-400" /> Assessment Categories
                </h3>
                
                <form onSubmit={handleAddCategory} className="mb-6 flex gap-2">
                  <input 
                    type="text" 
                    value={newCategoryText} 
                    onChange={(e) => setNewCategoryText(e.target.value)} 
                    placeholder="New Category (e.g., Spiritual, Wellbeing)" 
                    className="flex-1 rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-slate-500 outline-none transition-all" 
                    required 
                  />
                  <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-100">
                    Add
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {(settings.assessmentCategories || []).map(cat => (
                    <div key={cat} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg group transition-all hover:bg-white hover:border-slate-300">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{cat}</span>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        className="text-slate-300 hover:text-red-500 transition-all p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(!settings.assessmentCategories || settings.assessmentCategories.length === 0) && (
                    <p className="text-[10px] text-slate-400 font-bold italic">No custom categories added yet.</p>
                  )}
                </div>
              </div>

              {/* Assessment Fields Management */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" /> Assessment Fields
                </h3>
                
                <form onSubmit={handleAddField} className="mb-6 space-y-4 pb-6 border-b border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Category</label>
                      <select 
                        value={newFieldCategory} 
                        onChange={(e) => setNewFieldCategory(e.target.value)} 
                        className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50"
                        required
                      >
                        <option value="">-- Choose Category --</option>
                        {(settings.assessmentCategories || []).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Field Name</label>
                      <input 
                        type="text" 
                        value={newFieldText} 
                        onChange={(e) => setNewFieldText(e.target.value)} 
                        placeholder="E.g., Prayers, Discipline" 
                        className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50" 
                        required 
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Field to Category
                  </button>
                </form>

                <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {(settings.assessmentCategories || []).map(cat => (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400">{cat} Fields</h5>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {((settings.categoryFields || {})[cat] || []).map(f => (
                          <div key={f} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-lg group transition-all hover:bg-blue-50">
                            <span className="text-[10px] font-bold text-blue-700">{f}</span>
                            <button 
                              onClick={() => {
                                if (window.confirm(`Delete "${f}"? This will hide all questions linked to this field.`)) {
                                  const catFields = { ...(settings.categoryFields || {}) };
                                  catFields[cat] = (catFields[cat] || []).filter(item => item !== f);
                                  updateSettings({ categoryFields: catFields });
                                }
                              }}
                              className="text-blue-300 hover:text-red-500 transition-all p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {(!settings.categoryFields || !settings.categoryFields[cat] || settings.categoryFields[cat].length === 0) && (
                          <p className="text-[9px] text-slate-300 font-bold italic px-1">No fields defined.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment Question Manager */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-500" /> New Question
                </h3>
                
                <form onSubmit={handleAddQuestion} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                      <select 
                        value={newQuestionCategory}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setNewQuestionCategory(cat);
                          const fields = (settings.categoryFields || {})[cat];
                          setNewQuestionField(fields && fields.length > 0 ? fields[0] : '');
                        }}
                        className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all bg-slate-50"
                        required
                      >
                        <option value="">-- Choose Category --</option>
                        {(settings.assessmentCategories || []).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Field</label>
                      <select 
                        value={newQuestionField}
                        onChange={(e) => setNewQuestionField(e.target.value)}
                        className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all bg-slate-50"
                        required
                      >
                        <option value="">-- Choose Field --</option>
                        {((settings.categoryFields || {})[newQuestionCategory] || []).map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Question Text</label>
                    <input 
                      type="text" 
                      value={newQuestionText} 
                      onChange={(e) => setNewQuestionText(e.target.value)} 
                      placeholder="E.g., Does the student demonstrate punctuality?" 
                      className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all bg-slate-50" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Custom Options (Optional)</label>
                    <input 
                      type="text" 
                      value={newQuestionOptions} 
                      onChange={(e) => setNewQuestionOptions(e.target.value)} 
                      placeholder="E.g., Excellent, Good, Need Improvement (comma separated)" 
                      className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all bg-slate-50" 
                    />
                    <p className="text-[9px] text-slate-400 font-medium mt-1">Leave blank to use default rating scale.</p>
                  </div>
                  <button type="submit" className="w-full bg-amber-500 text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100">
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Save Question
                  </button>
                </form>
              </div>

              {/* Class Subjects Manager */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-600" /> Class Subjects
                </h3>
                <form onSubmit={handleAddSubject} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Grade</label>
                      <input type="text" value={newSubjectGrade} onChange={(e) => setNewSubjectGrade(e.target.value)} placeholder="10" className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" required />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Section</label>
                      <input type="text" value={newSubjectSection} onChange={(e) => setNewSubjectSection(e.target.value)} placeholder="A" className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Subject Name</label>
                    <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Mathematics" className="w-full rounded-xl border-slate-200 border px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" required />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Subject
                  </button>
                </form>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulk Import</h4>
                    <button onClick={downloadSubjectTemplate} className="text-[9px] font-black text-blue-600 hover:underline uppercase">Template</button>
                  </div>
                  <div className="relative">
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleSubjectFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-4 text-center hover:bg-white hover:border-slate-300 transition-all">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {uploadStatus || 'Drop Excel file to import subjects'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Question Visibility & Toggle List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[800px]">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" /> Visibility Matrix
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Manage which questions appear in assessment portals.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  {(settings.assessmentCategories || []).map(cat => (
                    <div key={cat} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                        <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest">{cat} Questions</h5>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {questions.filter(q => q.category === cat).map(q => (
                          <div key={q.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${q.enabled !== false ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{q.field}</span>
                                {q.enabled !== false ? (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div> ACTIVE
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 uppercase tracking-tighter">DISABLED</span>
                                )}
                              </div>
                              {editingQuestionId === q.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="text" 
                                      value={editQuestionText}
                                      onChange={(e) => setEditQuestionText(e.target.value)}
                                      className="flex-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={() => handleUpdateQuestion(q.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingQuestionId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <input 
                                    type="text" 
                                    value={editQuestionOptions}
                                    onChange={(e) => setEditQuestionOptions(e.target.value)}
                                    placeholder="Options (comma separated)"
                                    className="w-full text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded px-2 py-1 outline-none"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-slate-800 leading-relaxed">{q.text}</p>
                                  {q.options && q.options.length > 0 && (
                                    <p className="text-[9px] text-slate-400 font-bold italic">Options: {q.options.join(', ')}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {editingQuestionId !== q.id && (
                                <button 
                                  onClick={() => {
                                    setEditingQuestionId(q.id);
                                    setEditQuestionText(q.text);
                                    setEditQuestionOptions(q.options?.join(', ') || '');
                                  }}
                                  className="p-2 text-slate-300 hover:text-indigo-600 transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button 
                                onClick={() => toggleQuestion(q.id, q.enabled === false)}
                                className={`w-10 h-5 rounded-full p-1 transition-all ${q.enabled !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
                              >
                                <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${q.enabled !== false ? 'translate-x-5' : 'translate-x-0'}`}></div>
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('Delete this question permanentely?')) {
                                    deleteQuestion(q.id);
                                  }
                                }}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Directory</h4>
                    </div>
                    {selectedSubjectIds.size > 0 && (
                      <button onClick={handleBulkDeleteSubjects} className="text-[9px] font-black text-red-600 uppercase hover:underline">Delete Selected ({selectedSubjectIds.size})</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    <input type="text" value={subjectSearchQuery} onChange={(e) => setSubjectSearchQuery(e.target.value)} placeholder="Search subjects..." className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold" />
                    <select value={subjectClassFilter} onChange={(e) => setSubjectClassFilter(e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold">
                      <option value="">All Grades</option>
                      {availableSubjectClasses.map(c => <option key={c} value={c}>Grade {c}</option>)}
                    </select>
                  </div>
                  <div className="mt-4 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                    {filteredSubjects.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedSubjectIds.has(s.id)} onChange={() => handleToggleSubjectSelection(s.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3" />
                          <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">G{s.classGrade}{s.section ? `•S${s.section}` : ''}</span>
                          <span className="text-[10px] font-bold text-slate-700">{s.name}</span>
                        </div>
                        <button onClick={() => window.confirm(`Delete ${s.name}?`) && deleteSubject(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cce' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <CCEMarksManager />
            <CCEMarksSummary />
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <SkillClubManager />
            <TaskTemplateManager />
            <TeacherTaskVerifier />
          </div>
        )}

        {activeTab === 'mentors' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {/* Left Sidebar: Mentors List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" /> Mentors Registry
                  </h3>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-black">{teachers.length}</span>
                </div>
                <div className="p-2 overflow-y-auto max-h-[600px] flex-1">
                  {teachers.map(teacher => {
                    const menteeCount = users.filter(u => u.mentorId === teacher.id).length;
                    return (
                      <button
                        key={teacher.id}
                        onClick={() => {
                          setExpandedMentorId(teacher.id);
                          setAssignMentorId(teacher.id); // For bulk assign
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all mb-1 ${expandedMentorId === teacher.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        <div className="text-left">
                          <p className="text-xs font-black truncate">{teacher.name}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${expandedMentorId === teacher.id ? 'text-blue-200' : 'text-slate-400'}`}>
                            {teacher.id.split('_')[0]}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${expandedMentorId === teacher.id ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                          {menteeCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Area: Mentees Management */}
            <div className="lg:col-span-3 space-y-6">
              {!expandedMentorId ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Users className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">Select a Mentor</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto">Choose a teacher from the left sidebar to manage their assigned mentees or add new ones.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Mentees List */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                          Mentees of {teachers.find(t => t.id === expandedMentorId)?.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Currently assigned students who this teacher monitors.</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {users.filter(u => u.mentorId === expandedMentorId).map(student => (
                          <div 
                            key={student.id} 
                            className="flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{student.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black uppercase text-emerald-600 tracking-tighter">Grade {student.classGrade} {student.section}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {student.admissionNumber || 'N/A'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (window.confirm(`Unassign ${student.name} from this mentor?`)) {
                                  updateUser(student.id, { mentorId: '' });
                                }
                              }}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Remove Mentee"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {users.filter(u => u.mentorId === expandedMentorId).length === 0 && (
                          <div className="col-span-full py-8 text-center text-slate-400 font-bold italic border-2 border-dashed border-slate-100 rounded-2xl">
                            No students currently assigned to this mentor.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add New Mentees (Bulk Picker) */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <Plus className="w-4 h-4 text-blue-500" /> Add New Mentees
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Select students to assign to {teachers.find(t => t.id === expandedMentorId)?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={assignClassGrade}
                          onChange={(e) => {
                            setAssignClassGrade(e.target.value);
                            setAssignSection('');
                            setSelectedMenteeIds(new Set());
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Grade</option>
                          {availableClasses.sort().map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                          value={assignSection}
                          onChange={(e) => {
                            setAssignSection(e.target.value);
                            setSelectedMenteeIds(new Set());
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Section</option>
                          {Array.from(new Set(users.filter(u => u.classGrade === assignClassGrade && u.section).map(u => u.section))).sort().map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      {assignClassGrade ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate Students</span>
                            <button 
                              onClick={() => {
                                const classStudents = users.filter(u => u.role === 'student' && u.classGrade === assignClassGrade && (assignSection ? u.section === assignSection : true));
                                if (selectedMenteeIds.size === classStudents.length) setSelectedMenteeIds(new Set());
                                else setSelectedMenteeIds(new Set(classStudents.map(s => s.id)));
                              }}
                              className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                            >
                              {selectedMenteeIds.size > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {users.filter(u => u.role === 'student' && u.classGrade === assignClassGrade && (assignSection ? u.section === assignSection : true)).map(student => (
                              <label 
                                key={student.id} 
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedMenteeIds.has(student.id) ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={selectedMenteeIds.has(student.id)}
                                  onChange={() => {
                                    const next = new Set(selectedMenteeIds);
                                    if (next.has(student.id)) next.delete(student.id);
                                    else next.add(student.id);
                                    setSelectedMenteeIds(next);
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-slate-900 truncate">{student.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {student.admissionNumber || 'PENDING'}</p>
                                    {student.mentorId && (
                                      <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">Has Mentor</span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                          {selectedMenteeIds.size > 0 && (
                            <button 
                              onClick={() => {
                                if (window.confirm(`Assign ${selectedMenteeIds.size} students to ${teachers.find(t => t.id === expandedMentorId)?.name}?`)) {
                                  Array.from(selectedMenteeIds).forEach(studentId => {
                                    updateUser(studentId, { mentorId: expandedMentorId });
                                  });
                                  setSelectedMenteeIds(new Set());
                                  alert('Mentor assigned successfully!');
                                }
                              }}
                              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <ShieldCheck className="w-4 h-4" /> Finalize Assignments ({selectedMenteeIds.size})
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-300 font-black italic uppercase tracking-widest text-[10px]">
                          Select a Grade to Add More Students
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="print:hidden">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Class Performance Reports
              </h3>
              
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Report Release Center</h4>
                    <p className="text-[10px] text-slate-500 font-bold">Configure and publish student performance data to the portal.</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select 
                    value={settings.reportMonth || ''}
                    onChange={e => updateSettings({ reportMonth: e.target.value })}
                    className="rounded-xl border-indigo-200 p-3 text-sm text-indigo-900 font-black bg-white focus:ring-indigo-500 min-w-[200px]"
                  >
                    <option value="">Select Target Month</option>
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
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <FileText className="w-4 h-4" /> Generate Monthly
                  </button>
                  <button
                    onClick={() => {
                      updateSettings({ isTotalReportGenerated: true, reportCardsActive: true });
                      alert(`Total Semester Report Published!`);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <FileText className="w-4 h-4" /> Publish Total
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class Grade</label>
                  <select 
                    value={cceClassFilters.classGrade} 
                    onChange={(e) => setCceClassFilters({...cceClassFilters, classGrade: e.target.value, section: ''})}
                    className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                  >
                    <option value="">Select Class Grade</option>
                    {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade).map(u => u.classGrade))).sort().map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                  <select 
                    value={cceClassFilters.section} 
                    onChange={(e) => setCceClassFilters({...cceClassFilters, section: e.target.value})}
                    className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                    disabled={!cceClassFilters.classGrade}
                  >
                    <option value="">All Sections</option>
                    {Array.from(new Set(users.filter(u => u.role === 'student' && u.classGrade === cceClassFilters.classGrade && u.section).map(u => u.section))).sort().map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 print:hidden">
                {(['all', 'cce', ...(settings.assessmentCategories || [])]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      reportType === type 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 -translate-y-0.5' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'Full Overview' : type === 'cce' ? 'Academic (CCE)' : type}
                  </button>
                ))}
              </div>
            </div>

            {filteredCceStudents.length > 0 ? (
              <div className="space-y-4 print-report-container class-report-print">
                <div className="flex justify-between items-center mb-4 print:hidden">
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm">
                    {reportType === 'all' ? 'Master Roster' : reportType === 'cce' ? 'Academic Master' : `${reportType} Master`}
                    <span className="text-slate-400 ml-2 font-bold">: Grade {cceClassFilters.classGrade} - {cceClassFilters.section || 'All Sections'}</span>
                  </h4>
                  <div className="flex gap-2">
                    <button onClick={exportToExcel} className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
                      <FileSpreadsheet className="w-4 h-4" /> Export to Excel
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors shadow-sm">
                      <Printer className="w-4 h-4" /> Print Master Sheet
                    </button>
                  </div>
                </div>

                {/* Printable Official Header */}
                <div className="hidden print:flex items-center justify-between mb-4 border-b-2 border-slate-900 pb-3 px-2">
                  <div className="flex items-center gap-3">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">{settings.name || "Grand Campus Assurance"}</h2>
                      <p className="text-[9px] font-extrabold text-slate-600 uppercase tracking-widest mt-0.5">
                        Official CCE Subject Marks Master Report
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-slate-900 uppercase">
                      Class: Grade {cceClassFilters.classGrade} {cceClassFilters.section ? `(Sec ${cceClassFilters.section})` : '(All Sections)'}
                    </div>
                    <div className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">
                      Publishing Month: {settings.reportMonth || settings.currentAssessmentMonth || 'August'} | Academic Year: {settings.academicYear || '2025-2026'}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl print:border-slate-400 print:rounded-none shadow-inner print:overflow-visible">
                  <table className={`w-full text-left border-collapse min-w-max print:text-[9px] print:table-auto`}>
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-700 print:bg-slate-200 print:border-slate-400">
                        <th className={`px-4 py-4 text-[10px] font-black text-white uppercase tracking-widest sticky left-0 bg-slate-900 z-10 min-w-[140px] max-w-[200px] print:bg-slate-200 print:text-slate-900 print:px-2 print:py-2 print:text-[8px]`}>
                          Student Name & Admission
                        </th>
                        {/* ID Column Removed - Merged into first column */}
                        
                        {reportType === 'all' && (
                          <>
                            <th className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest text-center">CCE %</th>
                            {(settings.assessmentCategories || []).map(cat => (
                              <th key={cat} className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest text-center border-l border-white/10">{cat} %</th>
                            ))}
                          </>
                        )}

                        {reportType === 'cce' && (
                          <>
                            {Array.from(new Set([
                              ...(() => {
                                const fSubs = subjects
                                  .filter(s => s.classGrade === cceClassFilters.classGrade && (cceClassFilters.section ? s.section === cceClassFilters.section : true))
                                  .map(s => s.name);
                                const aSubs = subjects.map(s => s.name);
                                const mSubs = cceMarks
                                  .filter(m => filteredCceStudents.some(st => st.id === m.studentId))
                                  .map(m => m.subject);
                                return [...(fSubs.length > 0 ? fSubs : aSubs), ...mSubs];
                              })()
                            ])).sort().map(sub => (
                              <th key={sub} className="px-1 py-2 text-[8px] font-black text-white uppercase text-center border-l border-white/10 min-w-[35px] max-w-[50px] break-words whitespace-normal leading-none print:px-0.5 print:py-0.5 print:text-[6px] print:text-slate-900">{sub}</th>
                            ))}
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase tracking-tight text-center border-l border-white/10 min-w-[50px] print:px-0.5 print:py-0.5 print:text-[7px] print:text-slate-900">Total</th>
                          </>
                        )}

                        {settings.assessmentCategories?.includes(reportType) && (
                          ((settings.categoryFields || {})[reportType] || []).map(field => (
                            <th key={field} className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest text-center border-l border-white/10 min-w-[150px]">{field}</th>
                          ))
                        )}

                        <th className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest text-right print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-300">
                      {filteredCceStudents.map(student => {
                        const studentMarks = cceMarks.filter(m => m.studentId === student.id);
                        const totalScore = studentMarks.reduce((sum, m) => sum + (m.score === 'Ab' ? 0 : Number(m.score) || 0), 0);
                        const totalMax = studentMarks.reduce((sum, m) => sum + m.maxScore, 0);
                        const ccePercentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

                        const getCategoryAvg = (category: string) => {
                          const categoryAssessments = assessments.filter(a => a.studentId === student.id && a.category === category);
                          if (categoryAssessments.length === 0) return 0;
                          const latest = categoryAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                          const scores = Object.values(latest.scores) as number[];
                          if (scores.length === 0) return 0;
                          return scores.reduce((a, b) => a + b, 0) / scores.length;
                        };

                        const classSubjects = Array.from(new Set([
                          ...(() => {
                            const fSubs = subjects
                              .filter(s => s.classGrade === cceClassFilters.classGrade && (cceClassFilters.section ? s.section === cceClassFilters.section : true))
                              .map(s => s.name);
                            const aSubs = subjects.map(s => s.name);
                            const mSubs = cceMarks
                              .filter(m => filteredCceStudents.some(st => st.id === m.studentId))
                              .map(m => m.subject);
                            return [...(fSubs.length > 0 ? fSubs : aSubs), ...mSubs];
                          })()
                        ])).sort();

                        const month = settings.reportMonth || settings.currentAssessmentMonth || 'August';
                        const requiredCategories = settings.assessmentCategories || [];
                        const mentorId = student.mentorId;
                        const studentAssessments = assessments.filter(a => a.studentId === student.id && matchesMonth(a.month, month));
                        const teacherAssessments = studentAssessments.filter(a => a.assessorId === mentorId);
                        const selfAssessments = studentAssessments.filter(a => a.assessorId === student.id);
                        const teacherAssessedCategories = new Set(teacherAssessments.map(a => a.category));
                        const selfAssessedCategories = new Set(selfAssessments.map(a => a.category));
                        const assessmentsCompleted = studentAssessments.length > 0 || requiredCategories.every(cat => 
                          teacherAssessedCategories.has(cat) || selfAssessedCategories.has(cat)
                        );
                        const studentTemplates = taskTemplates.filter(t => String(t.classGrade) === String(student.classGrade) && matchesMonth(t.month, month));
                        const completedTasks = studentTasks.filter(t => t.studentId === student.id && t.completed && matchesMonth(t.month, month));
                        const tasksCompleted = studentTemplates.length === 0 || completedTasks.length > 0 || studentTemplates.every(template => 
                          completedTasks.some(t => t.templateId === template.id)
                        );
                        const isStudentComplete = assessmentsCompleted && tasksCompleted;

                        return (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                            <td className={`px-4 py-3 text-xs font-black text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 min-w-[140px] max-w-[200px] print:px-2 print:py-1 print:text-[8px]`}>
                              <div className="flex flex-col">
                                <span className="break-words whitespace-normal leading-tight">{student.name}</span>
                                <span className="text-[9px] text-slate-500 font-bold tracking-tight mt-0.5 print:text-[7px]">
                                  Adm: {student.admissionNumber || 'N/A'}
                                </span>
                              </div>
                              <span className={`block text-[8px] font-bold uppercase tracking-tighter mt-1 print:hidden ${isStudentComplete ? 'text-green-600' : 'text-rose-600'}`}>
                                {isStudentComplete ? 'Complete' : 'Incomplete'}
                              </span>
                            </td>
                            {/* ID Column Removed - Merged into first column */}
                            
                            {reportType === 'all' && (
                              <>
                                <td className="px-6 py-4 text-xs font-black text-slate-900 text-center">{ccePercentage > 0 ? `${ccePercentage.toFixed(1)}%` : '-'}</td>
                                {(settings.assessmentCategories || []).map(cat => {
                                  const avg = getCategoryAvg(cat);
                                  return (
                                    <td key={cat} className="px-6 py-4 text-xs font-black text-center border-l border-slate-50">
                                      {avg > 0 ? (
                                        <span className="text-indigo-600">{avg.toFixed(1)}%</span>
                                      ) : '-'}
                                    </td>
                                  );
                                })}
                              </>
                            )}

                            {reportType === 'cce' && (
                              <>
                                {classSubjects.map(sub => {
                                  const subMarks = studentMarks.filter(m => m.subject === sub);
                                  const sTotal = subMarks.reduce((a, b) => a + b.score, 0);
                                  const sMax = subMarks.reduce((a, b) => a + b.maxScore, 0);
                                  const sOut30 = sMax > 0 ? (sTotal / sMax) * 30 : 0;
                                  return (
                                    <td key={sub} className="px-2 py-4 text-[10px] font-black text-slate-900 text-center border-l border-slate-50 min-w-[40px] print:px-1 print:py-1 print:text-[8px]">
                                      {sMax > 0 ? sOut30.toFixed(1) : '-'}
                                    </td>
                                  );
                                })}
                                {(() => {
                                  const totalOutOf30 = classSubjects.reduce<number>((sum, sub) => {
                                    const subMarks = studentMarks.filter(m => m.subject === sub);
                                    const sTotal = subMarks.reduce<number>((a, b: any) => a + (b.score || 0), 0);
                                    const sMax = subMarks.reduce<number>((a, b: any) => a + (b.maxScore || 0), 0);
                                    return sum + (sMax > 0 ? (sTotal / sMax) * 30 : 0);
                                  }, 0);
                                  const maxTotal = classSubjects.length * 30;
                                  return (
                                    <td className="px-3 py-4 text-xs font-black text-blue-900 text-center border-l border-slate-100 bg-blue-50/50 min-w-[60px] print:px-1 print:py-1 print:text-[8px]">
                                      {maxTotal > 0 ? totalOutOf30.toFixed(1) : '-'}
                                    </td>
                                  );
                                })()}
                              </>
                            )}

                            {reportType !== 'all' && reportType !== 'cce' && (
                              ((settings.categoryFields || {})[reportType] || []).map(field => {
                                const fieldQuestionIds = questions.filter(q => 
                                  q.category === reportType && 
                                  q.field.trim().toLowerCase() === field.trim().toLowerCase()
                                ).map(q => q.id);
                                
                                const categoryAssessments = assessments.filter(a => a.studentId === student.id && a.category === reportType);
                                if (categoryAssessments.length === 0 || fieldQuestionIds.length === 0) {
                                  return <td key={field} className="px-6 py-4 text-xs text-slate-300 text-center border-l border-slate-50 italic">-</td>;
                                }

                                const latest = categoryAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                                const fieldScores = fieldQuestionIds.map(id => latest.scores[id]).filter(s => s !== undefined);
                                const fAvg = fieldScores.length > 0 ? fieldScores.reduce((a, b) => a + b, 0) / fieldScores.length : 0;

                                return (
                                  <td key={field} className="px-6 py-4 text-xs font-black text-slate-900 text-center border-l border-slate-50">
                                    {fAvg > 0 ? `${fAvg.toFixed(1)}%` : '-'}
                                  </td>
                                );
                              })
                            )}

                            <td className="px-6 py-4 text-right print:hidden">
                              <button onClick={() => navigate(`/report/${student.id}`)} className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                                <FileText className="w-4 h-4" /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Printable Official Signatures Footer */}
                <div className="hidden print:flex pt-12 mt-12 border-t-2 border-slate-900 justify-between text-center">
                  <div>
                    <div className="w-40 border-b border-slate-400 mb-2"></div>
                    <p className="text-xs font-black text-slate-900 uppercase">Class Teacher / Mentor</p>
                  </div>
                  <div>
                    <div className="w-40 border-b border-slate-400 mb-2"></div>
                    <p className="text-xs font-black text-slate-900 uppercase">OAA (Office of Academic Affairs)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="font-bold text-slate-600 mb-1">No Students Found</p>
                <p className="text-sm">Select a specific Class Grade and Section to load the student performance roster.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
            {/* Central Configuration Component */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-slate-800"></div>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <SettingsIcon className="w-7 h-7 text-slate-700" /> 
                  Academic Core Engine
                </h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Manage the global state, session years, and active assessment months for the entire campus.</p>
              </div>
              
              <CampusConfig />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  Campus Identity
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Campus Name</label>
                    <input 
                      type="text" 
                      value={settings.name || ''} 
                      onChange={(e) => updateSettings({ name: e.target.value })}
                      className="w-full rounded-xl border-slate-300 border-2 p-3 text-sm font-bold focus:ring-slate-500 focus:border-slate-500" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Campus Logo</label>
                    <div className="flex items-center gap-4">
                      {settings.logoUrl && (
                        <img src={settings.logoUrl} alt="Logo Preview" className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm" />
                      )}
                      <div className="flex-1 space-y-3">
                        <input 
                          type="text" 
                          value={settings.logoUrl || ''} 
                          onChange={(e) => updateSettings({ logoUrl: e.target.value })}
                          placeholder="https://example.com/logo.png"
                          className="w-full rounded-xl border-slate-300 border-2 p-3 text-sm font-bold focus:ring-slate-500 focus:border-slate-500" 
                        />
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    updateSettings({ logoUrl: event.target.result as string });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">
                            Upload Logo
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Module Controls</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                    <div>
                      <span className="font-black text-xs uppercase tracking-widest text-slate-800 block">Assessment Window</span>
                      <span className="text-[10px] text-slate-500 font-bold">Open spiritual/behavioural submissions.</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.assessmentsActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={settings.assessmentsActive}
                        onChange={(e) => updateSettings({ assessmentsActive: e.target.checked })}
                        className="hidden"
                      />
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${settings.assessmentsActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                    <div>
                      <span className="font-black text-xs uppercase tracking-widest text-slate-800 block">Report Release</span>
                      <span className="text-[10px] text-slate-500 font-bold">Release report cards to portals.</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.reportCardsActive ? 'bg-blue-500' : 'bg-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={settings.reportCardsActive}
                        onChange={(e) => updateSettings({ reportCardsActive: e.target.checked })}
                        className="hidden"
                      />
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${settings.reportCardsActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                    <div>
                      <span className="font-black text-xs uppercase tracking-widest text-slate-800 block">Behavioral Editing</span>
                      <span className="text-[10px] text-slate-500 font-bold">Allow teachers to edit historical records.</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.behavioralEditEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={settings.behavioralEditEnabled}
                        onChange={(e) => updateSettings({ behavioralEditEnabled: e.target.checked })}
                        className="hidden"
                      />
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${settings.behavioralEditEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="relative z-10">
                <h4 className="font-black text-xs uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                  <Cloud className="w-4 h-4" /> Cloud Infrastructure Status
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Users</p>
                    <p className="text-2xl font-black">{users.length}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subjects</p>
                    <p className="text-2xl font-black">{subjects.length}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assessments</p>
                    <p className="text-2xl font-black">{assessments.length}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Marks</p>
                    <p className="text-2xl font-black">{cceMarks.length}</p>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={forceCloudRefresh}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-white/10"
                  >
                    <RefreshCw className="w-4 h-4" /> Force Cloud Resync
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Assessment Activity Log</h3>
                <p className="text-xs text-slate-500 mt-1">History of configuration changes for spiritual and behavioral assessments.</p>
              </div>
              <Cloud className="w-6 h-6 text-slate-300" />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Admin</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Active Months</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assessmentLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{new Date(log.timestamp).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {log.adminName.charAt(0)}
                          </div>
                          <p className="text-xs font-medium text-slate-600">{log.adminName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {log.months.length > 0 ? log.months.map(m => (
                            <span key={m} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded border border-slate-200">
                              {m.substring(0, 3)}
                            </span>
                          )) : (
                            <span className="text-[10px] text-slate-400 italic font-bold">ALL MONTHS (DEFAULT)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {assessmentLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                        No activity logs recorded yet. Changes to active months will appear here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2 text-white">Welcome to the Campus Portal Guide</h3>
                <p className="text-indigo-100 max-w-2xl text-sm leading-relaxed">
                  This tutorial center provides a complete breakdown of how to manage your campus, from importing students to generating professional PDF reports. Use the categories below to master the system.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-3">1. User & Directory Setup</h4>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <span className="font-bold text-blue-600">Step 1:</span>
                    <p>Go to <strong>User Directory</strong>. Add users manually or use <strong>Excel Bulk Import</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-blue-600">Step 2:</span>
                    <p>Download the template to ensure headers match. Assign <strong>Mentors</strong> in the Mentors tab.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-blue-600">Step 3:</span>
                    <p>Ensure each student has a Class and Section assigned for correct reporting.</p>
                  </div>
                </div>
              </div>

              {/* Category 2: Assessments */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-3">2. Assessment Configuration</h4>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <span className="font-bold text-emerald-600">Setup:</span>
                    <p>Configure categories and questions in <strong>Assessment Setup</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-emerald-600">Options:</span>
                    <p>You can now add <strong>Custom Options</strong> (e.g., A, B, C) for each question.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-emerald-600">Visibility:</span>
                    <p>Use the toggle switch to enable/disable questions for students and teachers.</p>
                  </div>
                </div>
              </div>

              {/* Category 3: CCE Marks */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-3">3. Academic CCE Marks</h4>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <span className="font-bold text-amber-600">Entry:</span>
                    <p>Go to <strong>CCE Marks Entry</strong>. Select Class and Subject to start.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-amber-600">Reports:</span>
                    <p>CCE marks are automatically aggregated into the final report card.</p>
                  </div>
                </div>
              </div>

              {/* Category 4: Reports */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center mb-4">
                  <Printer className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 mb-3">4. PDF Generation</h4>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <span className="font-bold text-rose-600">Layout:</span>
                    <p>Reports are optimized for <strong>A4 Print</strong> with wrapped text for long subject names.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-rose-600">Order:</span>
                    <p>Reports now show <strong>Conduct/Wellbeing</strong> marks first, followed by CCE.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Common Troubleshooting (FAQ)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div>
                  <p className="font-bold text-xs uppercase text-slate-400 mb-1">Q: Student can't see the assessment?</p>
                  <p className="text-sm text-slate-600">A: Ensure the questions are set to "Active" in the Assessment tab and the student is assigned to the correct class.</p>
                </div>
                <div>
                  <p className="font-bold text-xs uppercase text-slate-400 mb-1">Q: Data is not showing up?</p>
                  <p className="text-sm text-slate-600">A: Click the <strong>Force Sync</strong> button in the top right to refresh the connection to the cloud database.</p>
                </div>
                <div>
                  <p className="font-bold text-xs uppercase text-slate-400 mb-1">Q: How to reset passwords?</p>
                  <p className="text-sm text-slate-600">A: Use the <strong>Edit</strong> button in the User Directory to manually update any user's password.</p>
                </div>
                <div>
                  <p className="font-bold text-xs uppercase text-slate-400 mb-1">Q: Can I use this on a phone?</p>
                  <p className="text-sm text-slate-600">A: Yes! The portal is fully responsive. For the best experience, click "Install Portal App" to add it to your home screen.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Edit User Details: {editingUser.name}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                updateUser(editingUser.id, {
                  name: editName,
                  role: editRole,
                  admissionNumber: editAdmission,
                  classGrade: editClassGrade,
                  section: editSection,
                  password: editPassword
                });
                setEditingUser(null);
                alert('User details updated successfully!');
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editName || ''} 
                    onChange={(e) => setEditName(e.target.value)} 
                    required 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'student' | 'teacher' | 'admin')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Admission Number</label>
                  <input 
                    type="text" 
                    value={editAdmission || ''} 
                    onChange={(e) => setEditAdmission(e.target.value)} 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Class Grade</label>
                    <input 
                      type="text" 
                      value={editClassGrade || ''} 
                      onChange={(e) => setEditClassGrade(e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Section</label>
                    <input 
                      type="text" 
                      value={editSection || ''} 
                      onChange={(e) => setEditSection(e.target.value)} 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
                  <input 
                    type="text" 
                    value={editPassword || ''} 
                    onChange={(e) => setEditPassword(e.target.value)} 
                    required 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-bold shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
