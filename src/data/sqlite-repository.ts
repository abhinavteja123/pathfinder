import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
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

const DEFAULT_DB_PATH = join(process.cwd(), '.data', 'pathfinder.sqlite');

/** Durable dev/pilot store backed by node:sqlite (stdlib, no dependency added).
 * Replaces FileRepository's whole-file-rewrite-per-mutation JSON store, which
 * had a real bug: get-repository.ts's module-level singleton goes stale
 * across Turbopack's per-route hot-reloads in dev, so one route's write was
 * invisible to another route's cached in-memory copy ("unknown student"
 * 404s). SQLite has no such problem -- every query hits the same on-disk
 * database file directly, no in-memory snapshot to go stale.
 * ponytail: temporary per user request, not the final production store --
 * swap for the already-drafted Postgres/Supabase schema (schema.sql) behind
 * this same PathfinderRepository interface once that's provisioned. Callers
 * (get-repository.ts and everything above it) don't change either way. */
export class SqliteRepository implements PathfinderRepository {
  private db: DatabaseSync;

  constructor(path: string = DEFAULT_DB_PATH) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
        program TEXT NOT NULL CHECK (program IN ('BTech','BBA')),
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS onboarding_state (
        student_id TEXT PRIMARY KEY REFERENCES students(id),
        stage TEXT NOT NULL CHECK (stage IN ('not_started','in_progress','complete')),
        started_at TEXT,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS profile_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL REFERENCES students(id),
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        captured_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS profile_answers_student_idx ON profile_answers(student_id, key);
      CREATE TABLE IF NOT EXISTS conversation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL REFERENCES students(id),
        turn INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('bot','student')),
        text TEXT NOT NULL,
        node_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS conversation_log_student_idx ON conversation_log(student_id, created_at);
      CREATE TABLE IF NOT EXISTS roadmap_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL REFERENCES students(id),
        item_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('milestone','hackathon','internship','oss')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        link TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('suggested','saved','started','done')),
        created_at TEXT NOT NULL,
        UNIQUE (student_id, item_id)
      );
      CREATE INDEX IF NOT EXISTS roadmap_items_student_idx ON roadmap_items(student_id);
      CREATE TABLE IF NOT EXISTS checkins (
        student_id TEXT PRIMARY KEY REFERENCES students(id),
        last_checkin_at TEXT,
        next_due_at TEXT
      );
    `);
  }

  async getStudent(studentId: string): Promise<StudentRecord | null> {
    const row = this.db.prepare('SELECT * FROM students WHERE id = ?').get(studentId) as
      | { id: string; year: number; program: string; created_at: string }
      | undefined;
    return row ? { id: row.id, year: row.year as StudentRecord['year'], program: row.program as StudentRecord['program'], createdAt: row.created_at } : null;
  }

  async upsertStudent(s: StudentRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO students (id, year, program, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET year = excluded.year, program = excluded.program`
      )
      .run(s.id, s.year, s.program, s.createdAt);
  }

  async getOnboardingState(studentId: string): Promise<OnboardingStateRecord | null> {
    const row = this.db.prepare('SELECT * FROM onboarding_state WHERE student_id = ?').get(studentId) as
      | { student_id: string; stage: string; started_at: string | null; completed_at: string | null }
      | undefined;
    return row
      ? {
          studentId: row.student_id,
          stage: row.stage as OnboardingStateRecord['stage'],
          startedAt: row.started_at ?? undefined,
          completedAt: row.completed_at ?? undefined,
        }
      : null;
  }

  async setOnboardingState(s: OnboardingStateRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO onboarding_state (student_id, stage, started_at, completed_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(student_id) DO UPDATE SET stage = excluded.stage, started_at = excluded.started_at, completed_at = excluded.completed_at`
      )
      .run(s.studentId, s.stage, s.startedAt ?? null, s.completedAt ?? null);
  }

  async getProfileAnswers(studentId: string): Promise<ProfileAnswerRecord[]> {
    const rows = this.db
      .prepare('SELECT * FROM profile_answers WHERE student_id = ? ORDER BY id ASC')
      .all(studentId) as unknown as { student_id: string; key: string; value: string; captured_at: string }[];
    return rows.map((r) => ({ studentId: r.student_id, key: r.key, value: r.value, capturedAt: r.captured_at }));
  }

  async addProfileAnswer(a: ProfileAnswerRecord): Promise<void> {
    this.db
      .prepare('INSERT INTO profile_answers (student_id, key, value, captured_at) VALUES (?, ?, ?, ?)')
      .run(a.studentId, a.key, a.value, a.capturedAt);
  }

  async getConversationLog(studentId: string, limit?: number): Promise<ConversationLogRecord[]> {
    const rows = this.db
      .prepare('SELECT * FROM conversation_log WHERE student_id = ? ORDER BY id ASC')
      .all(studentId) as unknown as {
      student_id: string;
      turn: number;
      role: string;
      text: string;
      node_id: string;
      created_at: string;
    }[];
    const mapped = rows.map((r) => ({
      studentId: r.student_id,
      turn: r.turn,
      role: r.role as ConversationLogRecord['role'],
      text: r.text,
      nodeId: r.node_id,
      createdAt: r.created_at,
    }));
    return limit ? mapped.slice(-limit) : mapped;
  }

  async appendConversationLog(entry: ConversationLogRecord): Promise<void> {
    this.db
      .prepare(
        'INSERT INTO conversation_log (student_id, turn, role, text, node_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(entry.studentId, entry.turn, entry.role, entry.text, entry.nodeId, entry.createdAt);
  }

  async addRoadmapItem(item: RoadmapItemRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO roadmap_items (student_id, item_id, category, title, description, link, "order", status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, item_id) DO UPDATE SET status = excluded.status`
      )
      .run(
        item.studentId,
        item.itemId,
        item.category,
        item.title,
        item.description,
        item.link ?? null,
        item.order,
        item.status,
        item.createdAt
      );
  }

  async getRoadmapItems(studentId: string): Promise<RoadmapItemRecord[]> {
    const rows = this.db
      .prepare('SELECT * FROM roadmap_items WHERE student_id = ? ORDER BY "order" ASC')
      .all(studentId) as unknown as {
      student_id: string;
      item_id: string;
      category: string;
      title: string;
      description: string;
      link: string | null;
      order: number;
      status: string;
      created_at: string;
    }[];
    return rows.map((r) => ({
      studentId: r.student_id,
      itemId: r.item_id,
      category: r.category as RoadmapItemRecord['category'],
      title: r.title,
      description: r.description,
      link: r.link ?? undefined,
      order: r.order,
      status: r.status as RoadmapStatus,
      createdAt: r.created_at,
    }));
  }

  async setRoadmapItems(studentId: string, items: RoadmapItemRecord[]): Promise<void> {
    this.db.prepare('DELETE FROM roadmap_items WHERE student_id = ?').run(studentId);
    for (const item of items) await this.addRoadmapItem(item);
  }

  async setRoadmapItemStatus(studentId: string, itemId: string, status: RoadmapStatus): Promise<void> {
    this.db
      .prepare('UPDATE roadmap_items SET status = ? WHERE student_id = ? AND item_id = ?')
      .run(status, studentId, itemId);
  }

  async getCheckin(studentId: string): Promise<CheckinRecord | null> {
    const row = this.db.prepare('SELECT * FROM checkins WHERE student_id = ?').get(studentId) as
      | { student_id: string; last_checkin_at: string | null; next_due_at: string | null }
      | undefined;
    return row
      ? { studentId: row.student_id, lastCheckinAt: row.last_checkin_at ?? undefined, nextDueAt: row.next_due_at ?? undefined }
      : null;
  }

  async setCheckin(c: CheckinRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO checkins (student_id, last_checkin_at, next_due_at) VALUES (?, ?, ?)
         ON CONFLICT(student_id) DO UPDATE SET last_checkin_at = excluded.last_checkin_at, next_due_at = excluded.next_due_at`
      )
      .run(c.studentId, c.lastCheckinAt ?? null, c.nextDueAt ?? null);
  }
}
