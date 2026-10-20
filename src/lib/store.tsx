import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Question, Assessment, CCEMark, CampusSettings, SubjectConfig, AssessmentLogEntry, MentorInsight, SkillClubMark, TaskTemplate, StudentTask } from '../types';
import { matchesMonth, getAcademicMonthForDate, isMonthOver } from './utils';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  writeBatch,
  getDoc,
  getDocs,
  limit,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

function cleanData(obj: any) {
  if (Array.isArray(obj)) {
    return obj.map(item => typeof item === 'object' && item !== null ? cleanData(item) : item);
  }
  if (typeof obj !== 'object' || obj === null) return obj;

  const clean: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean[key] = cleanData(obj[key]);
      } else {
        clean[key] = obj[key];
      }
    }
  });
  return clean;
}

interface DatabaseState {
  settings: CampusSettings;
  users: User[];
  questions: Question[];
  assessments: Assessment[];
  cceMarks: CCEMark[];
  subjects: SubjectConfig[];
  assessmentLogs: AssessmentLogEntry[];
  mentorInsights: MentorInsight[];
  skillClubMarks: SkillClubMark[];
  taskTemplates: TaskTemplate[];
  studentTasks: StudentTask[];
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
  lastSyncTime: string | null;
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
  deleteSubjects: (subjectIds: string[]) => void;
  deleteCCEMark: (id: string) => void;
  toggleQuestion: (id: string, enabled: boolean) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  getAIInsights: (studentId: string, month: string) => Promise<MentorInsight>;
  addSkillClubMarks: (marks: Omit<SkillClubMark, 'id'>[]) => void;
  addTaskTemplate: (t: Omit<TaskTemplate, 'id'>) => void;
  deleteTaskTemplate: (id: string) => void;
  addStudentTask: (task: Omit<StudentTask, 'id' | 'date'>) => void;
  addStudentTasks: (tasks: Omit<StudentTask, 'id' | 'date'>[]) => void;
  deleteStudentTask: (id: string) => void;
  deleteStudentTasks: (ids: string[]) => void;
  deleteSkillClubMark: (id: string) => void;
}

const defaultSettings: CampusSettings = {
  name: "Grand Campus Assurance Portal",
  logoUrl: "/favicon.png",
  assessmentsActive: true,
  reportCardsActive: false,
  academicYear: "2026-2027",
  currentSemester: "Rabee Sem",
  currentAssessmentMonth: "August 2026",
  behavioralEditEnabled: false,
  autoAdvanceMonth: true,
  assessmentCategories: ['Spiritual Wellbeing', 'Behavioral Wellbeing'],
  categoryFields: {
    'Spiritual Wellbeing': ['Prayers', 'Compassion'],
    'Behavioral Wellbeing': ['Discipline', 'Collaboration']
  }
};

export const defaultUsers: User[] = [
  { id: 'admin1', role: 'admin', name: 'Campus Admin', password: 'password123' },
  { id: 'demo_teacher', role: 'teacher', name: 'Demo Teacher', classGrade: '10', section: 'A', password: 'password123' },
  { id: 'teacher1', role: 'teacher', name: 'Mr. Smith', classGrade: '10', section: 'A', password: 'password123' },
  { id: 'teacher2', role: 'teacher', name: 'Mrs. Davis', classGrade: '10', section: 'B', password: 'password123' },
  { 
    id: 'demo_student', 
    role: 'student', 
    name: 'Demo Student', 
    admissionNumber: 'DEMO-001', 
    classGrade: '10', 
    section: 'A', 
    password: 'password123',
    attendance: 100
  },
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
  { id: 'q1', category: 'Spiritual Wellbeing', field: 'Prayers', text: 'Participates in daily reflections/prayers', enabled: true },
  { id: 'q2', category: 'Spiritual Wellbeing', field: 'Compassion', text: 'Demonstrates compassion and empathy towards peers', enabled: true },
  { id: 'q3', category: 'Behavioral Wellbeing', field: 'Discipline', text: 'Follows classroom rules and instructions', enabled: true },
  { id: 'q4', category: 'Behavioral Wellbeing', field: 'Collaboration', text: 'Works collaboratively in group activities', enabled: true },
];

const defaultSubjects: SubjectConfig[] = [
  { id: 'sub1', classGrade: '10', name: 'Mathematics' },
  { id: 'sub2', classGrade: '10', name: 'Science' },
  { id: 'sub3', classGrade: '10', name: 'English' },
];

