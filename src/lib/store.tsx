import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Question, Assessment, CCEMark, CampusSettings, SubjectConfig } from '../types';

interface DatabaseState {
  settings: CampusSettings;
  users: User[];
  questions: Question[];
  assessments: Assessment[];
  cceMarks: CCEMark[];
  subjects: SubjectConfig[];
}

interface AuthState {
  currentUser: User | null;
  originalAdminId: string | null;
  login: (userId: string) => void;
  logout: () => void;
  impersonate: (userId: string) => void;
  stopImpersonating: () => void;
}

interface DatabaseContextType extends DatabaseState, AuthState {
  updateSettings: (settings: Partial<CampusSettings>) => void;
  addQuestion: (q: Omit<Question, 'id'>) => void;
  deleteQuestion: (id: string) => void;
  addAssessment: (a: Omit<Assessment, 'id' | 'date'>) => void;
  addCCEMarks: (marks: Omit<CCEMark, 'id'>[]) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  addUsers: (users: Omit<User, 'id'>[]) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUsers: (userIds: string[]) => void;
  addSubject: (s: Omit<SubjectConfig, 'id'>) => void;
  addSubjects: (subjects: Omit<SubjectConfig, 'id'>[]) => void;
  deleteSubject: (id: string) => void;
  deleteCCEMark: (id: string) => void;
}

const defaultSettings: CampusSettings = {
  name: "Darul Huda Punganur",
  logoUrl: "/src/assets/images/darul_huda_logo_1786782663440.jpg",
  assessmentsActive: true,
  reportCardsActive: false,
  academicYear: "2026-2027",
  currentSemester: "Rabee Sem",
  spiritualFields: ['Prayers', 'Compassion'],
  behaviouralFields: ['Discipline', 'Collaboration']
};

const defaultUsers: User[] = [
  { id: 'admin1', role: 'admin', name: 'Campus Admin', password: 'password123' },
  { id: 'teacher1', role: 'teacher', name: 'Mr. Smith', classGrade: '10', section: 'A', password: 'password123' },
  { id: 'teacher2', role: 'teacher', name: 'Mrs. Davis', classGrade: '10', section: 'B', password: 'password123' },
  { 
    id: 'student1', 
    role: 'student', 
    name: 'Alice Johnson', 
    admissionNumber: 'ADM-001', 
    classGrade: '10', 
    section: 'A', 
    password: 'password123',
    attendance: 96,
    semesterHistory: [
      { semester: 'Shawwal 2025', academicScore: 82, attendance: 93 },
      { semester: 'Dhul-Qadah 2025', academicScore: 86, attendance: 95 },
      { semester: 'Muharram 2026', academicScore: 89, attendance: 97 },
      { semester: 'Safar 2026', academicScore: 92, attendance: 96 },
    ]
  },
  { 
    id: 'student2', 
    role: 'student', 
    name: 'Bob Williams', 
    admissionNumber: 'ADM-002', 
    classGrade: '10', 
    section: 'A', 
    password: 'password123',
    attendance: 91,
    semesterHistory: [
      { semester: 'Shawwal 2025', academicScore: 74, attendance: 88 },
      { semester: 'Dhul-Qadah 2025', academicScore: 78, attendance: 90 },
      { semester: 'Muharram 2026', academicScore: 81, attendance: 89 },
      { semester: 'Safar 2026', academicScore: 84, attendance: 92 },
    ]
  },
  { 
    id: 'student3', 
    role: 'student', 
    name: 'Charlie Brown', 
    admissionNumber: 'ADM-003', 
    classGrade: '10', 
    section: 'B', 
    password: 'password123',
    attendance: 94,
    semesterHistory: [
      { semester: 'Shawwal 2025', academicScore: 80, attendance: 91 },
      { semester: 'Dhul-Qadah 2025', academicScore: 83, attendance: 94 },
      { semester: 'Muharram 2026', academicScore: 85, attendance: 93 },
      { semester: 'Safar 2026', academicScore: 88, attendance: 95 },
    ]
  },
];

const defaultQuestions: Question[] = [
  { id: 'q1', category: 'spiritual', field: 'Prayers', text: 'Participates in daily reflections/prayers' },
  { id: 'q2', category: 'spiritual', field: 'Compassion', text: 'Demonstrates compassion and empathy towards peers' },
  { id: 'q3', category: 'behavioural', field: 'Discipline', text: 'Follows classroom rules and instructions' },
  { id: 'q4', category: 'behavioural', field: 'Collaboration', text: 'Works collaboratively in group activities' },
];

const defaultSubjects: SubjectConfig[] = [
  { id: 'sub1', classGrade: '10', name: 'Mathematics' },
  { id: 'sub2', classGrade: '10', name: 'Science' },
  { id: 'sub3', classGrade: '10', name: 'English' },
];

