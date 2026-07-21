export type Year = 1 | 2 | 3 | 4;
export type Program = 'BTech' | 'BBA';
export type AnimationState = 'idle' | 'listening' | 'thinking' | 'talking' | 'celebrating';
/** Matches RobotViewerRef.triggerGestureAnimation's gesture union exactly. */
export type Gesture = 'wave' | 'thumbsup' | 'peace' | 'stop' | 'handshake';
export type Arm = 'left' | 'right';

export interface MenuOption {
  label: string;
  next: string;
}

/**
 * The one and only node kind. The bot is now 100% rule-based -- there are no
 * LLM/hybrid nodes any more, so every conversation node is authored, static
 * data that lives in the JSON question trees (src/engine/content/*.json) and is
 * validated by node-schema.ts at load. A node either shows a menu (`options` /
 * the per-branch/program/answer overrides) or takes a free-text answer, and
 * always captures via `captureAs` and advances via a matched option or `next`.
 */
export interface FixedNode {
  id: string;
  /** Supports {answers.KEY} interpolation against EngineContext.answers */
  say: string;
  options?: MenuOption[];
  /** Optional per-program override for `options` (e.g. the domain menu differs
   * for BTech vs BBA). Falls back to `options` when the program has no entry. */
  optionsByProgram?: Partial<Record<Program, MenuOption[]>>;
  /** Optional per-branch override, keyed by answers.branch (CSE/ECE/Civil/EEE/
   * Mechanical -- seeded at login, not asked in chat). Wins over optionsByProgram;
   * falls through when the student has no branch answer (e.g. BBA). */
  optionsByBranch?: Record<string, MenuOption[]>;
  /** Optional per-answer override, keyed by any captured answer (e.g. domain).
   * Resolved FIRST in fsm.ts nodeOptions -- wins over optionsByBranch/
   * optionsByProgram/options; falls through when the answer is missing or has
   * no map entry. Lets one node show a different menu per prior choice. */
  optionsByAnswer?: { key: string; map: Record<string, MenuOption[]> };
  /** Multi-select menu: the UI renders checkboxes and sends the chosen option
   * labels as ONE comma-joined string ("Git, SQL, REST APIs"). fsm captures it
   * whole into captureAs and advances via `next` (no per-option matching). */
  multi?: boolean;
  next?: string;
  captureAs?: string;
  /** Optional: pick `say` from a scripted lookup keyed by a captured answer
   * (e.g. the domain menu choice) instead of one static string -- lets a
   * single node give a different canned line per answer. Falls back to
   * `fallback`, or to `say` itself if no fallback given. */
  sayByAnswer?: { key: string; map: Record<string, string>; fallback?: string };
  /** Marks the stage (Discover/Build/Convert/Launch) as complete when reached */
  terminal?: boolean;
  /** Authored gesture for this exact moment -- deterministic, same node always
   * plays the same gesture. */
  gesture?: Gesture;
  arm?: Arm;
}

export type EngineNode = FixedNode;

export interface EngineContext {
  studentId: string;
  year: Year;
  program: Program;
  hasHistory: boolean;
  /** True when the student's 14-day check-in is due -- routes returning
   * students into the 5-question FOLLOWUP track instead of the brief resume. */
  reengagementDue: boolean;
  answers: Record<string, string>;
  /** Short authored phrase referencing saved/started/done roadmap items, e.g.
   * "You've got 2 saved on your roadmap. " -- empty string if nothing to report.
   * Computed server-side (turn/route.ts) before processTurn; interpolated via
   * {roadmapProgress} in returning-student nodes. */
  roadmapProgress?: string;
}

export interface TurnRequest {
  studentId: string;
  /** Current node id the student is responding to, or 'start' to begin/resume a session */
  nodeId: string;
  input?: string;
}

export interface TurnResponse {
  nodeId: string;
  say: string;
  options?: MenuOption[];
  /** True when this node's options are a multi-select (checkbox) menu -- the
   * client submits the picked labels as one comma-joined string. */
  multiSelect?: boolean;
  animationState: AnimationState;
  stageComplete: boolean;
  gesture?: Gesture;
  arm?: Arm;
}

export interface StatusResponse {
  onboardingComplete: boolean;
  reengagementDue: boolean;
  year: Year;
  /** Does this student have any prior conversation turns at all? Lets the
   * client decide whether to show the first-time guided tour before the chat. */
  hasHistory: boolean;
}