const StoreContext = createContext<DatabaseContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(defaultUsers);
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [cceMarks, setCceMarks] = useState<CCEMark[]>([]);
  const [subjects, setSubjects] = useState<SubjectConfig[]>(defaultSubjects);
  const [assessmentLogs, setAssessmentLogs] = useState<AssessmentLogEntry[]>([]);
  const [mentorInsights, setMentorInsights] = useState<MentorInsight[]>([]);
  const [skillClubMarks, setSkillClubMarks] = useState<SkillClubMark[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>([]);
  const [settings, setSettings] = useState<CampusSettings>(defaultSettings);
  
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');

  // Manual real-time listeners for absolute sync control
  useEffect(() => {
    // Immediate bypass check
    if (localStorage.getItem('campus_bypass_loading') === 'true') {
      console.warn('Emergency Bypass Active: Skipping Cloud Sync');
      localStorage.removeItem('campus_bypass_loading');
      setLoading(false);
      return;
    }

    console.log('Initializing Real-Time Cloud Listeners...');
    const loadedSources = new Set<string>();
    const totalCollections = 11; 

    const incrementLoaded = (source: string) => {
      loadedSources.add(source);
      console.log(`Cloud Data Source Ready: ${source} (${loadedSources.size}/${totalCollections})`);
      if (loadedSources.size >= totalCollections) {
        setLoading(false);
      }
    };

    const collections = [
      { name: 'users', setter: setUsers },
      { name: 'questions', setter: setQuestions },
      { name: 'assessments', setter: setAssessments },
      { name: 'cceMarks', setter: setCceMarks },
      { name: 'subjects', setter: setSubjects },
      { name: 'assessmentLogs', setter: setAssessmentLogs },
      { name: 'mentorInsights', setter: setMentorInsights },
      { name: 'skillClubMarks', setter: setSkillClubMarks },
      { name: 'taskTemplates', setter: setTaskTemplates },
      { name: 'studentTasks', setter: setStudentTasks }
    ];

    const handleSyncError = (source: string, err: any) => {
      console.warn(`Sync notification for ${source}:`, err?.code || err?.message || err);
      setSyncStatus('offline');
      // Ensure app loads from local persistence / defaults when offline
      incrementLoaded(source);
    };

    const unsubs = collections.map(col => 
      onSnapshot(collection(db, col.name), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
        console.log(`Syncing ${col.name}: ${docs.length} documents received.`);
        
        // Update state with whatever is in the cloud
        if (docs.length > 0 || ['assessments', 'cceMarks', 'studentTasks', 'assessmentLogs', 'mentorInsights', 'skillClubMarks', 'taskTemplates'].includes(col.name)) {
          col.setter(docs);
        } else {
          // If empty, we keep our local defaults for critical collections
          if (col.name === 'users') setUsers(defaultUsers);
          if (col.name === 'questions') setQuestions(defaultQuestions);
          if (col.name === 'subjects') setSubjects(defaultSubjects);
        }
        
        setLastSyncTime(new Date().toLocaleTimeString());
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
        incrementLoaded(col.name);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, col.name);
      })
    );

    const settingsRef = doc(db, 'settings', 'global');
    const unsubSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as CampusSettings;
        console.log('Global Settings Synced:', data.name);
        setSettings(data);
      }
      setLastSyncTime(new Date().toLocaleTimeString());
      incrementLoaded('settings');
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Sync taking longer than expected, allowing UI to start in offline mode...');
        setLoading(false);
      }
    }, 8000);

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubSettings();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('campus_auth');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [originalAdminId, setOriginalAdminId] = useState<string | null>(() => {
    const saved = localStorage.getItem('campus_original_admin');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

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

  const forceCloudRefresh = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }
    localStorage.clear(); 
    window.location.reload();
  };

  // Migration logic - Only run once when we are sure the cloud is empty
  useEffect(() => {
    async function migrateIfNeeded() {
      try {
        console.log('Checking Cloud Status...');
        // Use a timeout for the initial check to avoid getting stuck offline
        const settingsSnap = await getDoc(doc(db, 'settings', 'global')).catch(err => {
          console.warn('Initial cloud check failed (likely offline):', err.message);
          return null;
        });
        
        if (settingsSnap && !settingsSnap.exists()) {
          console.log('Cloud is empty. Initializing defaults...');
          const saved = localStorage.getItem('campus_db');
          
          if (saved) {
            const initialData: DatabaseState = JSON.parse(saved);
            const batch = writeBatch(db);
            
            initialData.users.forEach(u => batch.set(doc(db, 'users', u.id), cleanData(u)));
            initialData.questions.forEach(q => batch.set(doc(db, 'questions', q.id), cleanData(q)));
            initialData.subjects.forEach(s => batch.set(doc(db, 'subjects', s.id), cleanData(s)));
            initialData.assessments.forEach(a => batch.set(doc(db, 'assessments', a.id), cleanData(a)));
            initialData.cceMarks.forEach(m => batch.set(doc(db, 'cceMarks', m.id), cleanData(m)));
            batch.set(doc(db, 'settings', 'global'), cleanData(initialData.settings));
            
            await batch.commit();
            console.log('Migration successful.');
          } else {
            // No local data, just initialize defaults
            const batch = writeBatch(db);
            defaultUsers.forEach(u => batch.set(doc(db, 'users', u.id), cleanData(u)));
            defaultQuestions.forEach(q => batch.set(doc(db, 'questions', q.id), cleanData(q)));
            defaultSubjects.forEach(s => batch.set(doc(db, 'subjects', s.id), cleanData(s)));
            batch.set(doc(db, 'settings', 'global'), cleanData(defaultSettings));
            await batch.commit();
            console.log('Default seed successful.');
          }
        }
      } catch (err) {
        console.error('Migration check failed:', err);
      }
    }
    
    if (!loading) {
      migrateIfNeeded();
    }
  }, [loading]);

  // Automatic Month Rollover: If the current assessment month is over, automatically advance to current month
  useEffect(() => {
    if (loading) return;

    // Check if auto advancement is disabled explicitly
    if (settings.autoAdvanceMonth === false) return;

    const currentAssMonth = settings.currentAssessmentMonth;
    // Calculate what the academic month for today is
    const todayAcademic = getAcademicMonthForDate(new Date(), settings.academicYear);

    // If month is not set at all, initialize to current month
    if (!currentAssMonth) {
      console.log(`[Auto-Advance Month] Initializing month to: ${todayAcademic.fullMonth}`);
      updateSettings({
        currentAssessmentMonth: todayAcademic.fullMonth,
        reportMonth: todayAcademic.fullMonth,
        activeAssessmentMonths: [todayAcademic.monthName],
      });
      return;
    }

    // Check if the current configured month is over
    if (isMonthOver(currentAssMonth, settings.academicYear)) {
      console.log(`[Auto-Advance Month] Month '${currentAssMonth}' is over. Advancing to '${todayAcademic.fullMonth}'...`);
      updateSettings({
        currentAssessmentMonth: todayAcademic.fullMonth,
        reportMonth: todayAcademic.fullMonth,
        activeAssessmentMonths: [todayAcademic.monthName],
      });
    }
  }, [loading, settings.currentAssessmentMonth, settings.academicYear, settings.autoAdvanceMonth]);

  const login = (userId: string) => {
    const user = users?.find((u) => u.id === userId) || defaultUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('campus_auth', JSON.stringify(user));
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setOriginalAdminId(null);
  };

  const impersonate = (userId: string) => {
    if (currentUser?.role === 'admin') {
      // Only set originalAdminId if it's not already set (prevents losing original admin in nested impersonation)
      if (!originalAdminId) {
        setOriginalAdminId(currentUser.id);
        localStorage.setItem('campus_original_admin', JSON.stringify(currentUser.id));
      }
      const targetUser = users?.find((u) => u.id === userId);
      if (targetUser) {
        setCurrentUser(targetUser);
        localStorage.setItem('campus_auth', JSON.stringify(targetUser));
      }
    }
  };

  const stopImpersonating = () => {
    if (originalAdminId) {
      // Search in cloud users, default users, and even check the original ID directly
      const admin = users?.find((u) => u.id === originalAdminId) || 
                   defaultUsers.find(u => u.id === originalAdminId);
      
      if (admin) {
        setCurrentUser(admin);
        localStorage.setItem('campus_auth', JSON.stringify(admin));
      } else if (originalAdminId === 'admin1') {
        // Absolute fallback for the primary admin
        const fallbackAdmin = defaultUsers.find(u => u.id === 'admin1')!;
        setCurrentUser(fallbackAdmin);
        localStorage.setItem('campus_auth', JSON.stringify(fallbackAdmin));
      }
      
      setOriginalAdminId(null);
      localStorage.removeItem('campus_original_admin');
    }
  };

  const addUser = async (u: Omit<User, 'id'>) => {
    const id = `${u.role}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    try {
      await setDoc(doc(db, 'users', id), cleanData({ ...u, id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${id}`);
    }
  };

  const addUsers = async (newUsersList: Omit<User, 'id'>[]) => {
    const batch = writeBatch(db);
    newUsersList.forEach((u, i) => {
      const id = `${u.role}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(db, 'users', id), cleanData({ ...u, id }));
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users (batch)');
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    const userRef = doc(db, 'users', userId);
    try {
      await setDoc(userRef, cleanData(updates), { merge: true });
      // Update current user if it's the one being updated
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteUsers = async (userIds: string[]) => {
    const batch = writeBatch(db);
    userIds.forEach(id => batch.delete(doc(db, 'users', id)));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users (batch)');
    }
  };

  const updateSettings = async (updates: Partial<CampusSettings>) => {
    const fullSettings = { ...settings, ...updates };
    try {
      await setDoc(doc(db, 'settings', 'global'), cleanData(fullSettings));
      
      // Log if activeAssessmentMonths changed
      if (updates.activeAssessmentMonths && currentUser?.role === 'admin') {
        const logId = `log_${Date.now()}`;
        const logEntry: AssessmentLogEntry = {
          id: logId,
          timestamp: new Date().toISOString(),
          adminName: currentUser.name,
          action: 'bulk_update',
          months: updates.activeAssessmentMonths,
          details: `Updated active assessment months to: ${updates.activeAssessmentMonths.join(', ')}`
        };
        await setDoc(doc(db, 'assessmentLogs', logId), cleanData(logEntry));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  const addQuestion = async (q: Omit<Question, 'id'>) => {
    const id = `q${Date.now()}`;
    try {
      await setDoc(doc(db, 'questions', id), cleanData({ ...q, id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `questions/${id}`);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
    }
  };

  const addSubject = async (s: Omit<SubjectConfig, 'id'>) => {
    const id = `sub${Date.now()}`;
    try {
      await setDoc(doc(db, 'subjects', id), cleanData({ ...s, id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subjects/${id}`);
    }
  };

  const addSubjects = async (newSubjectsList: Omit<SubjectConfig, 'id'>[]) => {
    const batch = writeBatch(db);
    newSubjectsList.forEach((s, i) => {
      const id = `sub${Date.now()}_${i}`;
      batch.set(doc(db, 'subjects', id), cleanData({ ...s, id }));
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subjects (batch)');
    }
  };

  const deleteSubject = async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'subjects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
    }
  };

  const deleteSubjects = async (subjectIds: string[]) => {
    const batch = writeBatch(db);
    subjectIds.forEach(id => batch.delete(doc(db, 'subjects', id)));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'subjects (batch)');
    }
  };

  const addAssessment = async (a: Omit<Assessment, 'id' | 'date'>) => {
    const id = `a${Date.now()}`;
    const month = a.month || settings.currentAssessmentMonth;
    const newA = { ...a, id, month, date: new Date().toISOString() };
    
    try {
      // Find existing assessment for this student, assessor, category AND month
      const existing = assessments?.find(
        (existing) => 
          existing.studentId === a.studentId && 
          existing.assessorId === a.assessorId && 
          existing.category === a.category &&
          matchesMonth(existing.month, month)
      );
      
      const batch = writeBatch(db);
      if (existing) {
        batch.delete(doc(db, 'assessments', existing.id));
      }
      batch.set(doc(db, 'assessments', id), cleanData(newA));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `assessments/${id}`);
    }
  };

  // addCCEMarks: preserves all marks and only replaces the specific updated record
  const addCCEMarks = async (marks: (Omit<CCEMark, 'id'> & { existingId?: string })[]) => {
    const batch = writeBatch(db);
    
    marks.forEach(m => {
      // If an existing ID was provided, delete that exact document to replace it
      if (m.existingId) {
        batch.delete(doc(db, 'cceMarks', m.existingId));
      } else {
        // Otherwise, find existing record with identical studentId, subject, and cceLevel
        const existing = cceMarks?.find(e => 
          e.studentId === m.studentId && 
          e.subject === m.subject && 
          e.cceLevel === m.cceLevel
        );
        if (existing) {
          batch.delete(doc(db, 'cceMarks', existing.id));
        }
      }

      const id = `m${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { existingId, ...cleanMark } = m as any;
      batch.set(doc(db, 'cceMarks', id), cleanData({ ...cleanMark, id }));
    });
    
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cceMarks (batch)');
    }
  };

  const deleteCCEMark = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'cceMarks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `cceMarks/${id}`);
    }
  };

  const toggleQuestion = async (id: string, enabled: boolean) => {
    try {
      await setDoc(doc(db, 'questions', id), { enabled }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `questions/${id}`);
    }
  };

  const updateQuestion = async (id: string, updates: Partial<Question>) => {
    try {
      await setDoc(doc(db, 'questions', id), cleanData(updates), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `questions/${id}`);
    }
  };

  const getAIInsights = async (studentId: string, month: string): Promise<MentorInsight> => {
    const student = users.find(u => u.id === studentId);
    if (!student) throw new Error('Student not found');

    const studentAssessments = assessments.filter(a => a.studentId === studentId && a.month === month);
    const studentMarks = cceMarks.filter(m => m.studentId === studentId && m.month === month);

    const response = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student,
        assessments: studentAssessments,
        marks: studentMarks,
        month,
        questions
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get AI insights');
    }

    const insight = await response.json();
    const id = `insight_${studentId}_${month.replace(/\s+/g, '_')}`;
    const fullInsight = { ...insight, id, studentId, month, date: new Date().toISOString() };
    
    await setDoc(doc(db, 'mentorInsights', id), cleanData(fullInsight));
    return fullInsight;
  };

  const addSkillClubMarks = async (marks: Omit<SkillClubMark, 'id'>[]) => {
    const batch = writeBatch(db);
    marks.forEach(m => {
      const existing = skillClubMarks?.find(e => 
        e.studentId === m.studentId && matchesMonth(e.month, m.month)
      );
      if (existing) {
        batch.delete(doc(db, 'skillClubMarks', existing.id));
      }
      const id = `scm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      batch.set(doc(db, 'skillClubMarks', id), cleanData({ ...m, id }));
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'skillClubMarks (batch)');
    }
  };

  const deleteSkillClubMark = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'skillClubMarks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `skillClubMarks/${id}`);
    }
  };

  const addTaskTemplate = async (t: Omit<TaskTemplate, 'id'>) => {
    const id = `tt_${Date.now()}`;
    try {
      await setDoc(doc(db, 'taskTemplates', id), cleanData({ ...t, id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `taskTemplates/${id}`);
    }
  };

  const deleteTaskTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'taskTemplates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `taskTemplates/${id}`);
    }
  };

  const addStudentTask = async (task: Omit<StudentTask, 'id' | 'date'>) => {
    const id = `st_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTask = { ...task, id, date: new Date().toISOString() };
    
    try {
      const batch = writeBatch(db);
      // If it's a template task, check for existing
      if (task.templateId) {
        const existing = studentTasks.find(t => 
          t.studentId === task.studentId && t.templateId === task.templateId && matchesMonth(t.month, task.month)
        );
        if (existing) {
          batch.delete(doc(db, 'studentTasks', existing.id));
        }
      }
      batch.set(doc(db, 'studentTasks', id), cleanData(newTask));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `studentTasks/${id}`);
    }
  };

  const addStudentTasks = async (tasks: Omit<StudentTask, 'id' | 'date'>[]) => {
    try {
      const chunkSize = 400;
      for (let i = 0; i < tasks.length; i += chunkSize) {
        const chunk = tasks.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((task, j) => {
          const id = `st_${Date.now()}_${i + j}_${Math.random().toString(36).substr(2, 5)}`;
          const newTask = { ...task, id, date: new Date().toISOString() };
          
          if (task.templateId) {
            const existing = studentTasks.find(t => 
              t.studentId === task.studentId && t.templateId === task.templateId && matchesMonth(t.month, task.month)
            );
            if (existing) {
              batch.delete(doc(db, 'studentTasks', existing.id));
            }
          }
          batch.set(doc(db, 'studentTasks', id), cleanData(newTask));
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'studentTasks (batch)');
    }
  };

  const deleteStudentTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'studentTasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studentTasks/${id}`);
    }
  };

  const deleteStudentTasks = async (ids: string[]) => {
    try {
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'studentTasks', id));
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'studentTasks (batch)');
    }
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
        assessmentLogs: assessmentLogs || [],
        mentorInsights: mentorInsights || [],
        skillClubMarks: skillClubMarks || [],
        taskTemplates: taskTemplates || [],
        studentTasks: studentTasks || [],
        loading,
        syncStatus,
        lastSyncTime,
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
        deleteSubjects,
        deleteCCEMark,
        toggleQuestion,
        updateQuestion,
        getAIInsights,
        addSkillClubMarks,
        deleteSkillClubMark,
        addTaskTemplate,
        deleteTaskTemplate,
        addStudentTask,
        addStudentTasks,
        deleteStudentTask,
        deleteStudentTasks
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
