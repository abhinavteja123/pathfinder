import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  CheckinRecord,
  ConversationLogRecord,
  OnboardingStateRecord,
  PathfinderRepository,
  ProfileAnswerRecord,
  RoadmapItemRecord,
  RoadmapStatus,
  StudentRecord,
} from './repository';

interface StoreShape {
  students: StudentRecord[];
  onboardingStates: OnboardingStateRecord[];
  profileAnswers: ProfileAnswerRecord[];
  conversationLogs: ConversationLogRecord[];
  roadmapItems: RoadmapItemRecord[];
  checkins: CheckinRecord[];
}

function emptyStore(): StoreShape {
  return {
    students: [],
    onboardingStates: [],
    profileAnswers: [],
    conversationLogs: [],
    roadmapItems: [],
    checkins: [],
  };
}

const DEFAULT_STORE_PATH = join(process.cwd(), '.data', 'pathfinder-store.json');

/** Durable dev/pilot store -- survives `next dev` restarts and Turbopack's
 * hot-reload singleton reset (unlike InMemoryRepository), so "log back in
 * after a month and the bot remembers" is actually testable. One JSON file,
 * whole-file rewrite per mutation.
 * ponytail: fine at single-process pilot scale (low write volume, no
 * concurrent writers); swap for the drafted Postgres/Supabase schema
 * (schema.sql) behind this same PathfinderRepository interface once
 * concurrent-write volume or multi-instance hosting matters -- callers
 * (get-repository.ts and everything above it) don't change either way. */
export class FileRepository implements PathfinderRepository {
  private store: StoreShape;
  private path: string;

  constructor(path: string = DEFAULT_STORE_PATH) {
    this.path = path;
    this.store = this.load();
  }

  private load(): StoreShape {
    if (!existsSync(this.path)) return emptyStore();
    try {
      return { ...emptyStore(), ...JSON.parse(readFileSync(this.path, 'utf-8')) };
    } catch {
      return emptyStore();
    }
  }

  private save() {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.store, null, 2));
  }

  async getStudent(studentId: string) {
    return this.store.students.find((s) => s.id === studentId) ?? null;
  }
  async upsertStudent(s: StudentRecord) {
    const i = this.store.students.findIndex((x) => x.id === s.id);
    if (i >= 0) this.store.students[i] = s;
    else this.store.students.push(s);
    this.save();
  }

  async getOnboardingState(studentId: string) {
    return this.store.onboardingStates.find((s) => s.studentId === studentId) ?? null;
  }
  async setOnboardingState(s: OnboardingStateRecord) {
    const i = this.store.onboardingStates.findIndex((x) => x.studentId === s.studentId);
    if (i >= 0) this.store.onboardingStates[i] = s;
    else this.store.onboardingStates.push(s);
    this.save();
  }

  async getProfileAnswers(studentId: string) {
    return this.store.profileAnswers.filter((a) => a.studentId === studentId);
  }
  async addProfileAnswer(a: ProfileAnswerRecord) {
    this.store.profileAnswers.push(a);
    this.save();
  }

  async getConversationLog(studentId: string, limit?: number) {
    const list = this.store.conversationLogs.filter((c) => c.studentId === studentId);
    return limit ? list.slice(-limit) : list;
  }
  async appendConversationLog(entry: ConversationLogRecord) {
    this.store.conversationLogs.push(entry);
    this.save();
  }

  async addRoadmapItem(item: RoadmapItemRecord) {
    this.store.roadmapItems.push(item);
    this.save();
  }
  async getRoadmapItems(studentId: string) {
    return this.store.roadmapItems.filter((i) => i.studentId === studentId);
  }
  async setRoadmapItems(studentId: string, items: RoadmapItemRecord[]) {
    this.store.roadmapItems = this.store.roadmapItems.filter((i) => i.studentId !== studentId).concat(items);
    this.save();
  }
  async setRoadmapItemStatus(studentId: string, itemId: string, status: RoadmapStatus) {
    const item = this.store.roadmapItems.find((i) => i.studentId === studentId && i.itemId === itemId);
    if (item) {
      item.status = status;
      this.save();
    }
  }

  async getCheckin(studentId: string) {
    return this.store.checkins.find((c) => c.studentId === studentId) ?? null;
  }
  async setCheckin(c: CheckinRecord) {
    const i = this.store.checkins.findIndex((x) => x.studentId === c.studentId);
    if (i >= 0) this.store.checkins[i] = c;
    else this.store.checkins.push(c);
    this.save();
  }
}
