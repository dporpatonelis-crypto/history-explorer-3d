import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

const SPEED = 2.2;        // meters / second
const TURN_SPEED = 1.8;   // radians / second
const DEADZONE = 0.15;
const BOUNDS = 24;        // keep the player inside the colonnade

/**
 * Meta Quest style locomotion:
 *  - left thumbstick  -> smooth move (relative to head direction)
 *  - right thumbstick -> snap-free smooth turn
 */
export function VRLocomotion() {
  const { player, controllers, isPresenting } = useXR();
  const { camera } = useThree();
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!isPresenting || !player) return;

    for (const controller of controllers) {
      const gamepad = controller.inputSource?.gamepad;
      if (!gamepad) continue;

      const axes = gamepad.axes ?? [];
      // WebXR standard mapping: axes[2]/[3] is the thumbstick, [0]/[1] is the fallback
      const x = Math.abs(axes[2] ?? 0) > DEADZONE ? axes[2] : (Math.abs(axes[0] ?? 0) > DEADZONE ? axes[0] : 0);
      const y = Math.abs(axes[3] ?? 0) > DEADZONE ? axes[3] : (Math.abs(axes[1] ?? 0) > DEADZONE ? axes[1] : 0);
      if (!x && !y) continue;

      if (controller.inputSource?.handedness === 'right') {
        player.rotation.y -= x * TURN_SPEED * delta;
      } else {
        camera.getWorldDirection(forward.current);
        forward.current.y = 0;
        forward.current.normalize();
        right.current.crossVectors(forward.current, new THREE.Vector3(0, 1, 0)).normalize();

        player.position.addScaledVector(forward.current, -y * SPEED * delta);
        player.position.addScaledVector(right.current, x * SPEED * delta);
        player.position.x = THREE.MathUtils.clamp(player.position.x, -BOUNDS, BOUNDS);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -BOUNDS, BOUNDS);
      }
    }
  });

  return null;
}
