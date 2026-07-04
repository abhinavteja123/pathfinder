'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import type { AnimationState } from '@/engine/types';
import type { CharacterController } from './character-controller';
import GsapAvatar from './GsapAvatar';

const RIV_SRC = '/mascot.riv';
const STATE_MACHINE_NAME = 'PathfinderStateMachine';
const STATE_INPUT_NAME = 'state';

const STATE_NUMBERS: Record<AnimationState, number> = {
  idle: 0,
  listening: 1,
  thinking: 2,
  talking: 3,
  celebrating: 4,
};

/**
 * Phase 2 stretch renderer. Expects a `public/mascot.riv` character authored
 * in the Rive editor (rive.app) with a "PathfinderStateMachine" state machine
 * and a number input named "state" (0-4, matching STATE_NUMBERS). No such
 * asset exists yet -- this falls back to GsapAvatar so nothing breaks until
 * a designer produces one. Swapping the asset in later requires no code change.
 */
const RiveAvatar = forwardRef<CharacterController>(function RiveAvatar(_props, ref) {
  const [failed, setFailed] = useState(false);
  const { rive, RiveComponent } = useRive({
    src: RIV_SRC,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    onLoadError: () => setFailed(true),
  });
  const stateInput = useStateMachineInput(rive, STATE_MACHINE_NAME, STATE_INPUT_NAME);

  useImperativeHandle(
    ref,
    () => ({
      play(state: AnimationState) {
        if (stateInput) stateInput.value = STATE_NUMBERS[state];
      },
    }),
    [stateInput]
  );

  if (failed) {
    return <GsapAvatar ref={ref} />;
  }

  return (
    <div className="h-40 w-40" data-testid="pathfinder-avatar-rive">
      <RiveComponent />
    </div>
  );
});

export default RiveAvatar;
