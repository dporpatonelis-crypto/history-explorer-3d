import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

const TURN_STEP = Math.PI / 6; // 30° snap turn — comfortable, no motion sickness
const DEADZONE = 0.6;
const BOUNDS = 22;
const MAX_TELEPORT = 18;

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Comfort locomotion for Meta Quest:
 *  - left thumbstick forward -> aim teleport marker, release -> teleport
 *  - right thumbstick left/right -> 30° snap turn
 */
export function VRLocomotion() {
  const { player, controllers, isPresenting } = useXR();
  const [marker, setMarker] = useState<[number, number, number] | null>(null);
  const aiming = useRef(false);
  const turnLatch = useRef(false);

  const origin = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const hit = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());

  useFrame(() => {
    if (!isPresenting || !player) {
      if (marker) setMarker(null);
      return;
    }

    let leftPushed = false;

    for (const controller of controllers) {
      const gamepad = controller.inputSource?.gamepad;
      if (!gamepad) continue;
      const axes = gamepad.axes ?? [];
      const x = Math.abs(axes[2] ?? 0) > 0.01 ? axes[2] : (axes[0] ?? 0);
      const y = Math.abs(axes[3] ?? 0) > 0.01 ? axes[3] : (axes[1] ?? 0);
      const hand = controller.inputSource?.handedness;

      if (hand === 'right') {
        if (Math.abs(x) > DEADZONE) {
          if (!turnLatch.current) {
            player.rotation.y -= Math.sign(x) * TURN_STEP;
            turnLatch.current = true;
          }
        } else {
          turnLatch.current = false;
        }
        continue;
      }

      // Left controller: teleport aiming
      if (-y > DEADZONE) {
        leftPushed = true;
        const obj = controller.controller;
        obj.getWorldPosition(origin.current);
        obj.getWorldDirection(dir.current).negate(); // controller points along -Z
        raycaster.current.set(origin.current, dir.current);
        const point = raycaster.current.ray.intersectPlane(GROUND, hit.current);
        if (point) {
          const local = point.clone().sub(origin.current);
          if (local.length() > MAX_TELEPORT) {
            local.setLength(MAX_TELEPORT);
            point.copy(origin.current).add(local);
          }
          point.x = THREE.MathUtils.clamp(point.x, -BOUNDS, BOUNDS);
          point.z = THREE.MathUtils.clamp(point.z, -BOUNDS, BOUNDS);
          setMarker([point.x, 0.02, point.z]);
        }
      }
    }

    if (aiming.current && !leftPushed) {
      // stick released -> commit teleport
      if (marker) {
        player.position.x = marker[0];
        player.position.z = marker[2];
      }
      setMarker(null);
    }
    aiming.current = leftPushed;
  });

  if (!marker) return null;

  return (
    <group position={marker}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 32]} />
        <meshBasicMaterial color="hsl(45, 90%, 60%)" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial color="hsl(45, 90%, 60%)" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
