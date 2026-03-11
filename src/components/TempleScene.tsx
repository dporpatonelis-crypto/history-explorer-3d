import { useRef, Suspense, useMemo, memo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Marble floor ─── */
export const MarbleFloor = memo(function MarbleFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="hsl(34, 25%, 45%)" roughness={0.55} metalness={0.03} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="hsl(34, 22%, 52%)" roughness={0.95} metalness={0.0} />
      </mesh>
    </group>
  );
});

/* ─── Single Doric column (reduced segments) ─── */
const Column = memo(function Column({ position }: { position: [number, number, number] }) {
  const segments = 10;
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.3, segments]} />
        <meshStandardMaterial color="hsl(35, 12%, 78%)" roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 0]} receiveShadow>
        <cylinderGeometry args={[0.35, 0.45, 4.7, segments]} />
        <meshStandardMaterial color="hsl(38, 14%, 82%)" roughness={0.35} />
      </mesh>
      <mesh position={[0, 4.95, 0]} receiveShadow>
        <cylinderGeometry args={[0.6, 0.35, 0.2, segments]} />
        <meshStandardMaterial color="hsl(35, 12%, 78%)" roughness={0.4} />
      </mesh>
    </group>
  );
});

/* ─── Architrave beam ─── */
const Beam = memo(function Beam({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[2] + to[2]) / 2;
  const length = Math.sqrt((to[0] - from[0]) ** 2 + (to[2] - from[2]) ** 2);
  const angle = Math.atan2(to[2] - from[2], to[0] - from[0]);

  return (
    <mesh position={[midX, 5.15, midZ]} rotation={[0, -angle, 0]} receiveShadow>
      <boxGeometry args={[length + 0.1, 0.35, 0.7]} />
      <meshStandardMaterial color="hsl(36, 13%, 76%)" roughness={0.4} />
    </mesh>
  );
});

/* ─── Steps / platform ─── */
/* Platform removed — all objects grounded at y=0 */

/* ─── Reusable GLB model ─── */
const StaticGLBModel = memo(function StaticGLBModel({ url, position, scale = 1 }: { url: string; position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF(url);

  const { cloned, normalizedScale, offset } = useMemo(() => {
    const clonedScene = scene.clone(true);
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = (2 * scale) / maxDim;
    const center = box.getCenter(new THREE.Vector3());
    return {
      cloned: clonedScene,
      normalizedScale: s,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, scale]);

  return (
    <group position={position}>
      <group scale={[normalizedScale, normalizedScale, normalizedScale]}>
        <primitive object={cloned} position={offset} />
      </group>
    </group>
  );
});

/* ─── Permanent decorative trees ─── */
const TREE_MODEL = '/models/tree compressed (2).glb';
const TREE_SCALE = 6;
const TREES: [number, number, number][] = [
  [-10, 0, 0.8],
  [-9, 0, 5],
  [-10, 0, 9],
  [-11, 0, 10.5],
  [10, 0, 0.8],
  [9, 0, 5],
  [10, 0, 9],
  [11, 0, 10.5],
];

/* ─── Precomputed colonnade data (module-level, zero per-render cost) ─── */
const NUM_COLS = 16;
const RADIUS = 20;
const CENTER_X = 0;
const CENTER_Z = -4;

const CIRCLE_COLS: [number, number, number][] = [];
for (let i = 0; i < NUM_COLS; i++) {
  const angle = (i / NUM_COLS) * Math.PI * 2;
  CIRCLE_COLS.push([
    CENTER_X + Math.sin(angle) * RADIUS,
    0,
    CENTER_Z + Math.cos(angle) * RADIUS,
  ]);
}
const CIRCLE_PAIRS = CIRCLE_COLS.map((col, i) => ({
  from: col,
  to: CIRCLE_COLS[(i + 1) % NUM_COLS],
}));

/* ─── Temple scene ─── */
export const TempleScene = memo(function TempleScene() {
  return (
    <group>
      <Suspense fallback={null}>
        <StaticGLBModel url="/models/greek_kiosk.glb" position={[0, 0, -4]} scale={5} />
        {TREES.map((pos, i) => (
          <StaticGLBModel key={`tree-${i}`} url={TREE_MODEL} position={pos} scale={TREE_SCALE} />
        ))}
      </Suspense>
      {CIRCLE_COLS.map((pos, i) => <Column key={i} position={pos} />)}
      {CIRCLE_PAIRS.map((p, i) => (
        <Beam key={`c${i}`} from={p.from} to={p.to} />
      ))}
    </group>
  );
});

/* ─── Lighting ─── */
export const SceneLighting = memo(function SceneLighting() {
  const dirLight = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      <ambientLight intensity={0.6} color="hsl(45, 60%, 95%)" />
      <directionalLight
        ref={dirLight}
        position={[8, 12, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={256}
        shadow-mapSize-height={256}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        color="hsl(40, 80%, 95%)"
      />
      <hemisphereLight args={['hsl(210, 40%, 70%)', 'hsl(30, 30%, 60%)', 0.4]} />
      <fog attach="fog" args={['hsl(40, 20%, 90%)', 15, 40]} />
    </>
  );
});
