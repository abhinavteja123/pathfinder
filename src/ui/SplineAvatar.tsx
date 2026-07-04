'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import type { Application } from '@splinetool/runtime';
import type { AnimationState } from '@/engine/types';
import type { CharacterController } from './character-controller';
import RobotAvatar from './RobotAvatar';

// The Spline runtime logs a benign `console.error('Missing property')` from
// buildTimeline when a community scene (GENKUB) has a timeline keyframe
// targeting a property absent from the exported runtime data. It is non-fatal
// (the robot renders + animates) but Next's dev overlay surfaces every
// console.error as an "Issue". Suppress ONLY that exact message when it
// originates inside the Spline runtime -- every other error still passes
// through untouched. Root fix would be re-exporting a cleaned scene from the
// Spline editor. Runs once, client-only.
if (typeof window !== 'undefined') {
  const w = window as unknown as { __splineWarnPatched?: boolean };
  if (!w.__splineWarnPatched) {
    w.__splineWarnPatched = true;
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      if (args[0] === 'Missing property' && (new Error().stack || '').includes('splinetool')) {
        return;
      }
      original(...(args as []));
    };
  }
}

// Client-only: the Spline runtime touches window/WebGL, so it must not SSR.
const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

// Self-hosted GENKUB scene extracted into public/. Override with a Spline prod
// URL (e.g. https://prod.spline.design/<id>/scene.splinecode) via env if you
// re-export the scene from the editor.
const SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE || '/mascot.splinecode';

// Assumed Spline variable name mapping conversation state -> a number the scene
// can react to. GENKUB is a community asset, so this variable may not exist in
// it; setVariable is wrapped in try/catch and simply no-ops if absent. To make
// the robot state-reactive, open the scene in the Spline editor and add a Number
// variable named "state" (0=idle,1=listening,2=thinking,3=talking,4=celebrating)
// wired to its state machine. The container tilt/scale below gives visible state
// feedback regardless.
const STATE_NUMBERS: Record<AnimationState, number> = {
  idle: 0,
  listening: 1,
  thinking: 2,
  talking: 3,
  celebrating: 4,
};

const CONTAINER_FX: Record<AnimationState, { scale: number; rotate: number }> = {
  idle: { scale: 1, rotate: 0 },
  listening: { scale: 1.03, rotate: 0 },
  thinking: { scale: 0.98, rotate: -3 },
  talking: { scale: 1.02, rotate: 2 },
  celebrating: { scale: 1.08, rotate: 0 },
};

/**
 * Primary Phase 2 renderer: the 3D GENKUB robot (Spline). Implements the same
 * CharacterController contract as RobotAvatar/RiveAvatar, so the engine/chat
 * never change. Falls back to the 2D RobotAvatar if the scene fails to load.
 */
const SplineAvatar = forwardRef<CharacterController>(function SplineAvatar(_props, ref) {
  const [failed, setFailed] = useState(false);
  const appRef = useRef<Application | null>(null);
  const fallbackRef = useRef<CharacterController>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      play(state: AnimationState) {
        if (failed) {
          fallbackRef.current?.play(state);
          return;
        }
        const fx = CONTAINER_FX[state];
        if (boxRef.current) {
          gsap.to(boxRef.current, {
            scale: fx.scale,
            rotate: fx.rotate,
            duration: 0.5,
            ease: 'back.out(1.6)',
            transformOrigin: '50% 60%',
          });
        }
        try {
          appRef.current?.setVariable('state', STATE_NUMBERS[state]);
        } catch {
          /* scene has no "state" variable -- container fx still conveys state */
        }
      },
    }),
    [failed]
  );

  // If we fell back mid-session, re-assert idle on the fallback so it animates.
  useEffect(() => {
    if (failed) fallbackRef.current?.play('idle');
  }, [failed]);

  if (failed) {
    return (
      <div className="h-full w-full">
        <RobotAvatar ref={fallbackRef} />
      </div>
    );
  }

  return (
    <div ref={boxRef} className="h-full w-full">
      <Spline
        scene={SCENE}
        onLoad={(app: Application) => {
          appRef.current = app;
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
});

export default SplineAvatar;
