import { Suspense, useEffect, useMemo, memo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface ScenarioProp {
  id?: string;
  glbModel: string;
  position_x?: number;
  position_y?: number;
  position_z?: number;
  rotation?: number;
  scale?: number;
  idle?: boolean;
}

const PropModel = memo(function PropModel({ prop }: { prop: ScenarioProp }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(prop.glbModel);

  const { cloned, normalizedScale, offset } = useMemo(() => {
    const clonedScene = cloneSkeleton(scene);
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    clonedScene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const center = box.getCenter(new THREE.Vector3());
    return {
      cloned: clonedScene,
      normalizedScale: (1.8 / maxDim) * (prop.scale || 1),
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, prop.scale]);

  const { actions } = useAnimations(animations, cloned);

  useEffect(() => {
    const first = Object.values(actions)[0];
    if (!first || prop.idle === false) return;

    first.reset().fadeIn(0.3).play();
    return () => {
      first.fadeOut(0.2);
      first.stop();
    };
  }, [actions, prop.idle]);

  const baseY = prop.position_y ?? 0;
  useFrame(({ clock }) => {
    if (!groupRef.current || prop.idle === false || animations.length) return;
    groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 1.2) * 0.02;
  });

  return (
    <group
      ref={groupRef}
      position={[prop.position_x ?? 0, baseY, prop.position_z ?? 0]}
      rotation={[0, ((prop.rotation ?? 0) * Math.PI) / 180, 0]}
    >
      <group scale={[normalizedScale, normalizedScale, normalizedScale]}>
        <primitive object={cloned} position={offset} />
      </group>
    </group>
  );
});

export const ScenarioProps = memo(function ScenarioProps({ props: items }: { props?: ScenarioProp[] }) {
  if (!items?.length) return null;
  return (
    <Suspense fallback={null}>
      {items
        .filter((p) => p.glbModel?.trim())
        .map((p, i) => (
          <PropModel key={p.id ?? `${p.glbModel}-${i}`} prop={p} />
        ))}
    </Suspense>
  );
});
