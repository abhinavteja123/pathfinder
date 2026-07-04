import type { AnimationState } from '@/engine/types';

/**
 * The only touchpoint between the conversation engine and any renderer.
 * GsapAvatar implements this now; RiveAvatar implements the same interface
 * once a real .riv asset exists -- no engine/chat code needs to change either way.
 */
export interface CharacterController {
  play(state: AnimationState): void;
}
