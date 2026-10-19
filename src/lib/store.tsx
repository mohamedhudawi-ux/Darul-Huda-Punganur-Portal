import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Question, Assessment, CCEMark, CampusSettings, SubjectConfig, AssessmentLogEntry, MentorInsight, SkillClubMark, TaskTemplate, StudentTask, Campus, SubscriptionPlan, PaymentRecord, PlatformAnnouncement, AuditLog } from '../types';
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
  campuses: Campus[];
  subscriptionPlans: SubscriptionPlan[];
  payments: PaymentRecord[];
  platformAnnouncements: PlatformAnnouncement[];
  auditLogs: AuditLog[];
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
  allUsers: User[];
  allCampuses: Campus[];
  inspectingCampusId: string | null;
  inspectCampus: (campusId: string) => void;
  stopInspectingCampus: () => void;
  registerCampus: (data: Omit<Campus, 'id' | 'status' | 'subscriptionStatus' | 'createdAt'> & { password?: string; collegeType?: string; domain?: string }) => Promise<void>;
  updateCampus: (campusId: string, updates: Partial<Campus>) => Promise<void>;
  updateCampusStatus: (campusId: string, status: 'pending' | 'active' | 'suspended' | 'deactivated') => Promise<void>;
  updateCampusSubscription: (campusId: string, planId: string, status: 'trial' | 'active' | 'grace' | 'expired') => Promise<void>;
  addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id'>) => Promise<void>;
  updateSubscriptionPlan: (planId: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  sendPlatformAnnouncement: (ann: Omit<PlatformAnnouncement, 'id' | 'createdAt'>) => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
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
  { id: 'super_admin_1', role: 'super_admin', name: 'Platform Super Admin', password: 'password123' },
  { id: 'admin1', campusId: 'campus_darul_huda', role: 'admin', name: 'Campus Admin', password: 'password123' },
  { id: 'demo_teacher', campusId: 'campus_darul_huda', role: 'teacher', name: 'Demo Teacher', classGrade: '10', section: 'A', password: 'password123' },
  { id: 'teacher1', campusId: 'campus_darul_huda', role: 'teacher', name: 'Mr. Smith', classGrade: '10', section: 'A', password: 'password123' },
  { id: 'teacher2', campusId: 'campus_darul_huda', role: 'teacher', name: 'Mrs. Davis', classGrade: '10', section: 'B', password: 'password123' },
  { 
    id: 'demo_student', 
    campusId: 'campus_darul_huda',
    role: 'student', 
    name: 'Demo Student', 
    admissionNumber: 'DEMO-001', 
    classGrade: '10', 
    section: 'A', 
    password: 'password123',
    attendance: 100,
    mentorId: 'demo_teacher',
    mentorName: 'Demo Teacher'
  },
  { 
    id: 'student1', 
    campusId: 'campus_darul_huda',
    role: 'student', 
    name: 'Alice Johnson', 
    admissionNumber: 'ADM-001', 
    classGrade: '10', 
    section: 'A', 
    password: 'password123',
    attendance: 96,
    mentorId: 'demo_teacher',
    mentorName: 'Demo Teacher',
    semesterHistory: [
      { semester: 'Shawwal 2025', academicScore: 82, attendance: 93 },
      { semester: 'Dhul-Qadah 2025', academicScore: 86, attendance: 95 },
      { semester: 'Muharram 2026', academicScore: 89, attendance: 97 },
      { semester: 'Safar 2026', academicScore: 92, attendance: 96 },
    ]
  },
  { 
    id: 'student2', 
    campusId: 'campus_darul_huda',
    role: 'student', 
    name: 'Bob Williams', 
    admissionNumber: 'ADM-002', 
    classGrade: '10', 
    section: 'A', 
    password: 'password123',
    attendance: 91,
    mentorId: 'teacher1',
    mentorName: 'Mr. Smith',
    semesterHistory: [
      { semester: 'Shawwal 2025', academicScore: 74, attendance: 88 },
      { semester: 'Dhul-Qadah 2025', academicScore: 78, attendance: 90 },
      { semester: 'Muharram 2026', academicScore: 81, attendance: 89 },
      { semester: 'Safar 2026', academicScore: 84, attendance: 92 },
    ]
  },
  { 
    id: 'student3', 
    campusId: 'campus_darul_huda',
    role: 'student', 
    name: 'Charlie Brown', 
    admissionNumber: 'ADM-003', 
    classGrade: '10', 
    section: 'B', 
    password: 'password123',
    attendance: 94,
    mentorId: 'teacher2',
    mentorName: 'Mrs. Davis',
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

export const defaultSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter Campus',
    priceMonthly: 4999,
    priceAnnual: 49990,
    maxStudents: 250,
    maxStaff: 20,
    storageLimitGb: 10,
    features: ['Isolated Tenant Environment', 'Core CCE & Attendance', 'Standard Support', 'Dedicated Subdomain'],
    description: 'Perfect for small schools and individual colleges.'
  },
  {
    id: 'plan_pro',
    name: 'Professional Campus',
    priceMonthly: 14999,
    priceAnnual: 149990,
    maxStudents: 1000,
    maxStaff: 75,
    storageLimitGb: 50,
    features: ['Advanced Analytics', 'Priority Support', 'Custom College Branding', 'Unlimited Sections', 'Dedicated Domain'],
    description: 'Ideal for growing colleges, institutes, and high schools.'
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise Unlimited',
    priceMonthly: 29999,
    priceAnnual: 299990,
    maxStudents: 999999,
    maxStaff: 9999,
    storageLimitGb: 500,
    features: ['Dedicated Account Manager', 'Custom Domain Support', 'SLA Guarantee', 'Advanced Audit Logs', 'Multi-Branch Support'],
    description: 'For large educational networks, universities, and polytechnics.'
  }
];

