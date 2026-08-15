import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Question, Assessment, CCEMark, CampusSettings, SubjectConfig } from '../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  writeBatch,
  getDocs,
  limit
} from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';

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
  loading: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  forceCloudRefresh: () => Promise<void>;
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
  name: "Grand Campus Assurance Portal",
  logoUrl: "/favicon.png",
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
  // Use React-Firebase-Hooks for real-time data
  const [users, loadingUsers] = useCollectionData<User>(collection(db, 'users') as any);
  const [questions, loadingQuestions] = useCollectionData<Question>(collection(db, 'questions') as any);
  const [assessments, loadingAssessments] = useCollectionData<Assessment>(collection(db, 'assessments') as any);
  const [cceMarks, loadingMarks] = useCollectionData<CCEMark>(collection(db, 'cceMarks') as any);
  const [subjects, loadingSubjects] = useCollectionData<SubjectConfig>(collection(db, 'subjects') as any);
  
  const [settings, setSettings] = useState<CampusSettings>(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);

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

  // Load settings separately as it's a single document
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsub = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as CampusSettings);
      } else {
        // Initialize settings if not exists
        setDoc(settingsRef, defaultSettings);
      }
      setLoadingSettings(false);
    });
    return () => unsub();
  }, []);

  // One-time migration from LocalStorage to Firestore if Firestore is empty
  useEffect(() => {
    async function migrateIfNeeded() {
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(1)));
      if (usersSnapshot.empty) {
        console.log('Firestore is empty. Checking for migration data...');
        const saved = localStorage.getItem('campus_db');
        let initialData: DatabaseState;

        if (saved) {
          initialData = JSON.parse(saved);
        } else {
          initialData = {
            settings: defaultSettings,
            users: defaultUsers,
            questions: defaultQuestions,
            assessments: [],
            cceMarks: [],
            subjects: defaultSubjects,
          };
        }

        const batch = writeBatch(db);
        
        initialData.users.forEach(u => batch.set(doc(db, 'users', u.id), u));
        initialData.questions.forEach(q => batch.set(doc(db, 'questions', q.id), q));
        initialData.subjects.forEach(s => batch.set(doc(db, 'subjects', s.id), s));
        initialData.assessments.forEach(a => batch.set(doc(db, 'assessments', a.id), a));
        initialData.cceMarks.forEach(m => batch.set(doc(db, 'cceMarks', m.id), m));
        batch.set(doc(db, 'settings', 'global'), initialData.settings);

        await batch.commit();
        console.log('Migration to Firestore complete.');
      }
    }
    
    if (!loadingSettings) {
      migrateIfNeeded();
    }
  }, [loadingSettings]);

  const loading = loadingUsers || loadingQuestions || loadingAssessments || loadingMarks || loadingSubjects || loadingSettings;
  const syncStatus = loading ? 'syncing' : (navigator.onLine ? 'synced' : 'offline');

  const forceCloudRefresh = async () => {
    // This will trigger the service worker to clear caches and the page to reload
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }
    localStorage.removeItem('campus_db'); // Clear local migration cache if any
    window.location.reload();
  };

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
    const user = users?.find((u) => u.id === userId);
    if (user) setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    setOriginalAdminId(null);
  };

  const impersonate = (userId: string) => {
    if (currentUser?.role === 'admin') {
      setOriginalAdminId(currentUser.id);
      const targetUser = users?.find((u) => u.id === userId);
      if (targetUser) setCurrentUser(targetUser);
    }
  };

  const stopImpersonating = () => {
    if (originalAdminId) {
      const admin = users?.find((u) => u.id === originalAdminId);
      if (admin) setCurrentUser(admin);
      setOriginalAdminId(null);
    }
  };

  const addUser = (u: Omit<User, 'id'>) => {
    const id = `${u.role}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setDoc(doc(db, 'users', id), { ...u, id });
  };

  const addUsers = async (newUsersList: Omit<User, 'id'>[]) => {
    const batch = writeBatch(db);
    newUsersList.forEach((u, i) => {
      const id = `${u.role}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(db, 'users', id), { ...u, id });
    });
    await batch.commit();
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    const userRef = doc(db, 'users', userId);
    setDoc(userRef, updates, { merge: true });
    
    // Update current user if it's the one being updated
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUsers = async (userIds: string[]) => {
    const batch = writeBatch(db);
    userIds.forEach(id => batch.delete(doc(db, 'users', id)));
    await batch.commit();
  };

  const updateSettings = (updates: Partial<CampusSettings>) => {
    setDoc(doc(db, 'settings', 'global'), updates, { merge: true });
  };

  const addQuestion = (q: Omit<Question, 'id'>) => {
    const id = `q${Date.now()}`;
    setDoc(doc(db, 'questions', id), { ...q, id });
  };

  const deleteQuestion = (id: string) => {
    deleteDoc(doc(db, 'questions', id));
  };

  const addSubject = (s: Omit<SubjectConfig, 'id'>) => {
    const id = `sub${Date.now()}`;
    setDoc(doc(db, 'subjects', id), { ...s, id });
  };

  const addSubjects = async (newSubjectsList: Omit<SubjectConfig, 'id'>[]) => {
    const batch = writeBatch(db);
    newSubjectsList.forEach((s, i) => {
      const id = `sub${Date.now()}_${i}`;
      batch.set(doc(db, 'subjects', id), { ...s, id });
    });
    await batch.commit();
  };

  const deleteSubject = (id: string) => {
    deleteDoc(doc(db, 'subjects', id));
  };

  const addAssessment = (a: Omit<Assessment, 'id' | 'date'>) => {
    const id = `a${Date.now()}`;
    const newA = { ...a, id, date: new Date().toISOString() };
    
    // In Firestore, we don't necessarily need to "delete" first if we use structured IDs, 
    // but the current logic replaces. We can just use a calculated ID to overwrite or just add.
    // For consistency with existing behavior:
    const existing = assessments?.find(
      (existing) => 
        existing.studentId === a.studentId && 
        existing.assessorId === a.assessorId && 
        existing.category === a.category
    );
    
    if (existing) {
      deleteDoc(doc(db, 'assessments', existing.id));
    }
    setDoc(doc(db, 'assessments', id), newA);
  };

  const addCCEMarks = async (marks: Omit<CCEMark, 'id'>[]) => {
    const batch = writeBatch(db);
    
    // Find duplicates in local state to delete from Firestore
    marks.forEach(m => {
      const existing = cceMarks?.find(e => 
        e.studentId === m.studentId && e.subject === m.subject && e.cceLevel === m.cceLevel && e.month === m.month
      );
      if (existing) {
        batch.delete(doc(db, 'cceMarks', existing.id));
      }
      const id = `m${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      batch.set(doc(db, 'cceMarks', id), { ...m, id });
    });
    
    await batch.commit();
  };

  const deleteCCEMark = (id: string) => {
    deleteDoc(doc(db, 'cceMarks', id));
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        users: users || [],
        questions: questions || [],
        assessments: assessments || [],
        cceMarks: cceMarks || [],
        subjects: subjects || [],
        loading,
        syncStatus,
        forceCloudRefresh,
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
