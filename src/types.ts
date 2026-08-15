export type Role = 'admin' | 'teacher' | 'student';

export interface SemesterProgress {
  semester: string;
  academicScore: number; // 0 - 100
  attendance: number; // 0 - 100 percentage
}

export interface User {
  id: string;
  role: Role;
  name: string;
  password?: string;
  admissionNumber?: string;
  classGrade?: string; 
  section?: string;
  mentorId?: string; // Teacher ID acting as mentor
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
  isReportGenerated?: boolean;
  isTotalReportGenerated?: boolean;
  spiritualFields?: string[];
  behaviouralFields?: string[];
}

export interface SubjectConfig {
  id: string;
  classGrade: string;
  section?: string;
  name: string;
}

export interface Question {
  id: string;
  category: 'spiritual' | 'behavioural';
  field: string;
  text: string;
}

// Ratings are typically 1-5 or percentage based. 
// We will store percentages or raw scores.
export interface Assessment {
  id: string;
  studentId: string;
  assessorId: string;
  category: 'spiritual' | 'behavioural';
  scores: Record<string, number>; // questionId -> percentage (0-100)
  date: string;
}

export interface CCEMark {
  id: string;
  studentId: string;
  subject: string;
  cceLevel: string; // e.g. "CCE-1", "CCE-2"
  month?: string;
  date: string; 
  score: number; 
  maxScore: number;
}

export type GradeEmoji = '🌟' | '👍' | '📈';
export type GradeLabel = 'Excellent' | 'Good' | 'Need Improvement';

export function getGradeFromPercentage(percentage: number): { label: GradeLabel; emoji: GradeEmoji } {
  if (percentage >= 80) return { label: 'Excellent', emoji: '🌟' };
  if (percentage >= 60) return { label: 'Good', emoji: '👍' };
  return { label: 'Need Improvement', emoji: '📈' };
}
