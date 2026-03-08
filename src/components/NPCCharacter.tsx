import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NPCData } from '@/data/npcData';

interface NPCCharacterProps {
  npc: NPCData;
  isVisited: boolean;
  onInteract: (npc: NPCData) => void;
}

export function NPCCharacter({ npc, isVisited, onInteract }: NPCCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [bobTime, setBobTime] = useState(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    setBobTime(prev => prev + delta);
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(bobTime * 1.5) * 0.03;
    }
  });

  return (
    <group
      position={npc.position}
      rotation={[0, npc.rotation, 0]}
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onInteract(npc); }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Pedestal */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.3, 8]} />
        <meshStandardMaterial color="#c4b8a2" roughness={0.8} />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.1, 0.35, 0.05]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.25]} />
        <meshStandardMaterial color={npc.color} roughness={0.6} />
      </mesh>
      <mesh position={[0.1, 0.35, 0.05]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.25]} />
        <meshStandardMaterial color={npc.color} roughness={0.6} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.1, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.45, 8]} />
        <meshStandardMaterial color={npc.robeColor} roughness={0.5} />
      </mesh>
      <mesh position={[0.1, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.45, 8]} />
        <meshStandardMaterial color={npc.robeColor} roughness={0.5} />
      </mesh>

      {/* Robe / Body */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.3, 0.8, 8]} />
        <meshStandardMaterial color={npc.robeColor} roughness={0.5} />
      </mesh>

      {/* Upper body */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.22, 0.5, 8]} />
        <meshStandardMaterial color={npc.robeColor} roughness={0.5} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.32, 1.5, 0]} rotation={[0, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.55, 8]} />
        <meshStandardMaterial color={npc.robeColor} roughness={0.5} />
      </mesh>
      <mesh position={[0.32, 1.5, 0]} rotation={[0, 0, -0.3]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.55, 8]} />
        <meshStandardMaterial color={npc.robeColor} roughness={0.5} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.4, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={npc.color} roughness={0.5} />
      </mesh>
      <mesh position={[0.38, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={npc.color} roughness={0.5} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.12, 8]} />
        <meshStandardMaterial color={npc.color} roughness={0.5} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color={npc.color} roughness={0.5} />
      </mesh>

      {/* Hair / Beard hints */}
      <mesh position={[0, 2.28, -0.02]} castShadow>
        <sphereGeometry args={[0.16, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.0, 0.1]} castShadow>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} />
      </mesh>

      {/* Visited indicator */}
      {isVisited && (
        <mesh position={[0, 2.55, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#4CAF50" />
        </mesh>
      )}

      {/* Hover glow */}
      {hovered && (
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 2.2, 16]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.12} />
        </mesh>
      )}

      {/* Name label */}
      <Html position={[0, 2.7, 0]} center distanceFactor={8}>
        <div className="npc-label px-3 py-1.5 rounded-lg text-center pointer-events-none select-none whitespace-nowrap">
          <p className="font-cinzel text-sm font-bold text-gold">{npc.name}</p>
          {hovered && (
            <p className="text-xs text-parchment mt-0.5 font-cormorant">
              🖱️ Πάτησε για συνομιλία
            </p>
          )}
        </div>
      </Html>
    </group>
  );
}
