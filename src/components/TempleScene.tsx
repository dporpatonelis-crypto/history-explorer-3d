import { useRef, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Marble floor ─── */
export function MarbleFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="hsl(40, 15%, 85%)" roughness={0.3} metalness={0.05} />
    </mesh>
  );
}

/* ─── Single Doric column ─── */
function Column({ position }: { position: [number, number, number] }) {
  const segments = 16;
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.3, segments]} />
        <meshStandardMaterial color="hsl(35, 12%, 78%)" roughness={0.4} />
      </mesh>
      {/* Shaft */}
      <mesh position={[0, 2.5, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.35, 0.45, 4.7, segments]} />
        <meshStandardMaterial color="hsl(38, 14%, 82%)" roughness={0.35} />
      </mesh>
      {/* Capital */}
      <mesh position={[0, 4.95, 0]} receiveShadow castShadow>
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
    <mesh position={[midX, 5.15, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
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

/* ─── GLB Pedestal ─── */
function GLBPedestal({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF('/models/pedestal.glb');
  const cloned = scene.clone(true);

  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(cloned);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = (1.5 * scale) / maxDim;
  const center = box.getCenter(new THREE.Vector3());

  return (
    <group position={position}>
      <group scale={[s, s, s]}>
        <primitive object={cloned} position={[-center.x, -box.min.y, -center.z]} />
      </group>
    </group>
  );
}

/* ─── Hill background ─── */
function HillModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF('/models/hill.glb');
  const cloned = scene.clone(true);

  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(cloned);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = (12 * scale) / maxDim;
  const center = box.getCenter(new THREE.Vector3());

  return (
    <group position={position}>
      <group scale={[s, s, s]}>
        <primitive object={cloned} position={[-center.x, -box.min.y, -center.z]} />
      </group>
    </group>
  );
}

/* ─── Greek Kiosk ─── */
function KioskModel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF('/models/greek_kiosk.glb');
  const cloned = scene.clone(true);

  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(cloned);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const s = (2 * scale) / maxDim;
  const center = box.getCenter(new THREE.Vector3());

  return (
    <group position={position}>
      <group scale={[s, s, s]}>
        <primitive object={cloned} position={[-center.x, -box.min.y, -center.z]} />
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

      {/* GLB Pedestal */}
      <Suspense fallback={null}>
        <GLBPedestal position={[-4, 0.3, -3.5]} scale={1.2} />
      </Suspense>

      {/* Greek Kiosk — main environment piece */}
      <Suspense fallback={null}>
        <KioskModel position={[0, 0.3, -4]} scale={5} />
      </Suspense>

      {/* Hill background — left side */}
      <Suspense fallback={null}>
        <HillModel position={[-20, 0, -4]} scale={1.5} />
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
      <ambientLight intensity={0.5} color="hsl(45, 60%, 95%)" />
      <directionalLight
        ref={dirLight}
        position={[8, 12, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        color="hsl(40, 80%, 95%)"
      />
      <pointLight position={[0, 4, 0]} intensity={0.4} color="hsl(35, 70%, 80%)" distance={12} />
      <hemisphereLight args={['hsl(210, 40%, 70%)', 'hsl(30, 30%, 60%)', 0.3]} />
      <fog attach="fog" args={['hsl(40, 20%, 90%)', 15, 40]} />
    </>
  );
}
