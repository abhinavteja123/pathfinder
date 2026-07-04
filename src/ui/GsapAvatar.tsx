'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import type { AnimationState } from '@/engine/types';
import type { CharacterController } from './character-controller';

const STATE_STYLES: Record<AnimationState, { scale: number; rotate: number; color: string }> = {
  idle: { scale: 1, rotate: 0, color: '#6366f1' },
  listening: { scale: 1.06, rotate: 0, color: '#22c55e' },
  thinking: { scale: 0.94, rotate: 6, color: '#f59e0b' },
  talking: { scale: 1.08, rotate: -4, color: '#3b82f6' },
  celebrating: { scale: 1.2, rotate: 0, color: '#ec4899' },
};

/**
 * Phase 2 default renderer: a GSAP-driven placeholder avatar. No external
 * asset required, so it is demoable today. RiveAvatar (same CharacterController
 * contract) takes over once a real .riv character exists.
 *
 * Has a simple face (eyes + mouth) and a continuous per-state idle loop --
 * a static color-swapping blob reads as "loading spinner", not "character".
 * Each play() kills the previous loop before starting the next one so loops
 * never stack.
 */
const GsapAvatar = forwardRef<CharacterController>(function GsapAvatar(_props, ref) {
  const blobRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const eyeLRef = useRef<HTMLDivElement>(null);
  const eyeRRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<gsap.core.Timeline | null>(null);

  useImperativeHandle(ref, () => ({
    play(state: AnimationState) {
      const el = blobRef.current;
      const eyeL = eyeLRef.current;
      const eyeR = eyeRRef.current;
      const mouth = mouthRef.current;
      if (!el || !eyeL || !eyeR || !mouth) return;
      const style = STATE_STYLES[state];

      loopRef.current?.kill();
      gsap.set(el, { y: 0 });
      gsap.set([eyeL, eyeR], { scaleY: 1, y: 0 });
      gsap.set(mouth, { scaleX: 1, scaleY: 1 });

      gsap.to(el, {
        scale: style.scale,
        rotate: style.rotate,
        backgroundColor: style.color,
        duration: 0.4,
        ease: 'back.out(1.7)',
      });

      if (state === 'celebrating') {
        gsap.set([eyeL, eyeR], { scaleY: 0.35, y: -2 });
        gsap.set(mouth, { scaleX: 1.6, scaleY: 1.6 });
        gsap.to(el, { y: -10, duration: 0.3, repeat: 3, yoyo: true, ease: 'power1.out' });
        if (ringRef.current) {
          gsap.fromTo(
            ringRef.current,
            { scale: 0.8, opacity: 1 },
            { scale: 1.9, opacity: 0, duration: 0.8, ease: 'power2.out' }
          );
        }
        return;
      }

      const tl = gsap.timeline({ repeat: -1 });
      loopRef.current = tl;

      switch (state) {
        case 'idle':
          tl.to(el, { y: -4, duration: 1.2, ease: 'sine.inOut', yoyo: true })
            .to([eyeL, eyeR], { scaleY: 0.15, duration: 0.08, yoyo: true, repeat: 1 }, '+=1.4');
          break;
        case 'listening':
          gsap.set([eyeL, eyeR], { scaleY: 1.25 });
          tl.to(el, { rotate: '+=3', duration: 0.35, yoyo: true, repeat: 1 });
          break;
        case 'thinking':
          gsap.to([eyeL, eyeR], { x: 3, duration: 0.3 });
          tl.to(el, { rotate: '+=12', duration: 0.5, yoyo: true, repeat: 1 });
          break;
        case 'talking':
          tl.to(mouth, { scaleY: 1.8, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.inOut' });
          break;
      }
    },
  }));

  return (
    <div className="relative flex h-32 w-32 items-center justify-center" data-testid="pathfinder-avatar">
      <div ref={ringRef} className="absolute h-24 w-24 rounded-full border-4 border-pink-400 opacity-0" />
      <div
        ref={blobRef}
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500 shadow-lg"
      >
        <div className="absolute top-[26px] flex gap-3">
          <div ref={eyeLRef} className="h-2 w-2 rounded-full bg-white" />
          <div ref={eyeRRef} className="h-2 w-2 rounded-full bg-white" />
        </div>
        <div ref={mouthRef} className="absolute bottom-6 h-1.5 w-4 rounded-full bg-white/90" />
      </div>
    </div>
  );
});

export default GsapAvatar;
