import type { Program, Year } from '@/engine/types';

export interface StudentRecord {
  id: string;
  year: Year;
  program: Program;
  createdAt: string;
}

export interface OnboardingStateRecord {
  studentId: string;
  stage: 'not_started' | 'in_progress' | 'complete';
  startedAt?: string;
  completedAt?: string;
}

export interface ProfileAnswerRecord {
  studentId: string;
  key: string;
  value: string;
  capturedAt: string;
}

export interface ConversationLogRecord {
  studentId: string;
  turn: number;
  role: 'bot' | 'student';
  text: string;
  nodeId: string;
  createdAt: string;
}

export type RoadmapCategory = 'milestone' | 'hackathon' | 'internship' | 'oss';
export type RoadmapStatus = 'suggested' | 'saved' | 'started' | 'done';

export interface RoadmapItemRecord {
  studentId: string;
  /** stable id, unique per student -- the handle the save toggle flips */
  itemId: string;
  category: RoadmapCategory;
  title: string;
  description: string;
  link?: string;
  /** layout ordering: milestones 0..3 along the spine, opportunities after */
  order: number;
  status: RoadmapStatus;
  createdAt: string;
}

export interface CheckinRecord {
  studentId: string;
  lastCheckinAt?: string;
  nextDueAt?: string;
}

/** Mirrors PATHFINDER_SYSTEM_DESIGN.md §4. In-memory now (dev/test); a
 * Postgres/Supabase implementation is wired in later behind this same
 * interface -- see schema.sql for the target DDL. */
export interface PathfinderRepository {
  getStudent(studentId: string): Promise<StudentRecord | null>;
  upsertStudent(s: StudentRecord): Promise<void>;

  getOnboardingState(studentId: string): Promise<OnboardingStateRecord | null>;
  setOnboardingState(s: OnboardingStateRecord): Promise<void>;

  getProfileAnswers(studentId: string): Promise<ProfileAnswerRecord[]>;
  addProfileAnswer(a: ProfileAnswerRecord): Promise<void>;

  getConversationLog(studentId: string, limit?: number): Promise<ConversationLogRecord[]>;
  appendConversationLog(entry: ConversationLogRecord): Promise<void>;

  addRoadmapItem(item: RoadmapItemRecord): Promise<void>;
  getRoadmapItems(studentId: string): Promise<RoadmapItemRecord[]>;
  /** Replace a student's whole roadmap (used on first generation). */
  setRoadmapItems(studentId: string, items: RoadmapItemRecord[]): Promise<void>;
  /** Flip one item's status (e.g. suggested <-> saved) by itemId. */
  setRoadmapItemStatus(studentId: string, itemId: string, status: RoadmapStatus): Promise<void>;

  getCheckin(studentId: string): Promise<CheckinRecord | null>;
  setCheckin(c: CheckinRecord): Promise<void>;
}