const StoreContext = createContext<DatabaseContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DatabaseState>(() => {
    const saved = localStorage.getItem('campus_db');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old data
      if (parsed.examMarks) {
        parsed.cceMarks = parsed.examMarks.map((m: any) => ({
          ...m,
          score: m.percentage,
          maxScore: 100,
          date: new Date().toISOString()
        }));
        delete parsed.examMarks;
      }
      if (!parsed.settings) {
        parsed.settings = defaultSettings;
      }
      if (parsed.settings && parsed.settings.assessmentFields) {
        // Simple migration of fields
        parsed.settings.spiritualFields = parsed.settings.spiritualFields || ['Prayers', 'Compassion'];
        parsed.settings.behaviouralFields = parsed.settings.behaviouralFields || ['Discipline', 'Collaboration'];
        delete parsed.settings.assessmentFields;
      }
      if (!parsed.subjects) {
        parsed.subjects = defaultSubjects;
      }
      // Migrate questions
      if (parsed.questions && parsed.questions.length > 0 && typeof parsed.questions[0].category === 'string') {
        parsed.questions = parsed.questions.map((q: any) => {
          if (q.category === 'Spiritual Wellbeing' || q.category === 'spiritual') {
            return { ...q, category: 'spiritual', field: q.field || 'General' };
          }
          if (q.category === 'Behavioural Conduct' || q.category === 'behavioural') {
            return { ...q, category: 'behavioural', field: q.field || 'General' };
          }
          return { ...q, category: 'behavioural', field: q.category }; // Fallback
        });
      }
      return parsed;
    }
    return {
      settings: defaultSettings,
      users: defaultUsers,
      questions: defaultQuestions,
      assessments: [],
      cceMarks: [],
      subjects: defaultSubjects,
    };
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('campus_auth');
    if (saved) return JSON.parse(saved);
    return null;
  });

  const [originalAdminId, setOriginalAdminId] = useState<string | null>(() => {
    const saved = localStorage.getItem('campus_original_admin');
    if (saved) return JSON.parse(saved);
    return null;
  });

  useEffect(() => {
    localStorage.setItem('campus_db', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('campus_auth', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('campus_auth');
    }
  }, [currentUser]);

  useEffect(() => {
    if (originalAdminId) {
      localStorage.setItem('campus_original_admin', JSON.stringify(originalAdminId));
    } else {
      localStorage.removeItem('campus_original_admin');
    }
  }, [originalAdminId]);

  const login = (userId: string) => {
    const user = data.users.find((u) => u.id === userId);
    if (user) setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    setOriginalAdminId(null);
  };

  const impersonate = (userId: string) => {
    if (currentUser?.role === 'admin') {
      setOriginalAdminId(currentUser.id);
      const targetUser = data.users.find((u) => u.id === userId);
      if (targetUser) setCurrentUser(targetUser);
    }
  };

  const stopImpersonating = () => {
    if (originalAdminId) {
      const admin = data.users.find((u) => u.id === originalAdminId);
      if (admin) setCurrentUser(admin);
      setOriginalAdminId(null);
    }
  };

  const addUser = (u: Omit<User, 'id'>) => {
    const newUser = { ...u, id: `${u.role}_${Date.now()}` };
    setData((prev) => ({ ...prev, users: [...prev.users, newUser] }));
  };

  const addUsers = (newUsersList: Omit<User, 'id'>[]) => {
    const newUsers = newUsersList.map((u, i) => ({ ...u, id: `${u.role}_${Date.now()}_${i}` }));
    setData((prev) => ({ ...prev, users: [...prev.users, ...newUsers] }));
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u)
    }));
  };

  const deleteUsers = (userIds: string[]) => {
    setData((prev) => ({ ...prev, users: prev.users.filter(u => !userIds.includes(u.id)) }));
  };

  const updateSettings = (updates: Partial<CampusSettings>) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  };

  const addQuestion = (q: Omit<Question, 'id'>) => {
    const newQ = { ...q, id: `q${Date.now()}` };
    setData((prev) => ({ ...prev, questions: [...prev.questions, newQ] }));
  };

  const deleteQuestion = (id: string) => {
    setData((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== id) }));
  };

  const addSubject = (s: Omit<SubjectConfig, 'id'>) => {
    const newS = { ...s, id: `sub${Date.now()}` };
    setData((prev) => ({ ...prev, subjects: [...prev.subjects || [], newS] }));
  };

  const addSubjects = (newSubjectsList: Omit<SubjectConfig, 'id'>[]) => {
    const newSubjects = newSubjectsList.map((s, i) => ({ ...s, id: `sub${Date.now()}_${i}` }));
    setData((prev) => ({ ...prev, subjects: [...prev.subjects || [], ...newSubjects] }));
  };

  const deleteSubject = (id: string) => {
    setData((prev) => ({ ...prev, subjects: (prev.subjects || []).filter((s) => s.id !== id) }));
  };

  const addAssessment = (a: Omit<Assessment, 'id' | 'date'>) => {
    const newA = { ...a, id: `a${Date.now()}`, date: new Date().toISOString() };
    setData((prev) => {
      // Remove previous assessment from the same assessor for the same student and category
      const filtered = prev.assessments.filter(
        (existing) => 
          !(existing.studentId === a.studentId && 
            existing.assessorId === a.assessorId && 
            existing.category === a.category)
      );
      return { ...prev, assessments: [...filtered, newA] };
    });
  };

  const addCCEMarks = (marks: Omit<CCEMark, 'id'>[]) => {
    // Delete existing marks for these students/subjects/levels/months before adding
    setData((prev) => {
      let filteredMarks = [...prev.cceMarks];
      for (const m of marks) {
        filteredMarks = filteredMarks.filter(existing => 
          !(existing.studentId === m.studentId && existing.subject === m.subject && existing.cceLevel === m.cceLevel && existing.month === m.month)
        );
      }
      
      const newMarks = marks.map((m, i) => ({ ...m, id: `m${Date.now()}_${i}` }));
      return { ...prev, cceMarks: [...filteredMarks, ...newMarks] };
    });
  };

  const deleteCCEMark = (id: string) => {
    setData((prev) => ({ ...prev, cceMarks: prev.cceMarks.filter((m) => m.id !== id) }));
  };

  return (
    <StoreContext.Provider
      value={{
        ...data,
        currentUser,
        originalAdminId,
        login,
        logout,
        impersonate,
        stopImpersonating,
        addQuestion,
        deleteQuestion,
        addAssessment,
        addCCEMarks,
        addUser,
        addUsers,
        updateUser,
        deleteUsers,
        updateSettings,
        addSubject,
        addSubjects,
        deleteSubject,
        deleteCCEMark
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
