import React, { useState } from 'react';
import { Layout } from '../components/ui/Layout';
import { useStore } from '../lib/store';
import { Upload, Plus, Trash2, FileSpreadsheet, Users, UserPlus, Eye, FileText, Settings as SettingsIcon, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { CCEMarksManager } from '../components/CCEMarksManager';

export default function AdminDashboard() {
  const { questions, addQuestion, deleteQuestion, users, addUser, addUsers, updateUser, deleteUsers, impersonate, settings, updateSettings, subjects, addSubject, addSubjects, deleteSubject, assessments, cceMarks } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'assessments' | 'users' | 'cce' | 'reports' | 'settings'>('users');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [cceClassFilters, setCceClassFilters] = useState({ classGrade: '', section: '', subject: '', cceLevel: '' });

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState<'spiritual' | 'behavioural'>('spiritual');
  const [newQuestionField, setNewQuestionField] = useState('');
  const [newFieldText, setNewFieldText] = useState('');
  const [newFieldCategory, setNewFieldCategory] = useState<'spiritual' | 'behavioural'>('spiritual');
  
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

  const teachers = users.filter(u => u.role === 'teacher');

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !newQuestionField) return;
    addQuestion({ 
      text: newQuestionText, 
      category: newQuestionCategory,
      field: newQuestionField
    });
    setNewQuestionText('');
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldText.trim()) return;
    
    const fieldType = newFieldCategory === 'spiritual' ? 'spiritualFields' : 'behaviouralFields';
    const currentFields = settings[fieldType] || [];
    
    if (!currentFields.includes(newFieldText.trim())) {
      updateSettings({ [fieldType]: [...currentFields, newFieldText.trim()] });
    }
    setNewQuestionField(newFieldText.trim());
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

        const newUsersToBulkAdd = json.map(row => ({
          name: row.Name || row.name || 'Unknown',
          role: (row.Role || row.role || 'student').toLowerCase() as 'student' | 'teacher' | 'admin',
          password: row.Password || row.password || 'password123',
          classGrade: row.ClassGrade || row.classGrade || row.Class || row.class ? String(row.ClassGrade || row.classGrade || row.Class || row.class) : undefined,
          section: row.Section || row.section ? String(row.Section || row.section) : undefined,
          admissionNumber: row.AdmissionNumber || row.admissionNumber || row.ID || row.id ? String(row.AdmissionNumber || row.admissionNumber || row.ID || row.id) : undefined,
        }));

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

        const newSubjectsToBulkAdd = json.map(row => ({
          name: row.Subject || row.subject || row.Name || row.name || 'Unknown Subject',
          classGrade: row.ClassGrade || row.classGrade || row.Class || row.class ? String(row.ClassGrade || row.classGrade || row.Class || row.class) : 'Unknown Grade',
          section: row.Section || row.section ? String(row.Section || row.section) : undefined,
        }));

        const validSubjects = newSubjectsToBulkAdd.filter(s => s.name !== 'Unknown Subject' && s.classGrade !== 'Unknown Grade');
        
        if (validSubjects.length > 0) {
          addSubjects(validSubjects);
          alert(`Successfully imported ${validSubjects.length} subjects!`);
        } else {
          alert('No valid subjects found in the Excel file. Please ensure columns include ClassGrade and Subject.');
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

  const visibleUsers = users.filter(u => u.role !== 'admin');
  
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

  const filteredCceStudents = users.filter(u => 
    u.role === 'student' && 
    u.classGrade === cceClassFilters.classGrade && 
    (cceClassFilters.section ? u.section === cceClassFilters.section : true)
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-sm text-slate-400 uppercase font-bold tracking-wider">Admin Portal</h2>
          <h3 className="text-2xl font-bold text-slate-800">Campus Management</h3>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            User Directory
          </button>
          <button 
            onClick={() => setActiveTab('assessments')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'assessments' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            Assessments & Subjects
          </button>
          <button 
            onClick={() => setActiveTab('cce')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'cce' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            Enter CCE Marks
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'reports' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            Class Reports
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-700 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            Campus Settings
          </button>
        </div>

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
                    <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  {newUserRole === 'student' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Admission Number</label>
                      <input type="text" value={newUserAdmission} onChange={(e) => setNewUserAdmission(e.target.value)} required className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. ADM-001" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                    <input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Class Grade</label>
                      <input type="text" value={newUserClassGrade} onChange={(e) => setNewUserClassGrade(e.target.value)} className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. 10" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Section</label>
                      <input type="text" value={newUserSection} onChange={(e) => setNewUserSection(e.target.value)} className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. A" />
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
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
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
                    {visibleUsers.map(u => (
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-700"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Assessment Categories & Fields</h3>
                
                <form onSubmit={handleAddField} className="mb-6 space-y-4 pb-6 border-b border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <select 
                        value={newFieldCategory}
                        onChange={(e) => setNewFieldCategory(e.target.value as any)}
                        className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="spiritual">Spiritual Wellbeing</option>
                        <option value="behavioural">Behavioural Conduct</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Field Name</label>
                      <input type="text" value={newFieldText} onChange={(e) => setNewFieldText(e.target.value)} placeholder="E.g., Prayers, Discipline" className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-800 text-white py-2 px-4 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Field to Category
                  </button>
                </form>

                <form onSubmit={handleAddQuestion} className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Select Category</label>
                      <select 
                        value={newQuestionCategory}
                        onChange={(e) => {
                          setNewQuestionCategory(e.target.value as any);
                          setNewQuestionField('');
                        }}
                        className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="spiritual">Spiritual Wellbeing</option>
                        <option value="behavioural">Behavioural Conduct</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Select Field</label>
                      <select 
                        value={newQuestionField}
                        onChange={(e) => setNewQuestionField(e.target.value)}
                        className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">-- Select Field --</option>
                        {(newQuestionCategory === 'spiritual' ? settings.spiritualFields : settings.behaviouralFields)?.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Question / Criteria Text</label>
                    <input type="text" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder="E.g., Follows classroom rules" className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <button type="submit" className="w-full bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Question to Field
                  </button>
                </form>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Class Subjects</h3>
                <form onSubmit={handleAddSubject} className="mb-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Class Grade</label>
                      <input type="text" value={newSubjectGrade} onChange={(e) => setNewSubjectGrade(e.target.value)} placeholder="E.g., 10" className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Section (Opt.)</label>
                      <input type="text" value={newSubjectSection} onChange={(e) => setNewSubjectSection(e.target.value)} placeholder="E.g., A" className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                    <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="E.g., Mathematics" className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" required />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Subject
                  </button>
                </form>

                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-600" /> Bulk Import Subjects
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">Upload an Excel (.xlsx) file with columns: ClassGrade, Section (optional), Subject.</p>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleSubjectFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-xl p-3 text-center hover:bg-emerald-100 transition-colors">
                      <span className="text-sm font-bold text-emerald-700 block">
                        {uploadStatus || 'Click or drag Excel file here'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">Current Questions Directory</h4>
                <div className="space-y-3">
                  {questions.map(q => (
                    <div key={q.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="flex gap-2 mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {q.category}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {q.field}
                          </span>
                        </div>
                        <span className="text-sm text-slate-700 block font-medium">{q.text}</span>
                      </div>
                      <button onClick={() => deleteQuestion(q.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {questions.length === 0 && (
                    <p className="text-sm text-slate-500">No questions configured.</p>
                  )}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">Current Subjects Directory</h4>
                <div className="space-y-3">
                  {subjects?.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full mr-2">
                          Grade {s.classGrade} {s.section ? `• Sec ${s.section}` : ''}
                        </span>
                        <span className="text-sm text-slate-700 font-medium">{s.name}</span>
                      </div>
                      <button onClick={() => deleteSubject(s.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!subjects || subjects.length === 0) && (
                    <p className="text-sm text-slate-500">No subjects configured.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cce' && (
          <CCEMarksManager />
        )}

        {activeTab === 'reports' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Class Performance Reports
            </h3>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Grade</label>
                <input 
                  type="text" 
                  value={cceClassFilters.classGrade} 
                  onChange={(e) => setCceClassFilters({...cceClassFilters, classGrade: e.target.value})}
                  placeholder="E.g., 10"
                  className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                <input 
                  type="text" 
                  value={cceClassFilters.section} 
                  onChange={(e) => setCceClassFilters({...cceClassFilters, section: e.target.value})}
                  placeholder="E.g., A"
                  className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
            </div>

            {filteredCceStudents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-700">Master Sheet: Grade {cceClassFilters.classGrade} - Section {cceClassFilters.section}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2 rounded-lg transition-colors">
                      <Printer className="w-4 h-4" /> Print Sheet
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Student Name</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Total CCE %</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Spiritual %</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Behavioural %</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredCceStudents.map(student => {
                        // Calculate stats for this student
                        const studentMarks = cceMarks.filter(m => m.studentId === student.id);
                        const totalScore = studentMarks.reduce((sum, m) => sum + m.score, 0);
                        const totalMax = studentMarks.reduce((sum, m) => sum + m.maxScore, 0);
                        const ccePercentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

                        const spiritualAssessments = assessments.filter(a => a.studentId === student.id && a.category === 'spiritual');
                        const behaviouralAssessments = assessments.filter(a => a.studentId === student.id && a.category === 'behavioural');
                        
                        const getAvg = (assessments: any[]) => {
                          if (assessments.length === 0) return 0;
                          const latest = assessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                          const scores = Object.values(latest.scores) as number[];
                          if (scores.length === 0) return 0;
                          return scores.reduce((a, b) => a + b, 0) / scores.length;
                        };

                        const spiritualAvg = getAvg(spiritualAssessments);
                        const behaviouralAvg = getAvg(behaviouralAssessments);

                        return (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-sm font-bold text-slate-800">{student.name}</td>
                            <td className="px-6 py-3 text-sm text-slate-500 font-medium">{student.admissionNumber || 'N/A'}</td>
                            <td className="px-6 py-3 text-sm font-bold">{ccePercentage > 0 ? `${ccePercentage.toFixed(1)}%` : '-'}</td>
                            <td className="px-6 py-3 text-sm font-bold">{spiritualAvg > 0 ? `${spiritualAvg.toFixed(1)}%` : '-'}</td>
                            <td className="px-6 py-3 text-sm font-bold">{behaviouralAvg > 0 ? `${behaviouralAvg.toFixed(1)}%` : '-'}</td>
                            <td className="px-6 py-3 text-sm">
                              <button onClick={() => navigate(`/report/${student.id}`)} className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                                <FileText className="w-4 h-4" /> View Report
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-slate-700" /> Campus Settings
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                  <input 
                    type="text" 
                    value={settings.academicYear || ''} 
                    onChange={(e) => updateSettings({ academicYear: e.target.value })}
                    placeholder="E.g., 2026-2027"
                    className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-slate-500 focus:border-slate-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Semester</label>
                  <select
                    value={settings.currentSemester || ''}
                    onChange={(e) => updateSettings({ currentSemester: e.target.value })}
                    className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="Rabee Sem">Rabee Sem</option>
                    <option value="Ramadan Sem">Ramadan Sem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campus Name</label>
                <input 
                  type="text" 
                  value={settings.name} 
                  onChange={(e) => updateSettings({ name: e.target.value })}
                  className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-slate-500 focus:border-slate-500" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campus Logo</label>
                <div className="flex items-center gap-4">
                  {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo Preview" className="w-12 h-12 rounded object-cover border border-slate-200" />
                  )}
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      value={settings.logoUrl || ''} 
                      onChange={(e) => updateSettings({ logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-slate-500 focus:border-slate-500" 
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
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                        Or click here to upload an image from your device
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm mb-4">Module Toggles</h4>
                
                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors mb-3">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Assessment Window</span>
                    <span className="text-xs text-slate-500">Enable behavioural and spiritual assessment forms for students and teachers.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.assessmentsActive}
                    onChange={(e) => updateSettings({ assessmentsActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Report Cards Release</span>
                    <span className="text-xs text-slate-500">Allow students to view and download their official report cards.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.reportCardsActive}
                    onChange={(e) => updateSettings({ reportCardsActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Portal Mobile App (PWA)</h4>
                <p className="text-xs text-slate-500 mb-3">
                  This portal is configured as an installable Progressive Web Application (PWA). Students, teachers, and admins can install it directly to their Android phone, iPhone (iOS Safari), tablet, or desktop computer.
                </p>
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-400">Installable on all devices</p>
                    <p className="text-[11px] text-slate-300">Click the "Install Portal App" button in the sidebar or launch in a full browser tab.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-sm"
                  >
                    Open Standalone
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
