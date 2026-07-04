'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import type { AnimationState } from '@/engine/types';
import type { CharacterController } from './character-controller';

/**
 * 2D illustrated robot fallback -- a rounded-helmet astronaut companion with a
 * glowing visor, curved "happy" eyes and a waving arm, in the same visual
 * language as the 3D GENKUB Spline mascot. This is the graceful fallback for
 * SplineAvatar (shown if /mascot.splinecode fails to load). It is deliberately
 * NOT the old dot-eyes color blob -- that read as a generic chatbot and was
 * rejected. Same CharacterController contract, driven by GSAP per state.
 */
const RobotAvatar = forwardRef<CharacterController>(function RobotAvatar(_props, ref) {
  const rootRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const armRef = useRef<SVGGElement>(null);
  const visorRef = useRef<SVGRectElement>(null);
  const loopRef = useRef<gsap.core.Timeline | null>(null);

  useImperativeHandle(ref, () => ({
    play(state: AnimationState) {
      const root = rootRef.current;
      const eyes = eyesRef.current;
      const arm = armRef.current;
      const visor = visorRef.current;
      if (!root || !eyes || !arm || !visor) return;

      loopRef.current?.kill();
      // The idle/listening/talking cases start standalone repeat:-1 tweens on
      // arm/eyes OUTSIDE the timeline; killing only loopRef would leak them
      // across state changes (e.g. the idle wave keeps running under thinking).
      gsap.killTweensOf([root, eyes, arm]);
      gsap.set(root, { rotate: 0, transformOrigin: '50% 60%' });
      gsap.set(eyes, { scaleY: 1, y: 0, transformOrigin: '50% 50%' });
      gsap.set(arm, { rotate: 0, transformOrigin: '86% 44%' });
      gsap.to(visor, { attr: { fill: VISOR_COLOR[state] }, duration: 0.4 });

      const tl = gsap.timeline({ repeat: -1 });
      loopRef.current = tl;

      switch (state) {
        case 'idle':
          tl.to(root, { y: -6, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 1 })
            .to(eyes, { scaleY: 0.1, duration: 0.09, yoyo: true, repeat: 1 }, '+=1.2');
          gsap.to(arm, { rotate: -18, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          break;
        case 'listening':
          gsap.set(eyes, { scaleY: 1.25 });
          tl.to(root, { rotate: 4, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 });
          gsap.to(arm, { rotate: -34, duration: 0.5, ease: 'back.out(2)', yoyo: true, repeat: -1 });
          break;
        case 'thinking':
          gsap.to(eyes, { x: 4, y: -3, duration: 0.4 });
          tl.to(root, { rotate: -8, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: 1 });
          break;
        case 'talking':
          tl.to(eyes, { scaleY: 0.82, duration: 0.14, yoyo: true, repeat: 1, ease: 'sine.inOut' });
          gsap.to(arm, { rotate: -12, duration: 0.32, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          break;
        case 'celebrating':
          gsap.set(eyes, { scaleY: 0.35, y: -2 });
          tl.to(root, { y: -16, duration: 0.32, ease: 'power1.out', yoyo: true, repeat: 1 });
          gsap.fromTo(arm, { rotate: -40 }, { rotate: -60, duration: 0.2, yoyo: true, repeat: -1 });
          break;
      }
    },
  }));

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 200 230"
      className="h-full w-full drop-shadow-[0_18px_40px_rgba(56,225,255,0.28)]"
      data-testid="pathfinder-avatar"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="body-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c7cbe6" />
        </linearGradient>
        <radialGradient id="visor-glow" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#38e1ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#38e1ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* body */}
      <ellipse cx="100" cy="196" rx="46" ry="24" fill="#0b0a1e" opacity="0.5" />
      <path
        d="M62 150c0-24 17-38 38-38s38 14 38 38v6c0 20-17 32-38 32s-38-12-38-32z"
        fill="url(#body-g)"
      />
      {/* arms */}
      <g ref={armRef}>
        <rect x="150" y="130" width="16" height="40" rx="8" fill="url(#body-g)" />
      </g>
      <rect x="34" y="140" width="16" height="38" rx="8" fill="url(#body-g)" />

      {/* head */}
      <rect x="52" y="40" width="96" height="90" rx="40" fill="url(#body-g)" />
      {/* antenna */}
      <line x1="100" y1="40" x2="100" y2="22" stroke="#c7cbe6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="18" r="6" fill="#38e1ff" className="glow-pulse" />

      {/* visor + eyes */}
      <ellipse cx="100" cy="86" rx="52" ry="44" fill="url(#visor-glow)" opacity="0.5" />
      <rect ref={visorRef} x="62" y="58" width="76" height="58" rx="26" fill="#0c1030" />
      <g ref={eyesRef}>
        <path d="M78 92c4-9 14-9 18 0" fill="none" stroke="#5ef0ff" strokeWidth="6" strokeLinecap="round" />
        <path d="M104 92c4-9 14-9 18 0" fill="none" stroke="#5ef0ff" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
});

const VISOR_COLOR: Record<AnimationState, string> = {
  idle: '#0c1030',
  listening: '#0d1f2e',
  thinking: '#241a0c',
  talking: '#0c1836',
  celebrating: '#26102a',
};

export default RobotAvatar;
