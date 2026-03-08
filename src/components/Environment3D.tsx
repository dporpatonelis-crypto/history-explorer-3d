import { useRef } from 'react';
import * as THREE from 'three';

export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#c4b39a" roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

function Column({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.8, 0.3, 0.8]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.7} />
      </mesh>
      {/* Shaft */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 3, 12]} />
        <meshStandardMaterial color="#ece3d4" roughness={0.6} />
      </mesh>
      {/* Capital */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <boxGeometry args={[0.7, 0.25, 0.7]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.6} />
      </mesh>
      {/* Scroll detail */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.25, 0.15, 12]} />
        <meshStandardMaterial color="#ece3d4" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Architrave({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[2] + to[2]) / 2;
  const length = Math.sqrt((to[0] - from[0]) ** 2 + (to[2] - from[2]) ** 2);
  const angle = Math.atan2(to[2] - from[2], to[0] - from[0]);

  return (
    <mesh position={[midX, 3.65, midZ]} rotation={[0, -angle, 0]} castShadow>
      <boxGeometry args={[length, 0.25, 0.6]} />
      <meshStandardMaterial color="#ddd2c0" roughness={0.7} />
    </mesh>
  );
}

export function Columns() {
  const leftColumns: [number, number, number][] = [
    [-6, 0, -1], [-6, 0, -4], [-6, 0, -7], [-6, 0, -10]
  ];
  const rightColumns: [number, number, number][] = [
    [6, 0, -1], [6, 0, -4], [6, 0, -7], [6, 0, -10]
  ];
  const backColumns: [number, number, number][] = [
    [-4, 0, -10], [-2, 0, -10], [0, 0, -10], [2, 0, -10], [4, 0, -10]
  ];

  return (
    <group>
      {[...leftColumns, ...rightColumns, ...backColumns].map((pos, i) => (
        <Column key={i} position={pos} />
      ))}
      {/* Architraves on sides */}
      {leftColumns.slice(0, -1).map((pos, i) => (
        <Architrave key={`l${i}`} from={pos} to={leftColumns[i + 1]} />
      ))}
      {rightColumns.slice(0, -1).map((pos, i) => (
        <Architrave key={`r${i}`} from={pos} to={rightColumns[i + 1]} />
      ))}
      {/* Back architrave segments */}
      {[leftColumns[3], ...backColumns, rightColumns[3]].slice(0, -1).map((pos, i, arr) => (
        <Architrave key={`b${i}`} from={pos} to={arr[i + 1]} />
      ))}
    </group>
  );
}

export function Pedestal({ position, label }: { position: [number, number, number]; label?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1, 0.4, 1]} />
        <meshStandardMaterial color="#d6cab4" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.85, 0.1, 0.85]} />
        <meshStandardMaterial color="#c4b8a2" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#fff5e6" />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.2}
        color="#fff0d4"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <pointLight position={[-4, 4, -5]} intensity={0.6} color="#ffcc80" distance={15} />
      <pointLight position={[4, 4, -5]} intensity={0.6} color="#ffcc80" distance={15} />
      <hemisphereLight args={["#87CEEB", "#c4b39a", 0.3]} />
    </>
  );
}

export function Sky() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
      </mesh>
      <fog attach="fog" args={["#d4c9b8", 15, 45]} />
    </>
  );
}
