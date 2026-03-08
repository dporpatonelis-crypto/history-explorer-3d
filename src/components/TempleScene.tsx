import { useRef, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Marble floor ─── */
export function MarbleFloor() {
  return (
    <group>
      {/* Main marble platform area — matched with temple stone palette */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="hsl(35, 12%, 78%)" roughness={0.4} metalness={0.03} />
      </mesh>
      {/* Dirt/earth ground extending outward */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="hsl(32, 30%, 38%)" roughness={0.95} metalness={0.0} />
      </mesh>
    </group>
  );
}

/* ─── Single Doric column ─── */
function Column({ position }: { position: [number, number, number] }) {
  const segments = 16;
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.3, segments]} />
        <meshStandardMaterial color="hsl(35, 12%, 78%)" roughness={0.4} />
      </mesh>
      {/* Shaft */}
      <mesh position={[0, 2.5, 0]} receiveShadow>
        <cylinderGeometry args={[0.35, 0.45, 4.7, segments]} />
        <meshStandardMaterial color="hsl(38, 14%, 82%)" roughness={0.35} />
      </mesh>
      {/* Capital */}
      <mesh position={[0, 4.95, 0]} receiveShadow>
        <cylinderGeometry args={[0.6, 0.35, 0.2, segments]} />
        <meshStandardMaterial color="hsl(35, 12%, 78%)" roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ─── Architrave beam between two points ─── */
function Beam({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
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
}

/* ─── Steps / platform ─── */
function Platform() {
  return (
    <group>
      {[0, 0.15, 0.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} receiveShadow>
          <boxGeometry args={[14 - i * 0.6, 0.15, 10 - i * 0.4]} />
          <meshStandardMaterial color="hsl(35, 10%, 80%)" roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}



/* ─── Greek Kiosk ─── */
function KioskModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF('/models/greek_kiosk.glb');

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
}

/* ─── Temple scene ─── */
export function TempleScene() {
  // 16 columns in a circle, radius ~20 from kiosk center (0, 0, -4)
  const numCols = 16;
  const radius = 20;
  const centerX = 0;
  const centerZ = -4;
  const circleCols: [number, number, number][] = [];
  for (let i = 0; i < numCols; i++) {
    const angle = (i / numCols) * Math.PI * 2;
    circleCols.push([
      centerX + Math.sin(angle) * radius,
      0.3,
      centerZ + Math.cos(angle) * radius,
    ]);
  }

  // Architrave pairs around the circle
  const circlePairs = circleCols.map((col, i) => ({
    from: col,
    to: circleCols[(i + 1) % numCols],
  }));

  return (
    <group>
      <Platform />

      {/* Greek Kiosk — main environment piece */}
      <Suspense fallback={null}>
        <KioskModel position={[0, 0.3, -4]} scale={5} />
      </Suspense>


      {/* Circular colonnade */}
      {circleCols.map((pos, i) => <Column key={i} position={pos} />)}
      {circlePairs.map((p, i) => (
        <Beam key={`c${i}`} from={p.from} to={p.to} />
      ))}
    </group>
  );
}

/* ─── Lighting ─── */
export function SceneLighting() {
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
}
