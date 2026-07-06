'use client';

import { Component, forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import type { AnimationState, Arm, Gesture } from '@/engine/types';
import type { CharacterController } from './character-controller';
import { RobotViewer, type RobotViewerRef } from './webgl/RobotViewer';
import RobotAvatar from './RobotAvatar';

type Expression = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'surprised' | 'angry' | 'laughing';
type Mood = 'happy' | 'angry' | 'laughing' | null;

/**
 * `play(state)` only ever gets called for the two pre-reply structural moments
 * (mount -> 'listening', message sent -> 'thinking') -- see PathfinderChat.tsx.
 * The actual reply delivery ('talking'/'celebrating' from the engine) is instead
 * handled entirely by speak(text, opts), which owns expression + gesture + TTS
 * as one atomic step. Splitting delivery across both play() and speak() used to
 * double-fire the same gesture (e.g. thumbsup from play('celebrating') AND again
 * from speak()'s mood detection), which reset the arm animation mid-cycle.
 */
const EXPRESSION: Record<AnimationState, Expression> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  talking: 'speaking',
  celebrating: 'happy',
};

/** Lightweight keyword heuristic -- picks a mood to color the face/voice while
 * a bot line is spoken. No sentiment model available client-side, so this is
 * intentionally simple; extend the word lists if it misses your app's phrasing. */
function detectMood(text: string): Mood {
  const t = text.toLowerCase();
  if (/\b(haha|lol|hilarious|so funny|that's funny|lmao)\b/.test(t)) return 'laughing';
  if (/\b(great|awesome|congrat|amazing|fantastic|well done|nice job|love that|exciting|🎉)\b/.test(t)) return 'happy';
  if (/\b(unfortunately|sorry|mistake|that's wrong|incorrect|can't do that|cannot do that|error occurred|not allowed)\b/.test(t)) return 'angry';
  return null;
}

/**
 * WebGL (raw three.js) primary renderer, replacing the Spline mascot. Implements
 * the same CharacterController contract as SplineAvatar/RobotAvatar did, so the
 * engine/chat code never changes. Falls back to the 2D RobotAvatar if the WebGL
 * canvas throws (e.g. context creation failure) -- mirrors SplineAvatar's onError
 * fallback pattern, just triggered by a render-time try/catch instead of Spline's
 * onError callback since RobotViewer has no equivalent load-failure hook.
 */
const WebglRobotAvatar = forwardRef<CharacterController>(function WebglRobotAvatar(_props, ref) {
  const [failed, setFailed] = useState(false);
  const [expression, setExpression] = useState<Expression>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const viewerRef = useRef<RobotViewerRef>(null);
  const fallbackRef = useRef<CharacterController>(null);

  useImperativeHandle(
    ref,
    () => ({
      play(state: AnimationState) {
        if (failed) {
          fallbackRef.current?.play(state);
          return;
        }
        setExpression(EXPRESSION[state]);
        setIsSpeaking(state === 'talking');
        if (state === 'listening') viewerRef.current?.playRoboticSound('listening');
        if (state === 'thinking') viewerRef.current?.playRoboticSound('thinking');
      },
      speak(text: string, opts?: { celebrate?: boolean; gesture?: Gesture; arm?: Arm }) {
        if (failed) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const mood: Mood = opts?.celebrate ? 'happy' : detectMood(text);
        const moodExpression: Expression =
          mood === 'angry' ? 'angry' : mood === 'laughing' ? 'laughing' : mood === 'happy' ? 'happy' : 'speaking';

        setExpression(moodExpression);
        setIsSpeaking(true);
        // Exactly one gesture call per delivered line -- this is the only place
        // that triggers a gesture for a reply, so it can never double-fire.
        // Scripted per-node gesture (deterministic -- same node, same gesture,
        // every time) takes priority over keyword mood-detection, which stays
        // as the fallback for free-text llm/hybrid nodes that have no authored
        // gesture at all.
        if (opts?.gesture) viewerRef.current?.triggerGestureAnimation(opts.gesture, opts.arm);
        else if (mood === 'laughing') viewerRef.current?.triggerGestureAnimation('wave');
        else if (mood === 'happy') viewerRef.current?.triggerGestureAnimation('thumbsup');
        else if (mood === 'angry') viewerRef.current?.triggerGestureAnimation('stop');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02;
        utterance.pitch = mood === 'angry' ? 0.85 : mood === 'laughing' ? 1.15 : 1.0;
        const finish = () => {
          setIsSpeaking(false);
          setExpression('idle');
          // Release the gesture exactly when speech actually ends, so a long
          // line's gesture holds the whole time instead of a fixed 2-2.5s
          // timer relaxing back to idle mid-sentence.
          viewerRef.current?.stopGesture();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      },
    }),
    [failed]
  );

  // If we fell back mid-session, re-assert idle on the fallback so it animates.
  useEffect(() => {
    if (failed) fallbackRef.current?.play('idle');
  }, [failed]);

  // Stop any in-flight speech synthesis when this avatar unmounts (e.g. route change).
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (failed) {
    return (
      <div className="h-full w-full">
        <RobotAvatar ref={fallbackRef} />
      </div>
    );
  }

  return (
    <WebglBoundary onError={() => setFailed(true)}>
      <RobotViewer ref={viewerRef} expression={expression} isSpeaking={isSpeaking} theme="dark" />
    </WebglBoundary>
  );
});

/** Minimal error boundary: WebGL context creation failures throw synchronously
 * from three.js during render/effect, which React surfaces as a render error --
 * catch it here and hand back to the parent to swap in the 2D fallback. */
class WebglBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default WebglRobotAvatar;
