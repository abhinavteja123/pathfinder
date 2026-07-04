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

/** Dev/test store -- no external service required. Swap for a Postgres/Supabase
 * implementation behind the same PathfinderRepository interface at integration time. */
export class InMemoryRepository implements PathfinderRepository {
  private students = new Map<string, StudentRecord>();
  private onboardingStates = new Map<string, OnboardingStateRecord>();
  private profileAnswers = new Map<string, ProfileAnswerRecord[]>();
  private conversationLogs = new Map<string, ConversationLogRecord[]>();
  private roadmapItems = new Map<string, RoadmapItemRecord[]>();
  private checkins = new Map<string, CheckinRecord>();

  async getStudent(studentId: string) {
    return this.students.get(studentId) ?? null;
  }
  async upsertStudent(s: StudentRecord) {
    this.students.set(s.id, s);
  }

  async getOnboardingState(studentId: string) {
    return this.onboardingStates.get(studentId) ?? null;
  }
  async setOnboardingState(s: OnboardingStateRecord) {
    this.onboardingStates.set(s.studentId, s);
  }

  async getProfileAnswers(studentId: string) {
    return this.profileAnswers.get(studentId) ?? [];
  }
  async addProfileAnswer(a: ProfileAnswerRecord) {
    const list = this.profileAnswers.get(a.studentId) ?? [];
    list.push(a);
    this.profileAnswers.set(a.studentId, list);
  }

  async getConversationLog(studentId: string, limit?: number) {
    const list = this.conversationLogs.get(studentId) ?? [];
    return limit ? list.slice(-limit) : list;
  }
  async appendConversationLog(entry: ConversationLogRecord) {
    const list = this.conversationLogs.get(entry.studentId) ?? [];
    list.push(entry);
    this.conversationLogs.set(entry.studentId, list);
  }

  async addRoadmapItem(item: RoadmapItemRecord) {
    const list = this.roadmapItems.get(item.studentId) ?? [];
    list.push(item);
    this.roadmapItems.set(item.studentId, list);
  }
  async getRoadmapItems(studentId: string) {
    return this.roadmapItems.get(studentId) ?? [];
  }
  async setRoadmapItems(studentId: string, items: RoadmapItemRecord[]) {
    this.roadmapItems.set(studentId, items);
  }
  async setRoadmapItemStatus(studentId: string, itemId: string, status: RoadmapStatus) {
    const list = this.roadmapItems.get(studentId);
    const item = list?.find((i) => i.itemId === itemId);
    if (item) item.status = status;
  }

  async getCheckin(studentId: string) {
    return this.checkins.get(studentId) ?? null;
  }
  async setCheckin(c: CheckinRecord) {
    this.checkins.set(c.studentId, c);
  }
}
