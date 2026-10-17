export type Role = 'super_admin' | 'admin' | 'teacher' | 'student';

export interface Campus {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  address?: string;
  adminEmail: string;
  adminName: string;
  phone?: string;
  status: 'pending' | 'active' | 'suspended' | 'deactivated';
  subscriptionPlanId: string;
  subscriptionStatus: 'trial' | 'active' | 'grace' | 'expired';
  trialEndsAt?: string;
  subscriptionExpiresAt?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxStudents: number;
  maxStaff: number;
  storageLimitGb: number;
  features: string[];
  description: string;
}

export interface PaymentRecord {
  id: string;
  campusId: string;
  campusName: string;
  amount: number;
  currency: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  status: 'success' | 'pending' | 'failed';
  paymentId?: string;
  createdAt: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  targetCampusId: string; // 'all' or specific campusId
  createdAt: string;
  author: string;
}

export interface AuditLog {
  id: string;
  campusId?: string;
  userId?: string;
  userName?: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SemesterProgress {
  semester: string;
  academicScore: number; // 0 - 100
  attendance: number; // 0 - 100 percentage
}

export interface User {
  id: string;
  campusId?: string;
  role: Role;
  name: string;
  password?: string;
  admissionNumber?: string;
  classGrade?: string; 
  section?: string;
  mentorId?: string; // Teacher ID acting as mentor
  mentorName?: string; // Teacher Name acting as mentor
  photoUrl?: string;
  attendance?: number;
  semesterHistory?: SemesterProgress[];
}

export interface CampusSettings {
  name: string;
  logoUrl: string;
  assessmentsActive: boolean;
  reportCardsActive: boolean;
  academicYear?: string;
  currentSemester?: string;
  reportMonth?: string;
  currentAssessmentMonth?: string; // New field for monthly assessments
  behavioralEditEnabled?: boolean; // New field for teacher edit access
  isReportGenerated?: boolean;
  isTotalReportGenerated?: boolean;
  assessmentCategories?: string[]; // Dynamic categories (e.g., Spiritual, Behavioural)
  spiritualFields?: string[];
  behaviouralFields?: string[];
  categoryFields?: Record<string, string[]>; // Map of category name to its fields
  activeAssessmentMonths?: string[]; // Array of month names e.g. ["August", "September"]
  autoAdvanceMonth?: boolean; // Automatically advance month when the current month is over
}

export interface AssessmentLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  action: 'enabled' | 'disabled' | 'bulk_update';
  months: string[];
  details: string;
}

export interface MentorInsight {
  id: string;
  studentId: string;
  date: string;
  month: string;
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  roadmap: string[];
}

export interface SubjectConfig {
  id: string;
  classGrade: string;
  section?: string;
  name: string;
}

export interface Question {
  id: string;
  category: string;
  field: string;
  text: string;
  enabled?: boolean;
  options?: string[]; // Custom options for the question
}

// Ratings are typically 1-5 or percentage based. 
// We will store percentages or raw scores.
export interface Assessment {
  id: string;
  studentId: string;
  assessorId: string;
  category: string;
  scores: Record<string, number>; // questionId -> percentage (0-100)
  month?: string; // New field for monthly assessments
  date: string;
}

export interface CCEMark {
  id: string;
  studentId: string;
  subject: string;
  cceLevel: string; // e.g. "CCE 1", "CCE 2", "CCE 3", "CCE 4", "Mid Term Exam"
  month?: string;
  date: string; 
  score: number | 'Ab'; 
  maxScore: number;
  description?: string; // Topic, portion, activity, or assignment description (e.g., "Chapter 3 Quiz & Notebook Assessment")
  notes?: string; // Optional student-specific note or remark
  teacherId?: string; // Teacher who entered this CCE mark
  teacherName?: string; // Teacher full name
}

export interface SkillClubMark {
  id: string;
  studentId: string;
  month: string;
  score: number | 'Ab';
  date: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  month: string;
  classGrade: string;
  enabled: boolean;
}

export interface StudentTask {
  id: string;
  studentId: string;
  templateId?: string; // If it's a predefined task
  customTitle?: string; // If it's an "other" task
  completed: boolean;
  quantity?: string; // e.g., "300 pages"
  month: string;
  date: string;
}

export type GradeEmoji = '🌟' | '👍' | '📈';
export type GradeLabel = 'Excellent' | 'Good' | 'Need Improvement';

export function getGradeFromPercentage(percentage: number): { label: GradeLabel; emoji: GradeEmoji } {
  if (percentage >= 80) return { label: 'Excellent', emoji: '🌟' };
  if (percentage >= 60) return { label: 'Good', emoji: '👍' };
  return { label: 'Need Improvement', emoji: '📈' };
}
