import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VISEMES, getVisemeWeights, type Viseme } from '@/lib/lipsync';

interface MorphTarget {
  mesh: THREE.Mesh;
  index: number;
}

/**
 * Drives viseme morph targets (+ idle blinking) of an avatar head.
 * No-op when the model has no ARKit/Oculus viseme blendshapes.
 */
export function useLipSync(root: THREE.Object3D | null, npcId: string) {
  const visemeTargets = useMemo(() => {
    const map = new Map<Viseme, MorphTarget[]>();
    const blinks: MorphTarget[] = [];
    if (!root) return { map, blinks, supported: false };

    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const dict = mesh.morphTargetDictionary;
      if (!mesh.isMesh || !dict) return;
      for (const v of VISEMES) {
        const idx = dict[v];
        if (idx === undefined) continue;
        const list = map.get(v) ?? [];
        list.push({ mesh, index: idx });
        map.set(v, list);
      }
      for (const name of ['eyeBlinkLeft', 'eyeBlinkRight']) {
        const idx = dict[name];
        if (idx !== undefined) blinks.push({ mesh, index: idx });
      }
    });

    return { map, blinks, supported: map.size > 2 };
  }, [root]);

  const nextBlink = useRef(2 + Math.random() * 3);

  useEffect(() => () => {
    visemeTargets.map.forEach((targets) =>
      targets.forEach(({ mesh, index }) => {
        if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = 0;
      }),
    );
  }, [visemeTargets]);

  useFrame((_, delta) => {
    if (!visemeTargets.supported) return;
    const weights = getVisemeWeights(npcId);

    visemeTargets.map.forEach((targets, viseme) => {
      const target = weights?.[viseme] ?? 0;
      targets.forEach(({ mesh, index }) => {
        const infl = mesh.morphTargetInfluences;
        if (!infl) return;
        // smooth toward target so the mouth never snaps
        infl[index] += (target - infl[index]) * Math.min(1, delta * 18);
      });
    });

    // idle blinking
    nextBlink.current -= delta;
    const blinkPhase = nextBlink.current;
    const blinkWeight = blinkPhase < 0 && blinkPhase > -0.14 ? 1 : 0;
    if (blinkPhase < -0.14) nextBlink.current = 2.5 + Math.random() * 3.5;
    visemeTargets.blinks.forEach(({ mesh, index }) => {
      const infl = mesh.morphTargetInfluences;
      if (!infl) return;
      infl[index] += (blinkWeight - infl[index]) * Math.min(1, delta * 22);
    });
  });

  return visemeTargets.supported;
}
