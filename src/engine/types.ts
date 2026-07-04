export type Year = 1 | 2 | 3 | 4;
export type Program = 'BTech' | 'BBA';
export type AnimationState = 'idle' | 'listening' | 'thinking' | 'talking' | 'celebrating';
export type NodeKind = 'fixed' | 'llm' | 'hybrid';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MenuOption {
  label: string;
  next: string;
}

export interface FixedNode {
  id: string;
  kind: 'fixed';
  /** Supports {answers.KEY} interpolation against EngineContext.answers */
  say: string;
  options?: MenuOption[];
  next?: string;
  captureAs?: string;
  /** Marks the stage (Discover/Build/Convert/Launch) as complete when reached */
  terminal?: boolean;
}

export interface LlmNode {
  id: string;
  kind: 'llm';
  systemPrompt: string;
  next: string;
  captureAs?: string;
  terminal?: boolean;
}

export interface HybridNode {
  id: string;
  kind: 'hybrid';
  /** profile_answers keys this node still needs filled */
  slots: string[];
  phrasingPrompt: string;
  next: string;
  terminal?: boolean;
}

export type EngineNode = FixedNode | LlmNode | HybridNode;

export interface EngineContext {
  studentId: string;
  year: Year;
  program: Program;
  hasHistory: boolean;
  answers: Record<string, string>;
  history: ChatMessage[];
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
  animationState: AnimationState;
  stageComplete: boolean;
}

export interface StatusResponse {
  onboardingComplete: boolean;
  reengagementDue: boolean;
  year: Year;
}