export const defaultCampuses: Campus[] = [
  {
    id: 'campus_darul_huda',
    slug: 'darul-huda-punganur',
    domain: 'darul-huda-punganur.grandcampus.edu',
    name: 'Darul Huda Punganur',
    collegeType: 'University / Multi-Faculty',
    address: 'Punganur, Andhra Pradesh, India',
    adminEmail: 'admin@darulhuda.edu',
    adminName: 'Campus Admin',
    phone: '+91 98765 43210',
    status: 'active',
    subscriptionPlanId: 'plan_pro',
    subscriptionStatus: 'active',
    createdAt: '2026-01-01'
  },
  {
    id: 'campus_grand',
    slug: 'grand-campus',
    domain: 'grandcampus.edu',
    name: 'Grand Campus Assurance Portal',
    collegeType: 'Institution',
    address: 'Campus Main Grounds',
    adminEmail: 'admin@grandcampus.edu',
    adminName: 'Campus Admin',
    phone: '+91 98765 43210',
    status: 'active',
    subscriptionPlanId: 'plan_pro',
    subscriptionStatus: 'active',
    createdAt: '2026-01-01'
  }
];

export const defaultPayments: PaymentRecord[] = [
  {
    id: 'PAY_IN_88291',
    campusId: 'campus_darul_huda',
    campusName: 'Darul Huda Punganur',
    amount: 14999,
    currency: 'INR',
    planId: 'plan_pro',
    billingCycle: 'monthly',
    status: 'success',
    createdAt: '2026-10-01'
  }
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
  const [campuses, setCampuses] = useState<Campus[]>(() => {
    const saved = localStorage.getItem('saas_campuses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultCampuses;
      }
    }
    return defaultCampuses;
  });

  useEffect(() => {
    localStorage.setItem('saas_campuses', JSON.stringify(campuses));
  }, [campuses]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(defaultSubscriptionPlans);
  const [payments, setPayments] = useState<PaymentRecord[]>(defaultPayments);
  const [inspectingCampusId, setInspectingCampusId] = useState<string | null>(() => {
    return localStorage.getItem('campus_inspecting_id') || null;
  });

  const inspectCampus = (campusId: string) => {
    setInspectingCampusId(campusId);
    localStorage.setItem('campus_inspecting_id', campusId);
  };

  const stopInspectingCampus = () => {
    setInspectingCampusId(null);
    localStorage.removeItem('campus_inspecting_id');
  };

  const [platformAnnouncements, setPlatformAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: 'log_1', timestamp: new Date().toLocaleTimeString(), action: 'SYSTEM_BOOT', details: 'Multi-tenant SaaS platform initialized successfully in INR.' }
  ]);
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
      onSnapshot(collection(db, col.name), async (snapshot) => {
        let docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
        if (col.name === 'users') {
          const defaultMap = new Map(defaultUsers.map(du => [du.id, du]));
          docs = docs.map(u => {
            const def = defaultMap.get(u.id);
            const name = u.name && String(u.name).trim() !== '' ? u.name : (def?.name || u.admissionNumber || (u.role === 'teacher' ? 'Teacher' : (u.role === 'student' ? 'Student' : u.id)));
            return { ...u, name };
          });
          const docIds = new Set(docs.map(d => d.id));
          const missingUsers: User[] = [];
          defaultUsers.forEach(du => {
            if (!docIds.has(du.id)) {
              docs.push(du);
              missingUsers.push(du);
            }
          });
          if (missingUsers.length > 0) {
            try {
              const batch = writeBatch(db);
              missingUsers.forEach(u => batch.set(doc(db, 'users', u.id), cleanData(u)));
              await batch.commit();
              console.log(`Auto-restored ${missingUsers.length} missing default users to Firestore.`);
            } catch (err) {
              console.warn('Failed to auto-restore users:', err);
            }
          }
        }
        console.log(`Syncing ${col.name}: ${docs.length} documents received.`);
        
        // Update state with whatever is in the cloud
        if (docs.length > 0 || ['assessments', 'cceMarks', 'studentTasks', 'assessmentLogs', 'mentorInsights', 'skillClubMarks', 'taskTemplates'].includes(col.name)) {
          col.setter(docs);
        } else {
          // If empty, we keep our local defaults for critical collections and seed them
          if (col.name === 'users') {
            setUsers(defaultUsers);
            try {
              const batch = writeBatch(db);
              defaultUsers.forEach(u => batch.set(doc(db, 'users', u.id), cleanData(u)));
              await batch.commit();
            } catch (err) {}
          }
          if (col.name === 'questions') {
            setQuestions(defaultQuestions);
            try {
              const batch = writeBatch(db);
              defaultQuestions.forEach(q => batch.set(doc(db, 'questions', q.id), cleanData(q)));
              await batch.commit();
            } catch (err) {}
          }
          if (col.name === 'subjects') {
            setSubjects(defaultSubjects);
            try {
              const batch = writeBatch(db);
              defaultSubjects.forEach(s => batch.set(doc(db, 'subjects', s.id), cleanData(s)));
              await batch.commit();
            } catch (err) {}
          }
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
    if (userId === 'super_admin_1') {
      const superAdminUser: User = {
        id: 'super_admin_1',
        role: 'super_admin',
        name: 'Platform Super Admin',
        password: 'password123'
      };
      setCurrentUser(superAdminUser);
      localStorage.setItem('campus_auth', JSON.stringify(superAdminUser));
      return;
    }
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
    const targetCampusId = u.campusId || (currentUser?.role === 'super_admin' && inspectingCampusId ? inspectingCampusId : currentUser?.campusId) || 'campus_grand';
    const newUser: User = { ...u, campusId: targetCampusId, id };
    setUsers(prev => [...prev.filter(x => x.id !== id), newUser]);
    try {
      await setDoc(doc(db, 'users', id), cleanData(newUser));
    } catch (error) {
      console.warn('Firestore sync fallback for addUser:', error);
    }
  };

  const addUsers = async (newUsersList: Omit<User, 'id'>[]) => {
    const batch = writeBatch(db);
    const targetCampusId = (currentUser?.role === 'super_admin' && inspectingCampusId ? inspectingCampusId : currentUser?.campusId) || 'campus_grand';
    const createdUsers: User[] = [];
    newUsersList.forEach((u, i) => {
      const id = `${u.role}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`;
      const userCampusId = u.campusId || targetCampusId;
      const userObj: User = { ...u, campusId: userCampusId, id };
      createdUsers.push(userObj);
      batch.set(doc(db, 'users', id), cleanData(userObj));
    });
    setUsers(prev => [...prev, ...createdUsers]);
    try {
      await batch.commit();
    } catch (error) {
      console.warn('Firestore sync fallback for addUsers batch:', error);
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
      const teacherId = cleanMark.teacherId || currentUser?.id;
      const teacherName = cleanMark.teacherName || currentUser?.name;
      batch.set(doc(db, 'cceMarks', id), cleanData({ ...cleanMark, teacherId, teacherName, id }));
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

  const registerCampus = async (data: Omit<Campus, 'id' | 'status' | 'subscriptionStatus' | 'createdAt'> & { password?: string; collegeType?: string; domain?: string }) => {
    const id = `campus_${Date.now()}`;
    const cleanSlug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const domain = data.domain || `${cleanSlug}.grandcampus.edu`;
    const newCampus: Campus = {
      id,
      slug: cleanSlug,
      domain,
      name: data.name,
      collegeType: data.collegeType || 'General College',
      address: data.address,
      adminEmail: data.adminEmail,
      adminName: data.adminName,
      phone: data.phone,
      status: 'active',
      subscriptionPlanId: data.subscriptionPlanId,
      subscriptionStatus: 'trial',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setCampuses(prev => {
      const updated = [...prev, newCampus];
      localStorage.setItem('saas_campuses', JSON.stringify(updated));
      return updated;
    });

    const newAdmin: User = {
      id: `admin_${id}`,
      campusId: id,
      role: 'admin',
      name: data.adminName,
      password: data.password || 'password123'
    };

    setUsers(prev => [...prev, newAdmin]);
    setAuditLogs(prev => [{ 
      id: `log_${Date.now()}`, 
      campusId: id, 
      action: 'CAMPUS_REGISTERED', 
      details: `New campus registered: ${data.name} (Domain: ${domain})`, 
      timestamp: new Date().toLocaleTimeString() 
    }, ...prev]);

    try {
      await setDoc(doc(db, 'campuses', id), cleanData(newCampus));
      await setDoc(doc(db, 'users', newAdmin.id), cleanData(newAdmin));
    } catch (e) {
      console.warn('Firestore sync fallback for registerCampus:', e);
    }
  };

  const updateCampus = async (campusId: string, updates: Partial<Campus>) => {
    setCampuses(prev => {
      const updated = prev.map(c => c.id === campusId ? { ...c, ...updates } : c);
      localStorage.setItem('saas_campuses', JSON.stringify(updated));
      return updated;
    });
    setAuditLogs(prev => [{ 
      id: `log_${Date.now()}`, 
      campusId, 
      action: 'CAMPUS_UPDATED', 
      details: `Campus details updated: ${updates.name || campusId}`, 
      timestamp: new Date().toLocaleTimeString() 
    }, ...prev]);

    try {
      await setDoc(doc(db, 'campuses', campusId), cleanData(updates), { merge: true });
    } catch (e) {
      console.warn('Firestore sync fallback for updateCampus:', e);
    }
  };

  const updateCampusStatus = async (campusId: string, status: 'pending' | 'active' | 'suspended' | 'deactivated') => {
    setCampuses(prev => {
      const updated = prev.map(c => c.id === campusId ? { ...c, status } : c);
      localStorage.setItem('saas_campuses', JSON.stringify(updated));
      return updated;
    });
    setAuditLogs(prev => [{ 
      id: `log_${Date.now()}`, 
      campusId, 
      action: status === 'suspended' ? 'CAMPUS_SUSPENDED' : 'CAMPUS_STATUS_UPDATED', 
      details: `Campus status changed to ${status}`, 
      timestamp: new Date().toLocaleTimeString() 
    }, ...prev]);

    try {
      await setDoc(doc(db, 'campuses', campusId), { status }, { merge: true });
    } catch (e) {
      console.warn('Firestore sync fallback for updateCampusStatus:', e);
    }
  };

  const updateCampusSubscription = async (campusId: string, planId: string, status: 'trial' | 'active' | 'grace' | 'expired') => {
    setCampuses(prev => prev.map(c => c.id === campusId ? { ...c, subscriptionPlanId: planId, subscriptionStatus: status } : c));
  };

  const addSubscriptionPlan = async (plan: Omit<SubscriptionPlan, 'id'>) => {
    const id = `plan_${Date.now()}`;
    setSubscriptionPlans(prev => [...prev, { ...plan, id }]);
  };

  const updateSubscriptionPlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    setSubscriptionPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p));
  };

  const sendPlatformAnnouncement = async (ann: Omit<PlatformAnnouncement, 'id' | 'createdAt'>) => {
    const id = `ann_${Date.now()}`;
    setPlatformAnnouncements(prev => [{ ...ann, id, createdAt: new Date().toLocaleDateString() }, ...prev]);
  };

  const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const id = `log_${Date.now()}`;
    setAuditLogs(prev => [{ ...log, id, timestamp: new Date().toLocaleTimeString() }, ...prev]);
  };

  const activeCampusId = currentUser
    ? (currentUser.role === 'super_admin' ? inspectingCampusId : (currentUser.campusId || 'campus_grand'))
    : null;

  // Tenant-isolated users:
  // If not logged in, return all users for login checks.
  // If Super Admin and not inspecting a specific campus, return all users across platform.
  // If inspecting or logged in as a campus user, strictly isolate to their campus!
  const tenantUsers = (!currentUser || (currentUser.role === 'super_admin' && !inspectingCampusId))
    ? (users || [])
    : (users || []).filter(u => u.campusId === activeCampusId || (!u.campusId && activeCampusId === 'campus_grand'));

  // Tenant-isolated campuses:
  // For Super Admin or public login: all campuses.
  // For logged in campus user: only their own campus so they cannot see other colleges.
  const tenantCampuses = (!currentUser || currentUser.role === 'super_admin')
    ? (campuses || [])
    : (campuses || []).filter(c => c.id === (currentUser.campusId || 'campus_grand'));

  // Tenant-isolated subjects:
  const tenantSubjects = (!currentUser || currentUser.role === 'super_admin')
    ? (subjects || [])
    : (subjects || []).filter(s => !s.campusId || s.campusId === activeCampusId);

  return (
    <StoreContext.Provider
      value={{
        settings,
        users: tenantUsers,
        allUsers: users || [],
        questions: questions || [],
        assessments: assessments || [],
        cceMarks: cceMarks || [],
        subjects: tenantSubjects,
        assessmentLogs: assessmentLogs || [],
        mentorInsights: mentorInsights || [],
        skillClubMarks: skillClubMarks || [],
        taskTemplates: taskTemplates || [],
        studentTasks: studentTasks || [],
        campuses: tenantCampuses,
        allCampuses: campuses || [],
        subscriptionPlans: subscriptionPlans || [],
        payments: payments || [],
        platformAnnouncements: platformAnnouncements || [],
        auditLogs: auditLogs || [],
        loading,
        syncStatus,
        lastSyncTime,
        forceCloudRefresh,
        currentUser,
        originalAdminId,
        inspectingCampusId,
        inspectCampus,
        stopInspectingCampus,
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
        deleteStudentTasks,
        registerCampus,
        updateCampus,
        updateCampusStatus,
        updateCampusSubscription,
        addSubscriptionPlan,
        updateSubscriptionPlan,
        sendPlatformAnnouncement,
        addAuditLog
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
