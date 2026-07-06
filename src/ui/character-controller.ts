import type { AnimationState, Arm, Gesture } from '@/engine/types';

/**
 * The only touchpoint between the conversation engine and any renderer.
 * GsapAvatar implements this now; RiveAvatar implements the same interface
 * once a real .riv asset exists -- no engine/chat code needs to change either way.
 */
export interface CharacterController {
  play(state: AnimationState): void;
  /** Optional: speak a line aloud (TTS) and react with mood/gesture while doing so.
   * Only the WebGL avatar implements this; other renderers simply don't have it.
   * `celebrate` forces the happy/thumbsup reaction (stage-complete moments)
   * instead of leaving mood detection to guess from the text. `gesture`/`arm`
   * are authored per-node (deterministic, same node -> same gesture every time);
   * when omitted, the renderer falls back to keyword mood-detection on `text`. */
  speak?(text: string, opts?: { celebrate?: boolean; gesture?: Gesture; arm?: Arm }): void;
}
